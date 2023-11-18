import React from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Input from '@mui/joy/Input';
import Stack from '@mui/joy/Stack';
import Typography from '@mui/joy/Typography';

type Props = {};

const Schema = z.object({
  domain: z.string(),
  email: z.string().email(),
  apiToken: z.string(),
});

function IntegrationSettings({}: Props) {
  const methods = useForm<z.infer<typeof Schema>>({
    resolver: zodResolver(Schema),
    defaultValues: {},
  });

  return (
    <form>
      <Stack spacing={2}>
        <Stack direction="row" sx={{ alignItems: 'center' }} spacing={1}>
          <Typography>https://</Typography>
          <Input
            placeholder="Zendesk Subdomain"
            {...methods.register('domain')}
          />
          <Typography>.zendesk.com</Typography>
        </Stack>

        <Input placeholder="email@company.com" {...methods.register('email')} />
        <Input placeholder="Api Token" {...methods.register('apiToken')} />
      </Stack>
    </form>
  );
}

export default IntegrationSettings;
