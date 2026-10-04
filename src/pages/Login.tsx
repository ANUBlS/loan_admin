import { useState } from 'react';
import { Alert, Button, Center, Paper, PasswordInput, SegmentedControl, Stack, Text, TextInput, Title } from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconInfoCircle } from '@tabler/icons-react';
import { ApiError } from '../api/client';
import { useAuth } from '../auth';
import { useI18n } from '../i18n';
import ChangePasswordForm from './ChangePassword';

export default function LoginPage({ forceChange = false }: { forceChange?: boolean }) {
  const { login, expired, logout } = useAuth();
  const { t, lang, setLang } = useI18n();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const form = useForm({ initialValues: { username: '', password: '' } });

  const submit = form.onSubmit(async (v) => {
    setBusy(true); setError(null);
    try {
      await login(v.username.trim(), v.password);
    } catch (e) {
      if (e instanceof ApiError) {
        const left = e.details?.attemptsLeft as number | undefined;
        setError(t(`err.${e.code}`) + (left !== undefined && left > 0 ? ` · ${t('auth.attemptsLeft', { n: left })}` : ''));
      } else setError(String(e));
    } finally { setBusy(false); }
  });

  return (
    <Center mih="100vh" p="md">
      <Paper withBorder shadow="sm" p="xl" w={380} maw="100%">
        <Stack>
          <Stack gap={4} align="center">
            <img src="/favicon.svg" width={44} height={44} alt="" />
            <Title order={3}>{t('app.title')}</Title>
          </Stack>
          <SegmentedControl size="xs" value={lang} onChange={(v) => setLang(v as 'az' | 'en')} data={[{ label: 'Azərbaycan', value: 'az' }, { label: 'English', value: 'en' }]} />
          {forceChange ? (
            <>
              <Alert icon={<IconInfoCircle size={18} />} color="blue">{t('auth.mustChange')}</Alert>
              <ChangePasswordForm />
              <Button variant="subtle" onClick={logout}>{t('auth.signOut')}</Button>
            </>
          ) : (
            <form onSubmit={submit}>
              <Stack>
                {expired && <Alert color="yellow">{t('auth.sessionExpired')}</Alert>}
                {error && <Alert color="red">{error}</Alert>}
                <TextInput label={t('auth.username')} autoComplete="username" autoFocus required {...form.getInputProps('username')} />
                <PasswordInput label={t('auth.password')} autoComplete="current-password" required {...form.getInputProps('password')} />
                <Button type="submit" loading={busy} fullWidth>{t('auth.signIn')}</Button>
              </Stack>
            </form>
          )}
          <Text size="xs" c="dimmed" ta="center">smartfinance.az</Text>
        </Stack>
      </Paper>
    </Center>
  );
}
