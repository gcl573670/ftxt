import { URLSearchParams } from 'url';
import { log } from './logger.js';
import type { Article } from './rss.js';

const FB_API = 'https://graph.facebook.com/v19.0';

export async function publishToFacebook(
  pageId: string,
  accessToken: string,
  article: Article
): Promise<boolean> {
  const msg = formatFbMessage(article);

  const endpoint = article.imageUrl
    ? `${FB_API}/${pageId}/photos`
    : `${FB_API}/${pageId}/feed`;

  const params: Record<string, string> = { message: msg, access_token: accessToken };
  if (article.imageUrl) params.url = article.imageUrl;

  log.info('Publishing to Facebook', { title: article.title.slice(0, 50) });

  try {
    const resp = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(params).toString(),
    });
    const data = await resp.json() as Record<string, unknown>;
    if (data.id) {
      log.info('Facebook OK', { id: data.id as string });
      return true;
    }
    log.error('Facebook error', data);
    return false;
  } catch (err) {
    log.error('Facebook failed', { error: err instanceof Error ? err.message : String(err) });
    return false;
  }
}

function formatFbMessage(a: Article): string {
  const desc = a.description
    ? a.description.length > 250
      ? a.description.slice(0, 247) + '...'
      : a.description
    : '';
  const hashtags = a.categories
    .map((c) => '#' + c.replace(/[^a-zA-Z0-9 ]/g, '').trim().split(/\s+/).map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(''))
    .join(' ');
  const parts = [desc, hashtags, a.link].filter(Boolean);
  return parts.join('\n\n');
}
