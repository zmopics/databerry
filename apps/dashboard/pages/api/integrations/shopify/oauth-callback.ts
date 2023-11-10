import { NextApiResponse } from 'next';
import { createAuthApiHandler } from '@chaindesk/lib/createa-api-handler';
import { AppNextApiRequest } from '@chaindesk/lib/types/index';
import { ServiceProviderType } from '@chaindesk/prisma';
import { prisma } from '@chaindesk/prisma/client';
import axios from 'axios';
import url from 'url';
import hmacValidator from 'hmac-validator';

const handler = createAuthApiHandler();

export const auth = async (req: AppNextApiRequest, res: NextApiResponse) => {
  const session = req.session;

  const code = req.query.code as string;
  const hmac = req.query.hmac as string;
  const host = req.query.host as string;
  const shop = req.query.shop as string;

  var appId = process.env.NEXT_PUBLIC_SHOPIFY_APP_ID;
  var appSecret = process.env.NEXT_PUBLIC_SHOPIFY_APP_SECRET;

  var embedAppId = process.env.NEXT_PUBLIC_SHOPIFY_EMBED_APP_ID;
  var embedAppHandle = process.env.NEXT_PUBLIC_SHOPIFY_EMBED_APP_HANDLE;
  var templateId = process.env.NEXT_PUBLIC_SHOPIFY_APP_TEMPLATE_ID;

  const regex = /^[a-z\d_.-]+[.]myshopify[.]com$/;

  var validate = hmacValidator({
    replacements: {
      both: {
        '&': '%26',
        '%': '%25',
      },
      keys: {
        '=': '%3D',
      },
    },
    excludedKeys: ['signature', 'hmac'],
    algorithm: 'sha256',
    format: 'hex',
    digestKey: 'hmac',
  });

  if (code && hmac && host && shop) {
    let urlObj = req.url && url.parse(req.url);
    let query = urlObj && urlObj?.search?.slice(1);

    // Validate hmac signature & regex
    if (shop.match(regex) && validate(appSecret, null, query)) {
      // Exchange temporary code for a permanent access token
      let accessTokenRequestUrl =
        'https://' + shop + '/admin/oauth/access_token';

      await axios
        .post(accessTokenRequestUrl, {
          client_id: appId,
          client_secret: appSecret,
          code,
        })
        .then(async (response) => {
          let accessToken = response.data.access_token;

          // Check if service provider already exists
          const existingShopifyProvider = await prisma.serviceProvider.findMany(
            {
              where: {
                type: 'shopify',
                name: shop,
              },
            }
          );

          if (!existingShopifyProvider) {
            // If not create a new one
            await prisma.serviceProvider.create({
              data: {
                type: ServiceProviderType.shopify,
                name: shop,
                accessToken: accessToken,
                refreshToken: null,
                organization: {
                  connect: {
                    id: session?.organization?.id,
                  },
                },
              },
            });

            var activationUrl = `https://${shop}/admin/themes/current/editor?context=apps&template=${templateId}&activateAppId=${embedAppId}/${embedAppHandle}`;
            res.redirect(activationUrl);
            //  res.redirect('/close-window');
          } else {
            // Update existing one
            await prisma.serviceProvider.updateMany({
              where: {
                type: 'shopify',
                name: shop,
              },
              data: {
                type: ServiceProviderType.shopify,
                name: shop,
                accessToken: accessToken,
                refreshToken: null,
              },
            });

            var activationUrl = `https://${shop}/admin/themes/current/editor?context=apps&template=${templateId}&activateAppId=${embedAppId}/${embedAppHandle}`;
            res.redirect(activationUrl);
            // res.redirect('/close-window');
          }
        })
        .catch(() => {
          // TODO: Handle error
          res.redirect('/close-window');
        });
    }
  }
};

handler.get(auth);

export default handler;
