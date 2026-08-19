# FTXT Social Publisher

Automatically publishes RSS feed items to **Facebook Page**, **Tumblr**, **X (Twitter)**, and **Threads** every 45 minutes.

## Platforms

| Platform | Method | Account |
|----------|--------|---------|
| Facebook Page | Graph API | P24 News (1269430689584238) |
| Tumblr | OAuth 1.0a | p24-news |
| X (Twitter) | Buffer API | palugcrlive |
| Threads | Buffer API | palugcr.live |

## Feed

Single RSS source: `https://palugcr.live/rss.xml`

## How it works

1. Fetches RSS feed
2. Checks `state.json` for already-posted articles
3. Posts new article to all 4 platforms (with image if available)
4. Updates state tracker

## Post format

**Facebook**: Description (250 chars) + hashtags + article URL  
**Tumblr**: Photo/Link/Text post with title, URL, tags  
**Buffer (X + Threads)**: Title + URL + hashtags

## Setup

```bash
npm install
npm run build
npm start
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `FB_PAGE_ID` | Facebook Page ID |
| `FB_ACCESS_TOKEN` | Facebook Page Access Token |
| `TUMBLR_CONSUMER_KEY` | Tumblr OAuth Consumer Key |
| `TUMBLR_CONSUMER_SECRET` | Tumblr OAuth Consumer Secret |
| `TUMBLR_ACCESS_TOKEN` | Tumblr OAuth Access Token |
| `TUMBLR_ACCESS_TOKEN_SECRET` | Tumblr OAuth Access Token Secret |
| `TUMBLR_BLOG_NAME` | Tumblr blog name |
| `BUFFER_ACCESS_TOKEN` | Buffer API Access Token |
| `RSS_FEED_URL` | RSS feed URL |

## Cron Job

Set up at [cron-job.org](https://cron-job.org) to POST to GitHub Actions:
- URL: `https://api.github.com/repos/gcl573670/ftxt/actions/workflows/publish.yml/dispatches`
- Method: POST
- Headers: `Authorization: token <GITHUB_TOKEN>`, `Accept: application/vnd.github.v3+json`
- Body: `{"event_type":"cron"}`

Or use the built-in GitHub Actions schedule (every 45 minutes).
