import { ServiceProviderType } from '@prisma/client';
import axios from 'axios';
import { NextApiResponse } from 'next';

import { ApiError, ApiErrorType } from '@chaindesk/lib/api-error';
import {
  createApiHandler,
  createAuthApiHandler,
} from '@chaindesk/lib/createa-api-handler';
import { AppNextApiRequest } from '@chaindesk/lib/types';
import prisma from '@chaindesk/prisma/client';
import cuid from 'cuid';
import { scope } from '../lib/config';
import getHttpClient from '../lib/get-http-client';
import { MessageMetadataSchema } from '@chaindesk/lib/types/models';

const handler = createApiHandler();

export const webhook = async (req: AppNextApiRequest, res: NextApiResponse) => {
  try {
    const data = req.body;

    console.log('WEBHOOOK DATA ---------------->', data);

    const ticketId = data?.id as string;
    const chaindeskConversationId = data?.external_id as string;

    if (!ticketId || !chaindeskConversationId) {
      throw new ApiError(ApiErrorType.INVALID_REQUEST);
    }

    const conversation = await prisma.conversation.findUnique({
      where: {
        id: chaindeskConversationId,
      },
      include: {
        lead: true,
        messages: {
          take: 20,
          orderBy: {
            createdAt: 'desc',
          },
        },
        agent: {
          include: {
            serviceProviders: {
              where: {
                type: ServiceProviderType.zendesk,
              },
            },
          },
        },
      },
    });

    // const credentials = conversation?.agent?.serviceProviders?.[0];

    // if (!credentials) {
    //   throw new ApiError(ApiErrorType.INTEGRATION_CREDENTIALS_INVALID);
    // }

    // const client = getHttpClient(credentials.config as any);
    const client = getHttpClient({
      email: 'georges@chaindesk.ai',
      apiToken: 'XXX',
      domain: 'd3v-chaindesk',
    });

    const comments = (
      await client.get(
        `/api/v2/tickets/${ticketId}/comments?page[size]=1&sort=-created_at`
      )
    ).data?.comments;

    console.log('COMMENTS', JSON.stringify(comments, null, 2));

    const author = (
      await client.get(`/api/v2/users/${comments?.[0]?.author_id}`)
    ).data?.user;

    const isCustomer = author?.role === 'end-user';

    if (isCustomer) {
      // TODO
    } else {
      // TODO: check if message not already exists

      const commentId = comments?.[0]?.id;
      const found = conversation?.messages?.find(
        (one) =>
          (one.metadata as Partial<MessageMetadataSchema>)?.zendesk
            ?.commentId === commentId
      );

      if (!found) {
        await prisma.message.create({
          data: {
            conversationId: conversation?.id,
            from: 'human',
            text: comments?.[0]?.body,
            createdAt: new Date(comments?.[0]?.created_at),
            metadata: {
              displayName: author?.name,
              profilePicture: author?.photo?.content_url,
              zendesk: {
                commentId,
                from: {
                  role: author?.role,
                },
              },
            } as MessageMetadataSchema,
          },
        });
      }
    }

    // console.log('AUTHOR----------_>', author);

    // const isNewMsgForCustomer =
    //   comments?.[0]?.public &&
    //   comments?.[0]?.via?.source?.to?.address === conversation?.lead?.email;

    // console.log('comments?.[0]?.via?.source?.to?.address', comments?.[0]?.via);
    // console.log(conversation?.lead?.email, conversation?.lead?.email);

    // if (isNewMsgForCustomer) {
    //   console.log('CALLLED ------------------>');

    // }

    return res.json({ success: true });
  } catch (err) {
    console.log(req.body, err);
    return res.json({
      success: false,
      payload: req.body,
      error: JSON.stringify(err),
    });
  }
};

handler.post(webhook);

export default handler;

//  Author Customer Support Agent
//   {
//    user: {
//      id: 11328411367068,
//      url: 'https://d3v-chaindesk.zendesk.com/api/v2/users/11328411367068.json',
//      name: 'Georges P',
//      email: 'georges@chaindesk.ai',
//      created_at: '2023-11-16T11:27:22Z',
//      updated_at: '2023-12-04T14:42:59Z',
//      time_zone: 'Europe/Paris',
//      iana_time_zone: 'Europe/Paris',
//      phone: null,
//      shared_phone_number: null,
//      photo: null,
//      locale_id: 1,
//      locale: 'en-US',
//      organization_id: 11328411893148,
//      role: 'admin',
//      verified: true,
//      external_id: null,
//      tags: [],
//      alias: null,
//      active: true,
//      shared: false,
//      shared_agent: false,
//      last_login_at: '2023-12-04T14:42:59Z',
//      two_factor_auth_enabled: null,
//      signature: null,
//      details: null,
//      notes: null,
//      role_type: 4,
//      custom_role_id: 11328395325724,
//      moderator: true,
//      ticket_restriction: null,
//      only_private_comments: false,
//      restricted_agent: false,
//      suspended: false,
//      chat_only: false,
//      default_group_id: 11328395618588,
//      report_csv: true,
//      user_fields: {}
//    }
//  }

