import { Button, PasswordInput, Stack, Text } from '@mantine/core';
import { useForm } from '@mantine/form';
import { useMutation } from '@tanstack/react-query';
import { api } from '../api/client';
import type { AdminToken } from '../api/types';
import { useAuth } from '../auth';
import { useI18n } from '../i18n';
import { useNotify } from '../components/ui';

export default function ChangePasswordForm({ onDone }: { onDone?: () => void }) {
  const { t } = useI18n();
  const { setSession } = useAuth();
  const notify = useNotify();
  const form = useForm({
    initialValues: { currentPassword: '', newPassword: '', repeat: '' },
    validate: { repeat: (v, all) => (v !== all.newPassword ? t('auth.mismatch') : null) },
  });
  const m = useMutation({
    mutationFn: (v: typeof form.values) => api.post<AdminToken>('/auth/change-password', { currentPassword: v.currentPassword, newPassword: v.newPassword }),
    onSuccess: (tok) => { setSession(tok); notify.ok(); onDone?.(); },
    onError: notify.error,
  });
  return (
    <form onSubmit={form.onSubmit((v) => m.mutate(v))}>
      <Stack>
        <PasswordInput label={t('auth.currentPassword')} autoComplete="current-password" required {...form.getInputProps('currentPassword')} />
        <PasswordInput label={t('auth.newPassword')} autoComplete="new-password" required {...form.getInputProps('newPassword')} />
        <PasswordInput label={t('auth.repeatPassword')} autoComplete="new-password" required {...form.getInputProps('repeat')} />
        <Text size="xs" c="dimmed">{t('auth.passwordRules')}</Text>
        <Button type="submit" loading={m.isPending}>{t('common.save')}</Button>
      </Stack>
    </form>
  );
}
