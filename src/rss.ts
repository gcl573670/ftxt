import { XMLParser } from 'fast-xml-parser';
import axios from 'axios';
import { log } from './logger.js';

export interface Article {
  title: string;
  link: string;
  guid: string;
  description: string;
  categories: string[];
  imageUrl?: string;
  pubDate?: string;
}

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '',
  textNodeName: '#text',
  trimValues: true,
  isArray: (name: string) => name === 'item' || name === 'category',
});

function txt(v: unknown): string {
  if (typeof v === 'string') return v.trim();
  if (v && typeof v === 'object') {
    const o = v as Record<string, unknown>;
    if (typeof o['#text'] === 'string') return o['#text'].trim();
    if (typeof o._ === 'string') return o._.trim();
  }
  return '';
}

function extractImage(item: Record<string, unknown>): string | undefined {
  const enc = item.enclosure;
  if (enc && typeof enc === 'object') {
    const u = (enc as Record<string, unknown>).url;
    if (typeof u === 'string') return u;
  }
  const mc = item['media:content'];
  if (mc && typeof mc === 'object') {
    const u = (mc as Record<string, unknown>).url;
    if (typeof u === 'string') return u;
  }
  return undefined;
}

export async function fetchArticles(feedUrl: string): Promise<Article[]> {
  log.info('Fetching RSS', { url: feedUrl });
  const resp = await axios.get(feedUrl, {
    timeout: 30000,
    headers: { 'User-Agent': 'FTXT-Publisher/1.0' },
    responseType: 'text',
  });

  const parsed = parser.parse(resp.data);
  const channel = parsed.rss?.channel ?? parsed.feed;
  if (!channel) throw new Error('Invalid RSS: no channel');

  const raw = channel.item ?? channel.items ?? [];
  const items = Array.isArray(raw) ? raw : [raw];

  return items
    .filter((i): i is Record<string, unknown> => typeof i === 'object' && i !== null)
    .map((item) => {
      const title = txt(item.title);
      const link = txt(item.link);
      const guid = txt(item.guid) || link;
      const description = txt(item.summary) || txt(item.description);
      const cats: string[] = [];
      const rawCat = item.category ?? item.categories;
      if (rawCat) {
        const arr = Array.isArray(rawCat) ? rawCat : [rawCat];
        for (const c of arr) {
          const t = txt(c);
          if (t) cats.push(t);
        }
      }
      return {
        title,
        link,
        guid,
        description,
        categories: [...new Set(cats)].slice(0, 5),
        imageUrl: extractImage(item),
        pubDate: txt(item.pubDate),
      };
    })
    .filter((a) => a.title && a.link);
}
