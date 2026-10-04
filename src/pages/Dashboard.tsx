import { Card, Group, SimpleGrid, Text, ThemeIcon, Title, Button } from '@mantine/core';
import { BarChart } from '@mantine/charts';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { IconAlertTriangle, IconCash, IconFileDescription, IconReceipt, IconUsers, IconCircleCheck, IconCoins, IconCalendar } from '@tabler/icons-react';
import dayjs from 'dayjs';
import { api } from '../api/client';
import type { Dashboard } from '../api/types';
import { useI18n } from '../i18n';
import { ErrorBox, Loading, PageHeader, fmtMoney } from '../components/ui';

function Stat({ label, value, sub, icon: Icon, color, onClick }: { label: string; value: string | number; sub?: string; icon: typeof IconCash; color: string; onClick?: () => void }) {
  return (
    <Card withBorder padding="md" onClick={onClick} style={onClick ? { cursor: 'pointer' } : undefined}>
      <Group justify="space-between" align="flex-start" wrap="nowrap">
        <div>
          <Text size="xs" c="dimmed" tt="uppercase" fw={600}>{label}</Text>
          <Text fw={700} size="xl" mt={4} style={{ fontVariantNumeric: 'tabular-nums' }}>{value}</Text>
          {sub && <Text size="xs" c="dimmed" mt={2}>{sub}</Text>}
        </div>
        <ThemeIcon variant="light" color={color} size="lg" radius="md"><Icon size={20} /></ThemeIcon>
      </Group>
    </Card>
  );
}

export default function DashboardPage() {
  const { t } = useI18n();
  const nav = useNavigate();
  const q = useQuery({ queryKey: ['dashboard'], queryFn: () => api.get<Dashboard>('/dashboard'), refetchInterval: 60_000 });
  if (q.isLoading) return <Loading />;
  if (q.error) return <ErrorBox error={q.error} />;
  const d = q.data!;
  const cur = d.currency;
  const chart = d.collectionsByMonth.map((m) => ({ month: dayjs(m.month + '-01').format('MMM YY'), amount: m.amount, count: m.count }));

  return (
    <>
      <PageHeader title={t('nav.dashboard')} actions={<Button variant="default" size="xs" onClick={() => q.refetch()}>{t('common.refresh')}</Button>} />
      <SimpleGrid cols={{ base: 1, xs: 2, md: 4 }} spacing="md">
        <Stat label={t('dash.customers')} value={d.customersTotal} sub={t('dash.blocked', { n: d.customersBlocked })} icon={IconUsers} color="blue" onClick={() => nav('/customers')} />
        <Stat label={t('dash.openLoans')} value={d.loansOpen} sub={`${t('dash.closedLoans')}: ${d.loansClosed}`} icon={IconCash} color="indigo" onClick={() => nav('/loans?state=open')} />
        <Stat label={t('dash.overdueLoans')} value={d.loansOverdue} sub={fmtMoney(d.overdueAmount, cur)} icon={IconAlertTriangle} color="red" onClick={() => nav('/loans?state=overdue')} />
        <Stat label={t('dash.pending')} value={d.applicationsPending} icon={IconFileDescription} color="yellow" onClick={() => nav('/applications')} />
        <Stat label={t('dash.outstanding')} value={fmtMoney(d.outstandingPrincipal, cur)} icon={IconCoins} color="grape" />
        <Stat label={t('dash.today')} value={fmtMoney(d.paymentsTodayAmount, cur)} sub={t('dash.payments', { n: d.paymentsTodayCount })} icon={IconReceipt} color="teal" onClick={() => nav('/payments')} />
        <Stat label={t('dash.month')} value={fmtMoney(d.paymentsMonthAmount, cur)} icon={IconCalendar} color="cyan" />
        <Stat label={t('dash.closedLoans')} value={d.loansClosed} icon={IconCircleCheck} color="gray" onClick={() => nav('/loans?state=closed')} />
      </SimpleGrid>
      <Card withBorder mt="md" padding="md">
        <Title order={5} mb="md">{t('dash.collections')}</Title>
        <BarChart h={260} data={chart} dataKey="month" series={[{ name: 'amount', label: cur, color: 'blue.6' }]}
          valueFormatter={(v) => fmtMoney(v, cur)} tickLine="y" gridAxis="y"
          yAxisProps={{ width: 56, tickFormatter: (v: number) => (v >= 1000 ? `${(v / 1000).toLocaleString('en-US', { maximumFractionDigits: 1 })}k` : String(v)) }} />
      </Card>
    </>
  );
}
