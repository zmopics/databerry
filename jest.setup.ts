import prisma from '@app/utils/prisma-client';

beforeAll(async () => {
  await prisma.user.upsert({
    where: {
      id: process.env.TEST_USER_ID,
    },
    create: {
      id: process.env.TEST_USER_ID,
      email: 'jest@chaindesk.ai',
      usage: {
        create: {},
      },
      apiKeys: {
        create: {
          key: process.env.TEST_USER_API_KEY!,
          id: `id_${process.env.TEST_USER_API_KEY_ID}`!,
        },
      },
      datastores: {
        create: {
          id: process.env.TEST_DATASTORE_ID,
          name: 'Private Datastore',
          type: 'qdrant',
          description: 'This is a private datastore',
          visibility: 'private',
        },
      },
    },
    update: {},
  });
});

afterAll(async () => {
  // await prisma.user.delete({
  //   where: {
  //     id: process.env.TEST_USER_ID,
  //   },
  // });
});
