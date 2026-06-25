import { TavilySearch } from '@langchain/tavily';
import { CheerioWebBaseLoader } from '@langchain/community/document_loaders/web/cheerio';

const tavilyTool = new TavilySearch({
  maxResults: 5,
  apiKey: process.env.TAVILY_API_KEY,
});

export async function searchWeb(query) {
  const results = await tavilyTool.invoke(query);

  const urls = (Array.isArray(results) ? results : [])
    .map((r) => r.url)
    .filter(Boolean)
    .slice(0, 5);

  return urls;
}

export async function scrapeUrls(urls) {
  const MAX_CONTENT_LENGTH = 30000; // guard against context-window overflow
  let combined = '';

  for (const url of urls) {
    try {
      const loader = new CheerioWebBaseLoader(url, {
        selector: 'p, h1, h2, h3, article, section',
      });
      const docs = await loader.load();
      const text = docs.map((d) => d.pageContent).join('\n');
      combined += `\n\n--- Source: ${url} ---\n${text}`;

      if (combined.length >= MAX_CONTENT_LENGTH) break;
    } catch (err) {
      console.warn(`[ScrapeTools] Could not load ${url}:`, err.message);
    }
  }

  return combined.slice(0, MAX_CONTENT_LENGTH);
}
