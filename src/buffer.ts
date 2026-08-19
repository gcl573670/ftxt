import { log } from './logger.js';
import type { Article } from './rss.js';

const BUFFER_API = 'https://api.buffer.com';

interface Channel {
  id: string;
  name: string;
  service: string;
}

async function gql<T>(apiKey: string, query: string, variables?: Record<string, unknown>): Promise<T> {
  const resp = await fetch(BUFFER_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ query, variables }),
  });
  const json = await resp.json() as { data?: T; errors?: Array<{ message: string }> };
  if (json.errors?.length) {
    throw new Error(json.errors[0].message);
  }
  if (!json.data) throw new Error('No data in response');
  return json.data;
}

async function getChannels(apiKey: string): Promise<Channel[]> {
  const data = await gql<{ account: { organizations: Array<{ id: string }> } }>(
    apiKey,
    `query { account { organizations { id } } }`
  );
  const orgId = data.account?.organizations?.[0]?.id;
  if (!orgId) throw new Error('No organization found');

  const chData = await gql<{ channels: Array<{ id: string; name: string; service: string }> }>(
    apiKey,
    `query { channels(input: { organizationId: "${orgId}" }) { id name service } }`
  );
  return chData.channels ?? [];
}

export async function publishToBuffer(apiKey: string, article: Article): Promise<boolean> {
  log.info('Publishing to Buffer', { title: article.title.slice(0, 50) });

  let channels: Channel[];
  try {
    channels = await getChannels(apiKey);
  } catch (err) {
    log.error('Buffer auth/channels failed', { error: err instanceof Error ? err.message : String(err) });
    return false;
  }

  if (channels.length === 0) {
    log.warn('Buffer has no connected channels');
    return false;
  }

  log.info('Buffer channels found', { count: channels.length });

  const text = formatBufferText(article);
  let allOk = true;

  for (const ch of channels) {
    try {
      const input: Record<string, unknown> = {
        text,
        channelId: ch.id,
        schedulingType: 'automatic',
        mode: 'shareNow',
      };
      if (article.imageUrl) {
        input.assets = [{ image: { url: article.imageUrl } }];
      }

      const result = await gql<{
        createPost?: { post?: { id: string }; message?: string };
      }>(
        apiKey,
        `mutation ($input: CreatePostInput!) {
          createPost(input: $input) {
            ... on PostActionSuccess { post { id } }
            ... on MutationError { message }
          }
        }`,
        { input }
      );

      const action = result.createPost;
      if (action?.post?.id) {
        log.info('Buffer OK', { service: ch.service, name: ch.name, postId: action.post.id });
      } else {
        log.error('Buffer post error', { service: ch.service, response: JSON.stringify(result) });
        allOk = false;
      }
    } catch (err) {
      log.error('Buffer failed', { service: ch.service, error: err instanceof Error ? err.message : String(err) });
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
  return parts.join('\n');
}
