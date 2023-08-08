import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';
import HomeRoundedIcon from '@mui/icons-material/HomeRounded';
import Alert from '@mui/joy/Alert';
import Box from '@mui/joy/Box';
import Breadcrumbs from '@mui/joy/Breadcrumbs';
import Divider from '@mui/joy/Divider';
import Typography from '@mui/joy/Typography';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { GetServerSidePropsContext } from 'next/types';
import { useSession } from 'next-auth/react';
import { ReactElement } from 'react';
import * as React from 'react';
import useSWR from 'swr';

import ConversationList from '@app/components/ConversationList';
import Layout from '@app/components/Layout';
import useChat from '@app/hooks/useChat';
import useStateReducer from '@app/hooks/useStateReducer';
import { RouteNames } from '@app/types';
import { fetcher, postFetcher } from '@app/utils/swr-fetcher';
import { withAuth } from '@app/utils/withAuth';

export default function AgentPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [state, setState] = useStateReducer({});

  const {
    history,
    handleChatSubmit,
    isLoadingConversation,
    hasMoreMessages,
    handleLoadMoreMessages,
    setConversationId,
    conversationId,
  } = useChat({
    endpoint: router.query?.agentId
      ? `/api/agents/${router.query?.agentId}/query`
      : undefined,
  });

  //   React.useEffect(() => {
  //     if (typeof window !== 'undefined' && !router.query.tab) {
  //       handleChangeTab('chat');
  //     }
  //   }, [router.query.tab]);

  //   React.useEffect(() => {
  //     setConversationId(router.query.conversationId as string);
  //   }, [router.query.conversationId]);

  //   React.useEffect(() => {
  //     router.query.conversationId = conversationId;
  //     router.replace(router, undefined, { shallow: true });
  //   }, [conversationId]);

  return (
    <Box
      component="main"
      className="MainContent"
      sx={(theme) => ({
        px: {
          xs: 2,
          md: 6,
        },
        pt: {
          // xs: `calc(${theme.spacing(2)} + var(--Header-height))`,
          // sm: `calc(${theme.spacing(2)} + var(--Header-height))`,
          // md: 3,
        },
        pb: {
          xs: 2,
          sm: 2,
          md: 3,
        },
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        minWidth: 0,
        // height: '100dvh',
        width: '100%',
        ...(router.query.tab === 'chat'
          ? {
              height: '100%',
            }
          : {}),
        gap: 1,
      })}
    >
      <>
        {/* <Breadcrumbs
          size="sm"
          aria-label="breadcrumbs"
          separator={<ChevronRightRoundedIcon />}
          sx={{
            '--Breadcrumbs-gap': '1rem',
            '--Icon-fontSize': '16px',
            fontWeight: 'lg',
            color: 'neutral.400',
            px: 0,
          }}
        >
          <Link href={RouteNames.HOME}>
            <HomeRoundedIcon />
          </Link>
          <Link href={RouteNames.AGENTS}>
            <Typography
              fontSize="inherit"
              color="neutral"
              className="hover:underline"
            >
              Agents
            </Typography>
          </Link>
        </Breadcrumbs> */}

        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            mt: 1,
            mb: 2,
            gap: 1,
            flexWrap: 'wrap',
          }}
        >
          <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}>
            <Typography level="h1" fontSize="xl4">
              Chat
            </Typography>
          </Box>
        </Box>

        <Divider sx={{ mb: 4 }} />

        {/* <Stack
              direction="row"
              sx={{
                width: '100%',
                height: '100%',
                maxHeight: '100%',
                overflow: 'hidden',
              }}
              gap={1}
            >
              <Box
                sx={(theme) => ({
                  width: '100%',
                  height: '100%',
                  maxWidth: 200,
                  [theme.breakpoints.down('sm')]: {
                    display: 'none',
                  },
                })}
              >
                <ConversationList agentId={router.query?.agentId as string} />
              </Box>

              <ChatBox
                messages={history}
                onSubmit={handleChatSubmit}
                agentIconUrl={getAgentQuery?.data?.iconUrl!}
                isLoadingConversation={isLoadingConversation}
                disableWatermark
                hasMoreMessages={hasMoreMessages}
                handleLoadMoreMessages={handleLoadMoreMessages}
              />
            </Stack> */}
      </>
    </Box>
  );
}

AgentPage.getLayout = function getLayout(page: ReactElement) {
  return <Layout>{page}</Layout>;
};

export const getServerSideProps = withAuth(
  async (ctx: GetServerSidePropsContext) => {
    return {
      props: {},
    };
  }
);
