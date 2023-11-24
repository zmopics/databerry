import cuid from 'cuid';

import { DatasourceStatus, DatasourceType } from '@chaindesk/prisma';
import { prisma } from '@chaindesk/prisma/client';

import triggerTaskLoadDatasource from '../trigger-task-load-datasource';
import { AppDocument } from '../types/document';
import { DatasourceShopify } from '../types/models';

import { DatasourceLoaderBase } from './base';

export class ShopifyShopLoader extends DatasourceLoaderBase<DatasourceShopify> {
  isGroup = true;

  async getSize(text: string) {
    // return new Blob([text]).size;
    return 0;
  }

  async load() {
    async function getProducts() {
      // Get shop ID & access token from Prisma instead
      const store = await prisma.serviceProvider.findFirstOrThrow({
        where: { type: 'shopify' },
      });

      // Get all products
      const query = `{
      products(first: 250) {
          edges {
            node {
              handle
              id
            }
          }
        }
      }`;

      const URL = `https://${store?.name}/api/2021-07/graphql.json`;

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

    const response = await getProducts();

    const products = response.data.getProducts ? response.data.getProducts : [];

    const children = await prisma.appDatasource.findMany({
      where: {
        groupId: this.datasource?.id,
      },
      select: {
        id: true,
        config: true,
      },
    });

    const fileIds = products.map((f) => f.id);

    const ids = products.map((f) => {
      const found = children.find(
        (each) => (each as any)?.config?.objectId === f.id
      );

      if (found) {
        return found.id;
      }

      return cuid();
    });

    const childrenIdsToDelete =
      children
        ?.filter((each) => !fileIds?.includes((each as any)?.config?.objectId))
        ?.map((each) => each.id) || [];

    if (childrenIdsToDelete?.length > 0) {
      await prisma.appDatasource.deleteMany({
        where: {
          id: {
            in: childrenIdsToDelete,
          },
        },
      });
    }

    await prisma.appDatasource.createMany({
      data: products.map((each, idx) => ({
        id: ids[idx],
        type: DatasourceType.shopify_product,
        name: each?.name!,
        config: {
          productId: each?.id,
        },
        organizationId: this.datasource?.organizationId,
        datastoreId: this.datasource?.datastoreId,
        groupId: this.datasource?.id,
        serviceProviderId: this.datasource?.serviceProviderId,
      })),
      skipDuplicates: true,
    });

    await triggerTaskLoadDatasource(
      [...ids].map((id) => ({
        organizationId: this.datasource?.organizationId!,
        datasourceId: id,
        priority: 10,
      }))
    );

    await prisma.appDatasource.update({
      where: {
        id: this.datasource.id,
      },
      data: {
        status: DatasourceStatus.synched,
      },
    });

    return [] as AppDocument[];
  }
}
