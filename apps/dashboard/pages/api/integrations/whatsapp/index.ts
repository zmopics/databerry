import { NextApiResponse } from 'next';

import { AppNextApiRequest } from '@chaindesk/lib/types';

export default async function handler(
  req: AppNextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'POST') {
    const { code } = req?.body;
    console.log('--------------------', code);
    // Exchange code for access token
    const tokenResponse = await fetch(
      `https://graph.facebook.com/v17.0/oauth/access_token?client_id=2606178422868746&client_secret=4f2c9cca092bbd6da8a1cb52b043b7a2&code=${code}&redirect_uri=https://localhost:3000/test
      `,
      {
        method: 'GET',
      }
    );
    const tokenData = await tokenResponse.json();
    console.log('-------------------------- token ', tokenData, 'fusc');
    if (tokenData.error) {
      return res.status(400).json({ error: tokenData.error });
    }

    // The access token is now in tokenData.access_token
    // Next, use the access token to get the WABA ID
    const wabaResponse = await fetch(
      `https://graph.facebook.com/v18.0/me?fields=id,name,whatsapp_business_accounts{ id,name }&access_token=${req.body.accessToken}`,
      {
        method: 'GET',
      }
    );
    const wabaData = await wabaResponse.json();

    console.log('----------------------------data', wabaData);
    if (wabaData.error) {
      return res.status(400).json({ error: wabaData.error });
    }

    // Assuming the first WhatsApp Business Account is the correct one
    const wabaId = wabaData.whatsapp_business_accounts?.data[0]?.id;

    if (!wabaId) {
      return res.status(404).json({ error: 'WABA ID not found' });
    }

    // Save the access token and WABA ID securely (e.g., in a database)
    // This is an example and should be adapted to your database or storage solution
    // ...

    // Send a response back to the client with the WABA ID and a confirmation message
    return res.status(200).json({
      message: 'Access token and WABA ID retrieved successfully',
      accessToken: tokenData.access_token, // Be cautious with this, typically you do not want to send this back to the client
      wabaId: wabaId,
    });
  } else {
    // Handle other HTTP methods or return an error if they're not allowed
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}

// `https://www.facebook.com/v18.0/dialog/oauth?client_id={appId}
// &redirect_uri=https://localhost:3000/
// &state={"{st=state123abc,ds=123456789}"}`
