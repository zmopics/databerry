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

export const CheckSyntaxSchema = z.object({
  errors: z
    .array(
      z.object({
        type: z.enum(['grammar', 'spelling']),
        erroredPart: z.string().describe('Partie du texte en erreur'),
        correction: z.string().describe('Partie du texte corrigée'),
        errorDescription: z.string().describe('Explication de l erreur'),
      })
    )
    .describe('Fautes identifiées'),
});

export type Schema = z.infer<typeof CheckSyntaxSchema>;

const checkSyntaxTool = {
  type: 'function',
  function: {
    name: 'check_syntax',
    description:
      'Identifier les fautes de syntaxe ou déviation du style d écriture.',
    parameters: zodToJsonSchema(CheckSyntaxSchema),
    parse: zodParseJSON(CheckSyntaxSchema),
    function: (data: z.infer<typeof CheckSyntaxSchema>) => data,
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
  const processed = [] as { url: string; errors: any[] }[];
  const errors = [] as { url: string; error: string }[];

  const usages = [] as CompletionUsage[];

  await pMap(
    // urls.pages,
    urls.pages.slice(0, 1),
    async (url) => {
      try {
        const { data } = await axios.get(url);

        const text = cleanTextForEmbeddings(await getTextFromHTML(data));

        // const nbTokens = text?.length / 4;
        // const nbTokens = countTokens({ text });

        // console.log('TEXT', text);
        const model = new ChatModel();

        const result = await model.call({
          model: ModelConfig[modelName].name,
          tools: [checkSyntaxTool],
          tool_choice: {
            type: 'function',
            function: {
              name: 'check_syntax',
            },
          },
          messages: [
            {
              role: 'system',
              content: `Tu es un assitant spécialisé dans la correction de textes.
              Identifie les fautes de syntaxe, de grammaire, d'orthographe ou de style d'écriture.
              `,
            },
            {
              role: 'user',
              content: `Trouver les fautes du text suivant: ${text}`,
            },
          ],
        });

        const output = zodParseJSON(CheckSyntaxSchema)(
          result?.completion?.choices?.[0]?.message?.tool_calls?.[0]?.function
            ?.arguments as string
        );

        processed.push({
          url,
          errors: output.errors,
        });

        usages.push(result?.usage!);
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
  console.log(
    'Cost: $',
    usages.reduce(
      (acc, curr) => acc + getUsageCost({ modelName, usage: curr }),
      0
    )
  );
  console.log(`Model used: ${ModelConfig[modelName].name}`);

  console.timeEnd(JOB_NAME);
})();
