import axios from 'axios';

import { AppDocument } from '@chaindesk/lib/types/document';
import { DatasourceSchema } from '@chaindesk/lib/types/models';

import { ApiError, ApiErrorType } from '../api-error';
import cleanTextForEmbeddings from '../clean-text-for-embeddings';

import { DatasourceLoaderBase } from './base';

export const getTextFromHTML = async (html: string, origin?: string) => {
  const { load } = await import('cheerio');

  const $ = load(html);
  $('head').remove();
  $('footer').remove();
  $('header').remove();
  $('nav').remove();
  $('script').remove();
  $('style').remove();
  $('link').remove();
  $('svg').remove();
  $('noscript').remove();
  // $('img').remove();
  // $('img').removeAttr(' srcSet style data-nimg');
  // $('img').each(function (_, el) {
  //   // const attributes = Object.keys(this.attribs);
  //   // console.log('ATTRIBUTES =-----------><', attributes);
  //   $(this).removeAttr('style alt').text();
  //   // attributes.forEach((attr) => {
  //   //   $(this).removeAttr(attr);
  //   // });
  // });

  const items = [] as string[];

  $('body *')
    .contents()
    .each((index, child: any) => {
      if (child.type === 'text') {
        // If it's a text node, add its text to the array
        const content = $(child).text().trim();
        if (content) {
          items.push($(child).text());
        }
      } else if (child?.name === 'img') {
        // console.log('IMAGE', child.attribs);
        // If it's an image node, add its src attribute to the array
        let srcProp = $(child).attr('src');

        console.log('ORIGIN -------------->', origin);
        if (srcProp) {
          srcProp = srcProp.replace(/^\/\//, 'https://');

          const src = srcProp?.startsWith('http')
            ? srcProp
            : `${origin?.replace(/\/$/, '') || ''}/${srcProp.replace(
                /^\//,
                ''
              )}`;

          items.push(`![${$(child).attr('alt') || 'image'}](${src})`);
        }
      }
    });

  // const text = $('body').text();
  const text = items.join(' ');
  console.log('TEXT-------_>', $('body').text());

  return text?.trim();
};

export const loadPageContent = async (url: string) => {
  try {
    const { data } = await axios(url, {
      headers: {
        'User-Agent': Date.now().toString(),
      },
    });

    const text = await getTextFromHTML(data, new URL(url).origin);

    if (!text) {
      throw new Error('Empty body');
    }

    return data as string;
  } catch (err) {
    console.log('Error: Trying Plawright fallback');

    const res = await axios.get(`${process.env.BROWSER_API}/text?url=${url}`);

    return res?.data?.result || '';
  }
};

type DatasourceWebPage = Extract<DatasourceSchema, { type: 'web_page' }>;

export class WebPageLoader extends DatasourceLoaderBase<DatasourceWebPage> {
  getSize = async () => {
    const url = this.datasource.config['source_url'];

    const res = await axios.head(url);

    return (res?.headers['content-length'] as number) || 0;
  };

  async load() {
    const url = this.datasource.config['source_url'];

    const content = await loadPageContent(url);

    const text = await getTextFromHTML(content, new URL(url).origin);

    if (!text) {
      throw new ApiError(ApiErrorType.EMPTY_DATASOURCE);
    }

    return [
      new AppDocument({
        pageContent: cleanTextForEmbeddings(text),
        metadata: {
          source_url: url,
          datastore_id: this.datasource.datastoreId!,
          datasource_id: this.datasource.id,
          datasource_name: this.datasource.name,
          datasource_type: this.datasource.type,
          custom_id: this.datasource?.config?.custom_id,
          tags: this.datasource?.config?.tags || [],
        },
      }),
    ];
  }
}
