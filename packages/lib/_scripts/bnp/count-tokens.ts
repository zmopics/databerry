import axios from 'axios';
import pMap from 'p-map';

import countTokens from '@chaindesk/lib/count-tokens';
import { getUrlsFromSitemap } from '@chaindesk/lib/find-domain-pages';
import { getTextFromHTML } from '@chaindesk/lib/loaders/web-page';

(async () => {
  const JOB_NAME = 'count-tokens';
  console.time(JOB_NAME);
  const sitemapURL = 'https://mabanque.bnpparibas/sitemap.xml';

  const sitemap = (await axios.get(sitemapURL)).data;

  const urls = getUrlsFromSitemap(sitemap);

  console.log(`${urls.pages.length} urls found`);

  let total = 0;
  const processed = [] as { url: string; nbTokens: number }[];
  const errors = [] as { url: string; error: string }[];

  await pMap(
    urls.pages,
    async (url) => {
      try {
        const { data } = await axios.get(url);

        const text = await getTextFromHTML(data);

        // const nbTokens = text?.length / 4;
        const nbTokens = countTokens({ text });

        total += nbTokens;

        processed.push({
          url,
          nbTokens,
        });
      } catch (err) {
        // console.log(err);
        errors.push({ url, error: JSON.stringify(err, null, 2) });
      }
    },
    {
      concurrency: 50,
    }
  );

  console.log(JSON.stringify(processed, null, 2));
  console.log(JSON.stringify(errors, null, 2));
  console.log(`Total processed pages: ${processed.length}`);
  console.log(`Total errored pages: ${errors.length}`);
  console.log(`Total Tokens: ${total}`);
  console.log(
    `Avg Tokens / page: ${
      processed.reduce((acc, curr) => acc + curr.nbTokens, 0) / processed.length
    }`
  );

  console.timeEnd(JOB_NAME);
})();
