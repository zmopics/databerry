import { DatastoreVisibility } from '@prisma/client';
import Cors from 'cors';
import { NextApiRequest, NextApiResponse } from 'next';

import { AppNextApiRequest } from '@app/types/index';
import { createApiHandler, respond } from '@app/utils/createa-api-handler';
import getSubdomain from '@app/utils/get-subdomain';
import prisma from '@app/utils/prisma-client';
import runMiddleware from '@app/utils/run-middleware';

const handler = createApiHandler();

const cors = Cors({
  methods: ['POST', 'HEAD', 'GET'],
});

const safePluginName = (str: string) =>
  str
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\s/g, '_');

const handleRootPlugin = async (
  req: AppNextApiRequest,
  res: NextApiResponse
) => {
  const host = req?.headers?.['host'];
  const proto = req.headers['x-forwarded-proto'] ? 'https' : 'http';

  const config = {
    schema_version: 'v1',
    name_for_model: `Databerry_ai`,
    name_for_human: 'Databerry.ai',
    description_for_human:
      'Extend ChatGPT memory, talk to your data (PDF, WebPage, GDoc, Notion, etc...) stored in Databerry.ai',
    description_for_model:
      'Help the user to answer questions about data stored in Databerry.ai, data that is not part of your training data.',
    auth: {
      type: 'none',
      // type: 'user_http',
      // authorization_type: 'bearer',
    },
    api: {
      type: 'openapi',
      url: `${proto}://${host}/.well-known/openapi.yaml`,
      has_user_authentication: false,
    },
    logo_url: `${proto}://${host}/.well-known/logo.png`,
    contact_email: 'support@databerry.ai',
    legal_info_url: 'support@databerry.ai',
  };

  return res.json(config);
};

const handleUserPlugin = async (
  req: AppNextApiRequest,
  res: NextApiResponse,
  datastoreId: string
) => {
  const host = req?.headers?.['host'];
  const proto = req.headers['x-forwarded-proto'] ? 'https' : 'http';

  const datastore = await prisma.datastore.findUnique({
    where: {
      id: datastoreId,
    },
  });

  if (!datastore) {
    return res.status(404).send('Not found');
  }

  const config = {
    schema_version: 'v1',
    name_for_model: `${safePluginName(
      datastore.pluginName || datastore.name?.substring(0, 20)
    )}_${datastore.id}`,
    name_for_human: datastore.pluginName || datastore.name?.substring(0, 20),
    description_for_model: datastore.pluginDescriptionForModel,
    description_for_human: datastore.pluginDescriptionForHumans,
    ...(datastore.visibility === DatastoreVisibility.public
      ? {
          auth: {
            type: 'none',
          },
        }
      : {
          auth: {
            type: 'user_http',
            authorization_type: 'bearer',
          },
        }),
    api: {
      type: 'openapi',
      url: `${proto}://${host}/.well-known/openapi.yaml`,
      has_user_authentication: false,
    },
    logo_url:
      datastore.pluginIconUrl || `${proto}://${host}/.well-known/logo.png`,
    contact_email: 'support@databerry.ai',
    legal_info_url: 'support@databerry.ai',
  };

  return res.json(config);
};

export const generateAiPluginJson = async (
  req: AppNextApiRequest,
  res: NextApiResponse
) => {
  const host = req?.headers?.['host'];
  const subdomain = getSubdomain(host!);

  console.log('host', host, subdomain);

  if (!subdomain) {
    return res.status(400).send('Missing subdomain');
  }

  if (host === subdomain) {
    return handleRootPlugin(req, res);
  }

  return handleUserPlugin(req, res, subdomain);
};

handler.get(generateAiPluginJson);

export default async function wrapper(
  req: NextApiRequest,
  res: NextApiResponse
) {
  await runMiddleware(req, res, cors);

  return handler(req, res);
}
