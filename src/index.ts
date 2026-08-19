import { loadConfig } from './config.js';
import { setLogLevel, log } from './logger.js';
import { fetchArticles, type Article } from './rss.js';
import { isPublished, markPublished } from './state.js';
import { publishToFacebook } from './facebook.js';
import { publishToTumblr } from './tumblr.js';
import { publishToBuffer } from './buffer.js';

function articleKey(a: Article): string {
  return a.guid || a.link;
}

async function publishArticle(article: Article, cfg: ReturnType<typeof loadConfig>): Promise<void> {
  const key = articleKey(article);
  log.info('Publishing', { title: article.title.slice(0, 60), key });

  const fbOk = cfg.fbPageId && cfg.fbAccessToken
    ? await publishToFacebook(cfg.fbPageId, cfg.fbAccessToken, article).catch((e) => {
        log.error('Facebook error', { error: e.message }); return false;
      })
    : (log.warn('Facebook not configured'), false);

  const tumblrOk = cfg.tumblrAccessToken && cfg.tumblrConsumerKey
    ? await publishToTumblr(article, {
        blogName: cfg.tumblrBlogName,
        consumerKey: cfg.tumblrConsumerKey,
        consumerSecret: cfg.tumblrConsumerSecret,
        accessToken: cfg.tumblrAccessToken,
        accessTokenSecret: cfg.tumblrAccessTokenSecret,
      }).catch((e) => {
        log.error('Tumblr error', { error: e.message }); return false;
      })
    : (log.warn('Tumblr not configured'), false);

  const bufferOk = cfg.bufferApiKey
    ? await publishToBuffer(cfg.bufferApiKey, article).catch((e) => {
        log.error('Buffer error', { error: e.message }); return false;
      })
    : (log.warn('Buffer not configured'), false);

  log.info('Publish result', {
    title: article.title.slice(0, 40),
    facebook: fbOk ? 'OK' : 'SKIP',
    tumblr: tumblrOk ? 'OK' : 'SKIP',
    buffer: bufferOk ? 'OK' : 'SKIP',
  });

  markPublished(key, {
    guid: article.guid,
    url: article.link,
    title: article.title,
    publishedAt: new Date().toISOString(),
  });
}

async function main(): Promise<void> {
  const cfg = loadConfig();
  setLogLevel('info');

  log.info('=== FTXT Social Publisher ===');
  log.info('Feed', { url: cfg.rssFeedUrl });

  const articles = await fetchArticles(cfg.rssFeedUrl);
  log.info('Articles found', { count: articles.length });

  const newArticles = articles.filter((a) => !isPublished(articleKey(a)));
  log.info('New articles', { count: newArticles.length });

  if (newArticles.length === 0) {
    log.info('Nothing new to publish');
    return;
  }

  const toPublish = newArticles.slice(0, cfg.maxPostsPerRun);
  for (const article of toPublish) {
    await publishArticle(article, cfg);
  }

  log.info('=== Done ===');
}

main().catch((err) => {
  log.error('Fatal error', { error: err.message ?? String(err) });
  process.exit(1);
});
