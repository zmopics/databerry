import { NextApiResponse } from 'next';
import { scope } from '../lib/config';
import {
  createAuthApiHandler,
  respond,
} from '@chaindesk/lib/createa-api-handler';
import { AppNextApiRequest } from '@chaindesk/lib/types';

const handler = createAuthApiHandler();

export const add = async (req: AppNextApiRequest, res: NextApiResponse) => {
  const url = `https://${
    process.env.ZENDESK_SUBDOMAIN
  }.zendesk.com/oauth/authorizations/new?${new URLSearchParams({
    response_type: 'code',
    redirect_uri: `${process.env.NEXT_PUBLIC_DASHBOARD_URL}/api/integrations/zendesk/callback`,
    client_id: process.env.ZENDESK_CLIENT_ID!,
    scope,
    state: (req.query.state as string) || '{}',
  }).toString()}`;

  return res.json({ url });
};

handler.get(respond(add));
export default handler;
