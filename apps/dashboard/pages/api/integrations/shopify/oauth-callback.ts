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

  var appId = process.env.NEXT_SHOPIFY_APP_ID;
  var appSecret = process.env.NEXT_SHOPIFY_APP_SECRET;

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

          await prisma.serviceProvider.create({
            data: {
              type: ServiceProviderType.shopify,
              name: null,
              accessToken: accessToken,
              refreshToken: null,
              organization: {
                connect: {
                  id: session?.organization?.id,
                },
              },
            },
          });

          res.redirect('/close-window');
        })
        .catch((error) => {
          console.log(error);
          res.redirect('/close-window');
        });
    }
  }
};

handler.get(auth);

export default handler;
