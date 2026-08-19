import { config as dotenvConfig } from 'dotenv';
import { resolve } from 'path';

const envPath = resolve(process.cwd(), '.env');
dotenvConfig({ path: envPath });

export interface Config {
  fbPageId: string;
  fbAccessToken: string;
  tumblrConsumerKey: string;
  tumblrConsumerSecret: string;
  tumblrAccessToken: string;
  tumblrAccessTokenSecret: string;
  tumblrBlogName: string;
  bufferApiKey: string;
  rssFeedUrl: string;
  maxPostsPerRun: number;
  descriptionMaxLength: number;
}

function env(name: string, fallback = ''): string {
  const v = process.env[name];
  return v && v.trim() ? v.trim() : fallback;
}

export function loadConfig(): Config {
  return {
    fbPageId: env('FB_PAGE_ID'),
    fbAccessToken: env('FB_ACCESS_TOKEN'),
    tumblrConsumerKey: env('TUMBLR_CONSUMER_KEY'),
    tumblrConsumerSecret: env('TUMBLR_CONSUMER_SECRET'),
    tumblrAccessToken: env('TUMBLR_ACCESS_TOKEN'),
    tumblrAccessTokenSecret: env('TUMBLR_ACCESS_TOKEN_SECRET'),
    tumblrBlogName: env('TUMBLR_BLOG_NAME', 'p24-news'),
    bufferApiKey: env('BUFFER_API_KEY'),
    rssFeedUrl: env('RSS_FEED_URL', 'https://palugcr.live/rss.xml'),
    maxPostsPerRun: parseInt(env('MAX_POSTS_PER_RUN', '1'), 10),
    descriptionMaxLength: parseInt(env('DESCRIPTION_MAX_LENGTH', '250'), 10),
  };
}
