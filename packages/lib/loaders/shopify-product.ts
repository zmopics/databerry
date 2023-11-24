import {
  AppDocument,
  BaseDocumentMetadataSchema,
} from '@chaindesk/lib/types/document';
import { DatasourceShopify } from '../types/models';
import { DatasourceLoaderBase } from './base';
import { prisma } from '@chaindesk/prisma/client';

export class ShopifyProductLoader extends DatasourceLoaderBase<DatasourceShopify> {
  async getSize(text: string) {
    // return new Blob([text]).size;
    return 0;
  }

  async load() {
    // Get shop ID & access token from Prisma instead
    const store = await prisma.serviceProvider.findFirstOrThrow({
      where: { type: 'shopify' },
    });

    async function getProductData(id: string) {
      const URL = `https://${store?.name}/api/2021-07/graphql.json`;

      const query = `
  {
    productByHandle(id: "${id}") {
      id
      variants(first: 25) {
        edges {
          node {
            id
            name
          }
        }
      }
    }
  }`;

      const options = {
        endpoint: URL,
        method: 'POST',
        headers: {
          'X-Shopify-Storefront-Access-Token': store?.accessToken!,
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query }),
      };

      try {
        const data = await fetch(URL, {
          ...options,
          headers: {
            ...options.headers,
          },
        }).then((response) => {
          return response.json();
        });

        return data;
      } catch (error) {
        throw new Error('Products not fetched');
      }
    }

    const response = await getProductData('id');

    const product = response.data.getProductData
      ? response.data.getProductData
      : [];

    let docs: AppDocument[] = [];

    return docs.map(
      (each) =>
        new AppDocument<BaseDocumentMetadataSchema>({
          ...each,
          metadata: {
            ...each.metadata,
            datastore_id: this.datasource.datastoreId!,
            datasource_id: this.datasource.id,
            datasource_name: this.datasource.name,
            datasource_type: this.datasource.type as 'shopify_product',
            custom_id: this.datasource?.config?.custom_id,
            tags: this.datasource?.config?.tags || [],
          },
        })
    );
  }
}
