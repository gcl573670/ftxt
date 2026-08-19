import crypto from 'crypto';
import { URLSearchParams } from 'url';
import { log } from './logger.js';
import type { Article } from './rss.js';

const TUMBLR_API = 'https://api.tumblr.com/v2';

function percentEncode(s: string): string {
  return encodeURIComponent(s)
    .replace(/!/g, '%21').replace(/'/g, '%27')
    .replace(/\(/g, '%28').replace(/\)/g, '%29')
    .replace(/\*/g, '%2A');
}

function nonce(): string { return crypto.randomBytes(16).toString('hex'); }
function timestamp(): string { return Math.floor(Date.now() / 1000).toString(); }

function sign(
  method: string,
  url: string,
  params: Record<string, string>,
  cSecret: string,
  tSecret: string
): string {
  const sorted = Object.keys(params).sort();
  const qs = sorted.map((k) => `${percentEncode(k)}=${percentEncode(params[k] ?? '')}`).join('&');
  const base = `${method.toUpperCase()}&${percentEncode(url)}&${percentEncode(qs)}`;
  const key = `${percentEncode(cSecret)}&${percentEncode(tSecret)}`;
  return crypto.createHmac('sha1', key).update(base).digest('base64');
}

function authHeader(
  method: string,
  url: string,
  oauthP: Record<string, string>,
  bodyP: Record<string, string>,
  cSecret: string,
  tSecret: string
): string {
  const all = { ...oauthP, ...bodyP };
  const sig = sign(method, url, all, cSecret, tSecret);
  const parts: Record<string, string> = { ...oauthP, oauth_signature: sig };
  const hdr = Object.keys(parts).sort()
    .map((k) => `${percentEncode(k)}="${percentEncode(parts[k] ?? '')}"`).join(', ');
  return `OAuth ${hdr}`;
}

function tumblrPost(
  endpoint: string,
  body: Record<string, string>,
  cfg: {
    consumerKey: string;
    consumerSecret: string;
    accessToken: string;
    accessTokenSecret: string;
  }
): Promise<{ status: number; msg: string; id?: string }> {
  const url = `${TUMBLR_API}${endpoint}`;
  const oauthP: Record<string, string> = {
    oauth_consumer_key: cfg.consumerKey,
    oauth_nonce: nonce(),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: timestamp(),
    oauth_token: cfg.accessToken,
    oauth_version: '1.0',
  };
  const hdr = authHeader('POST', url, oauthP, body, cfg.consumerSecret, cfg.accessTokenSecret);

  return fetch(url, {
    method: 'POST',
    headers: {
      Authorization: hdr,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams(body).toString(),
  })
    .then((r) => r.json() as Promise<{ meta: { status: number; msg: string }; response?: { id?: string } }>)
    .then((data) => ({
      status: data.meta?.status ?? 500,
      msg: data.meta?.msg ?? 'unknown',
      id: data.response?.id,
    }));
}

function formatBody(a: Article): string {
  const tags = a.categories.slice(0, 30).join(',');
  return JSON.stringify({ title: a.title, url: a.link, tags });
}

function trimDesc(desc: string, max = 250): string {
  if (!desc) return '';
  return desc.length > max ? desc.slice(0, max - 3) + '...' : desc;
}

export async function publishToTumblr(
  article: Article,
  cfg: {
    blogName: string;
    consumerKey: string;
    consumerSecret: string;
    accessToken: string;
    accessTokenSecret: string;
  }
): Promise<boolean> {
  log.info('Publishing to Tumblr', { title: article.title.slice(0, 50) });

  // Try photo post first
  if (article.imageUrl) {
    const body: Record<string, string> = {
      type: 'photo',
      source: article.imageUrl,
      caption: `${article.title}\n\n${trimDesc(article.description)}\n\n<a href="${article.link}">${article.link}</a>`,
      tags: article.categories.slice(0, 30).join(','),
      state: 'published',
    };
    try {
      const res = await tumblrPost(`/blog/${cfg.blogName}/post`, body, cfg);
      if (res.status < 400 && res.id) {
        log.info('Tumblr photo OK', { id: res.id });
        return true;
      }
      log.warn('Tumblr photo failed, trying link', { msg: res.msg });
    } catch {
      log.warn('Tumblr photo error, trying link');
    }
  }

  // Link post
  {
    const body: Record<string, string> = {
      type: 'link',
      title: article.title,
      url: article.link,
      description: `${article.title}\n\n${trimDesc(article.description)}`,
      tags: article.categories.slice(0, 30).join(','),
    };
    try {
      const res = await tumblrPost(`/blog/${cfg.blogName}/post`, body, cfg);
      if (res.status < 400 && res.id) {
        log.info('Tumblr link OK', { id: res.id });
        return true;
      }
      log.warn('Tumblr link failed, trying text', { msg: res.msg });
    } catch {
      log.warn('Tumblr link error, trying text');
    }
  }

  // Text post fallback
  {
    const body: Record<string, string> = {
      type: 'text',
      title: article.title,
      body: `${article.title}\n\n${trimDesc(article.description)}\n\n<a href="${article.link}">${article.link}</a>`,
      tags: article.categories.slice(0, 30).join(','),
    };
    try {
      const res = await tumblrPost(`/blog/${cfg.blogName}/post`, body, cfg);
      if (res.status < 400 && res.id) {
        log.info('Tumblr text OK', { id: res.id });
        return true;
      }
      log.error('Tumblr text also failed', { msg: res.msg });
      return false;
    } catch (err) {
      log.error('Tumblr text error', { error: err instanceof Error ? err.message : String(err) });
      return false;
    }
  }
}
