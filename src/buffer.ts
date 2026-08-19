import { log } from './logger.js';
import type { Article } from './rss.js';

const BUFFER_API = 'https://api.bufferapp.com/1';

interface BufferProfile {
  id: string;
  service: string;
  service_username: string;
}

export async function publishToBuffer(
  accessToken: string,
  article: Article
): Promise<boolean> {
  log.info('Publishing to Buffer', { title: article.title.slice(0, 50) });

  // Fetch connected profiles
  const profilesResp = await fetch(`${BUFFER_API}/profiles.json?access_token=${accessToken}`);
  if (!profilesResp.ok) {
    log.error('Buffer profiles fetch failed', { status: profilesResp.status });
    return false;
  }
  const profiles = (await profilesResp.json()) as BufferProfile[];
  log.info('Buffer profiles found', { count: profiles.length });

  let allOk = true;
  for (const profile of profiles) {
    const text = formatBufferText(article);
    const body = new URLSearchParams({
      access_token: accessToken,
      profile_ids: profile.id,
      text,
      ...(article.imageUrl ? { media: { photo: article.imageUrl } as unknown as string } : {}),
    } as Record<string, string>);

    if (article.imageUrl) {
      body.set('media[photo]', article.imageUrl);
    }

    try {
      const resp = await fetch(`${BUFFER_API}/updates/create.json`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
      });
      const data = await resp.json() as { success?: boolean; updates?: Array<{ id: string }> };
      if (data.success) {
        log.info('Buffer OK', { service: profile.service, username: profile.service_username });
      } else {
        log.error('Buffer error', { service: profile.service, data });
        allOk = false;
      }
    } catch (err) {
      log.error('Buffer failed', { service: profile.service, error: err instanceof Error ? err.message : String(err) });
      allOk = false;
    }
  }

  return allOk;
}

function formatBufferText(a: Article): string {
  const hashtags = a.categories
    .map((c) => '#' + c.replace(/[^a-zA-Z0-9 ]/g, '').trim().split(/\s+/).map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(''))
    .join(' ');
  const parts = [a.title, a.link];
  if (hashtags) parts.push(hashtags);
  return parts.join('\n\n');
}