// Author Customer
// {
//      user: {
//        id: 11600344444956,
//        url: 'https://d3v-chaindesk.zendesk.com/api/v2/users/11600344444956.json',
//        name: 'Georges Petrov',
//        email: 'georgesm.petrov@gmail.com',
//        created_at: '2023-12-04T13:21:45Z',
//        updated_at: '2023-12-04T13:21:45Z',
//        time_zone: 'Europe/Paris',
//        iana_time_zone: 'Europe/Paris',
//        phone: null,
//        shared_phone_number: null,
//        photo: null,
//        locale_id: 1,
//        locale: 'en-US',
//        organization_id: null,
//        role: 'end-user',
//        verified: false,
//        external_id: null,
//        tags: [],
//        alias: null,
//        active: true,
//        shared: false,
//        shared_agent: false,
//        last_login_at: null,
//        two_factor_auth_enabled: false,
//        signature: null,
//        details: null,
//        notes: null,
//        role_type: null,
//        custom_role_id: null,
//        moderator: false,
//        ticket_restriction: 'requested',
//        only_private_comments: false,
//        restricted_agent: true,
//        suspended: false,
//        chat_only: false,
//        default_group_id: null,
//        report_csv: false,
//        user_fields: {}
//      }
//    }

// Comments
// [
//   {
//     "id": 11600374925084,
//     "type": "Comment",
//     "author_id": 11600344444956,
//     "body": "Hello\n\n\n**Georges Petrov**",
//     "html_body": "<div class=\"zd-comment zd-comment-pre-styled\" dir=\"auto\"><div dir=\"ltr\">Hello<div><br><div><div dir=\"ltr\"><div dir=\"ltr\"><div><div dir=\"ltr\"><font color=\"#444444\" size=\"1\"><b>Georges Petrov</b><br></font></div></div></div></div></div><br></div></div><br></div>",
//     "plain_body": "Hello \n     Georges Petrov",
//     "public": false,
//     "attachments": [],
//     "audit_id": 11600360377244,
//     "via": {
//       "channel": "email",
//       "source": {
//         "from": {
//           "address": "georgesm.petrov+testwebhook@gmail.com",
//           "name": "Georges Test",
//           "original_recipients": [
//             "georgesm.petrov@gmail.com",
//             "support+id24@d3v-chaindesk.zendesk.com"
//           ]
//         },
//         "to": {
//           "name": "Chaindesk",
//           "address": "support+id24@d3v-chaindesk.zendesk.com"
//         },
//         "rel": null
//       }
//     },
//     "created_at": "2023-12-04T13:21:45Z",
//     "metadata": {
//       "system": {
//         "message_id": "<CANhy+dD98c9z2S1eH+s38GxaT0ZdK11eTk0qpStt8mFHwudNNQ@mail.gmail.com>",
//         "email_id": "01HGTFVT6PMBXQA0DEY3EXDG5V",
//         "raw_email_identifier": "19173329/2e42e894-d320-46d0-a0fe-94320425ba11.eml",
//         "json_email_identifier": "19173329/2e42e894-d320-46d0-a0fe-94320425ba11.json",
//         "eml_redacted": false
//       },
//       "custom": {},
//       "flags": [
//         15,
//         2
//       ],
//       "flags_options": {
//         "2": {
//           "trusted": false
//         },
//         "15": {
//           "trusted": true
//         }
//       },
//       "trusted": false,
//       "suspension_type_id": null
//     }
//   },
//   {
//     "id": 11600327520284,
//     "type": "Comment",
//     "author_id": 11328411367068,
//     "body": "Yolo9",
//     "html_body": "<div class=\"zd-comment\" dir=\"auto\">Yolo9<br></div>",
//     "plain_body": "Yolo9",
//     "public": true,
//     "attachments": [],
//     "audit_id": 11600340338844,
//     "via": {
//       "channel": "web",
//       "source": {
//         "from": {},
//         "to": {
//           "name": "Georges Test",
//           "address": "georgesm.petrov+testwebhook@gmail.com"
//         },
//         "rel": null
//       }
//     },
//     "created_at": "2023-12-04T13:20:40Z",
//     "metadata": {
//       "system": {
//         "client": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
//         "ip_address": "93.31.14.149",
//         "location": "Paris, IDF, France",
//         "latitude": 48.8323,
//         "longitude": 2.4075
//       },
//       "custom": {}
//     }
//   }
// ]
