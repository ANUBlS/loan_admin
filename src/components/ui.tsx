import type { ReactNode } from 'react';
import { Badge, Center, Group, Loader, Pagination, Text, Title, Alert } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconAlertTriangle } from '@tabler/icons-react';
import dayjs from 'dayjs';
import { ApiError } from '../api/client';
import { useI18n } from '../i18n';
import type { ApplicationStatus, InstallmentStatus, LoanState, PaymentMethod, Role } from '../api/types';

export function fmtMoney(v: number | null | undefined, currency = 'AZN') {
  if (v === null || v === undefined) return '—';
  const s = v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).replace(/,/g, ' ');
  return `${s} ${currency === 'AZN' ? '₼' : currency}`;
}
export const fmtDate = (v: string | null | undefined) => (v ? dayjs(v).format('DD.MM.YYYY') : '—');
export const fmtDateTime = (v: string | null | undefined) => (v ? dayjs(v).format('DD.MM.YYYY HH:mm') : '—');
export const fmtSize = (b: number) => (b < 1024 * 1024 ? `${Math.max(1, Math.round(b / 1024))} KB` : `${(b / 1024 / 1024).toFixed(1)} MB`);
export const isoDate = (d: Date | string | null | undefined) => (d ? dayjs(d).format('YYYY-MM-DD') : undefined);

export function useNotify() {
  const { t } = useI18n();
  return {
    ok(message?: string) {
      notifications.show({ color: 'teal', message: message ?? t('common.saved') });
    },
    error(e: unknown) {
      let message = String(e);
      if (e instanceof ApiError) {
        const key = `err.${e.code}`;
        const translated = t(key);
        message = translated !== key ? translated : e.message;
        const rules = (e.details?.rules as string[] | undefined);
        if (e.code === 'password_weak' && rules) message += `: ${rules.join(', ')}`;
        const fields = e.details?.fields as { field: string; message: string }[] | undefined;
        if (fields?.length) message += ` (${fields.map((f) => `${f.field}: ${f.message}`).join('; ')})`;
      }
      notifications.show({ color: 'red', title: '⚠', message, autoClose: 7000 });
    },
  };
}

export function PageHeader({ title, actions, sub }: { title: ReactNode; actions?: ReactNode; sub?: ReactNode }) {
  return (
    <Group justify="space-between" align="flex-end" mb="md" wrap="wrap" gap="sm">
      <div>
        <Title order={2}>{title}</Title>
        {sub && <Text c="dimmed" size="sm" mt={2}>{sub}</Text>}
      </div>
      {actions && <Group gap="xs">{actions}</Group>}
    </Group>
  );
}

export function Loading() {
  return <Center py="xl"><Loader /></Center>;
}

export function ErrorBox({ error }: { error: unknown }) {
  const { t } = useI18n();
  const msg = error instanceof ApiError ? (t(`err.${error.code}`) !== `err.${error.code}` ? t(`err.${error.code}`) : error.message) : String(error);
  return <Alert color="red" icon={<IconAlertTriangle size={18} />}>{msg}</Alert>;
}

export function Pager({ total, limit, offset, onChange }: { total: number; limit: number; offset: number; onChange: (offset: number) => void }) {
  const { t } = useI18n();
  const pages = Math.max(1, Math.ceil(total / limit));
  return (
    <Group justify="space-between" mt="sm">
      <Text size="sm" c="dimmed">{t('common.total')}: {total}</Text>
      {pages > 1 && <Pagination size="sm" total={pages} value={Math.floor(offset / limit) + 1} onChange={(p) => onChange((p - 1) * limit)} />}
    </Group>
  );
}

const STATE_COLOR: Record<LoanState, string> = { overdue: 'red', active: 'blue', closed: 'gray' };
export function StateBadge({ state }: { state: LoanState }) {
  const { t } = useI18n();
  return <Badge color={STATE_COLOR[state]} variant="light">{t(`state.${state}`)}</Badge>;
}

const INST_COLOR: Record<InstallmentStatus, string> = { paid: 'teal', overdue: 'red', next: 'blue', upcoming: 'gray' };
export function InstBadge({ status }: { status: InstallmentStatus }) {
  const { t } = useI18n();
  return <Badge size="sm" color={INST_COLOR[status]} variant={status === 'upcoming' ? 'outline' : 'light'}>{t(`inst.status.${status}`)}</Badge>;
}

const APP_COLOR: Record<ApplicationStatus, string> = { submitted: 'yellow', approved: 'teal', rejected: 'red', cancelled: 'gray' };
export function AppBadge({ status }: { status: ApplicationStatus }) {
  const { t } = useI18n();
  return <Badge color={APP_COLOR[status]} variant="light">{t(`app.status.${status}`)}</Badge>;
}

const METHOD_COLOR: Record<PaymentMethod, string> = { app: 'violet', cash: 'green', bank_transfer: 'cyan', card: 'indigo' };
export function MethodBadge({ method }: { method: PaymentMethod }) {
  const { t } = useI18n();
  return <Badge size="sm" color={METHOD_COLOR[method]} variant="light">{t(`method.${method}`)}</Badge>;
}

const ROLE_COLOR: Record<Role, string> = { admin: 'red', operator: 'blue', viewer: 'gray' };
export function RoleBadge({ role }: { role: Role }) {
  const { t } = useI18n();
  return <Badge color={ROLE_COLOR[role]} variant="light">{t(`role.${role}`)}</Badge>;
}

export function ActiveBadge({ active }: { active: boolean }) {
  const { t } = useI18n();
  return <Badge color={active ? 'teal' : 'red'} variant="dot">{active ? t('common.active') : t('common.blocked')}</Badge>;
}

export function Empty() {
  const { t } = useI18n();
  return <Text c="dimmed" ta="center" py="lg">{t('common.empty')}</Text>;
}
