import { AgentModelName } from '@prisma/client';
import axios from 'axios';
import { RunnableToolFunction } from 'openai/lib/RunnableFunction';
import { ChatCompletionTool, CompletionUsage } from 'openai/resources';
import pMap from 'p-map';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

import ChatModel from '@chaindesk/lib/chat-model';
import cleanTextForEmbeddings from '@chaindesk/lib/clean-text-for-embeddings';
import { ModelConfig } from '@chaindesk/lib/config';
import countTokens from '@chaindesk/lib/count-tokens';
import { getUrlsFromSitemap } from '@chaindesk/lib/find-domain-pages';
import getUsageCost from '@chaindesk/lib/get-usage-cost';
import { getMainDOM, getTextFromHTML } from '@chaindesk/lib/loaders/web-page';
import zodParseJSON from '@chaindesk/lib/zod-parse-json';

export const ExtractLinks = z.object({
  links: z
    .array(
      z.object({
        url: z.string(),
        thematic: z
          .string()
          .describe('Theme abordé dans le paragraph qui contient le lien'),
      })
    )
    .describe('Les liens extraits'),
});

export type Schema = z.infer<typeof ExtractLinks>;

const extractLinksTool = {
  type: 'function',
  function: {
    name: 'extract_links',
    description:
      'Identifier et extraire les liens du texte avec le thème abordé dans le paragraphe qui contient le lien.',
    parameters: zodToJsonSchema(ExtractLinks),
    parse: zodParseJSON(ExtractLinks),
    function: (data: z.infer<typeof ExtractLinks>) => data,
  },
} as ChatCompletionTool;

export const CheckContentRelevance = z.object({
  isRelevant: z
    .boolean()
    .describe(
      'Le contenu de la page est-il pertinent par rapport au theme abordé?'
    ),
  error: z
    .string()
    .describe(
      'Theme abordé si different de celui du paragraphe qui contient le lien'
    ),
});

export type CheckContentRelevance = z.infer<typeof CheckContentRelevance>;

const CheckContentRelevanceTool = {
  type: 'function',
  function: {
    name: 'check_relevance',
    description:
      'Identifier si le contenu de la page est pertinent par rapport au theme abordé.',
    parameters: zodToJsonSchema(CheckContentRelevance),
    parse: zodParseJSON(CheckContentRelevance),
    function: (data: z.infer<typeof CheckContentRelevance>) => data,
  },
} as ChatCompletionTool;

(async () => {
  const JOB_NAME = 'syntax-check';
  const modelName = AgentModelName.gpt_4_turbo;
  console.time(JOB_NAME);
  const sitemapURL = 'https://mabanque.bnpparibas/sitemap.xml';

  const sitemap = (await axios.get(sitemapURL)).data;

  const urls = getUrlsFromSitemap(sitemap);

  let total = 0;
  const processed = [] as { url: string; links: any[] }[];
  const errors = [] as { url: string; error: string }[];
  const usages = [] as CompletionUsage[];

  await pMap(
    // urls.pages,
    urls.pages.slice(0, 1),
    async (url) => {
      try {
        const { data } = await axios.get(url);

        const text = cleanTextForEmbeddings(await getMainDOM(data));
        // const nbTokens = text?.length / 4;
        // const nbTokens = countTokens({ text });

        // console.log('TEXT', text);
        const model = new ChatModel();

        const result = await model.call({
          model: ModelConfig[modelName].name,
          tools: [extractLinksTool],
          tool_choice: {
            type: 'function',
            function: {
              name: extractLinksTool.function.name,
            },
          },
          messages: [
            {
              role: 'system',
              content: `Tu dois Identifier et extraire les liens d'un text fourni par l'utilisateur avec le thème abordé dans le paragraphe qui contient le lien.`,
            },
            {
              role: 'user',
              content: `Text: ${text}`,
            },
          ],
        });

        const output = zodParseJSON(ExtractLinks)(
          result?.completion?.choices?.[0]?.message?.tool_calls?.[0]?.function
            ?.arguments as string
        );

        usages.push(result?.usage!);

        // processed.push({
        //   url,
        //   links: output.links,
        // });
        const processedLinks = [] as any[];

        await pMap(output.links, async (link, index) => {
          let text = '';

          try {
            const { data } = await axios.get(link.url);

            text = cleanTextForEmbeddings(await getTextFromHTML(data));

            console.log('text', link);

            const result = await model.call({
              model: ModelConfig[modelName].name,
              tools: [CheckContentRelevanceTool],
              tool_choice: {
                type: 'function',
                function: {
                  name: CheckContentRelevanceTool.function.name,
                },
              },
              messages: [
                {
                  role: 'system',
                  content: `Tu dois identifier si le contenu du text fourni par l'utilsateur est pertinent par rapport au theme également fourni`,
                },
                {
                  role: 'user',
                  content: `
                  Theme Abordé: ${link.thematic}

                  Texte: ### ${text} ###`,
                },
              ],
            });

            const output = zodParseJSON(CheckContentRelevance)(
              result?.completion?.choices?.[0]?.message?.tool_calls?.[0]
                ?.function?.arguments as string
            );

            processedLinks.push({
              ...link,
              output,
            });

            usages.push(result?.usage!);
          } catch (err) {
            return errors.push({ url, error: JSON.stringify(err, null, 2) });
          }
        });

        processed.push({
          url,
          links: processedLinks,
        });
      } catch (err) {
        console.log(err);
        errors.push({ url, error: JSON.stringify(err, null, 2) });
      }
    },
    {
      concurrency: 4,
    }
  );

  console.log(JSON.stringify(processed, null, 2));
  console.log(JSON.stringify(errors, null, 2));
  console.log(`Model used: ${ModelConfig[modelName].name}`);
  console.log(
    'Cost: $',
    usages.reduce(
      (acc, curr) => acc + getUsageCost({ modelName, usage: curr }),
      0
    )
  );

  console.timeEnd(JOB_NAME);
})();
