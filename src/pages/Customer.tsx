import { Alert, Button, Card, Grid, Group, Stack, Table, Text, Title } from '@mantine/core';
import { modals } from '@mantine/modals';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { IconArrowLeft, IconEdit, IconLock, IconLockOpen, IconPlus, IconRefresh } from '@tabler/icons-react';
import { api } from '../api/client';
import type { Customer, Loan, Page, Payment } from '../api/types';
import { useAuth } from '../auth';
import { useI18n } from '../i18n';
import { ActiveBadge, Empty, ErrorBox, Loading, MethodBadge, PageHeader, StateBadge, fmtDate, fmtDateTime, fmtMoney, useNotify } from '../components/ui';
import { CustomerForm, LoanCreateForm } from './forms';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (<div><Text size="xs" c="dimmed">{label}</Text><Text fw={500}>{children}</Text></div>);
}

export default function CustomerPage() {
  const { id } = useParams();
  const { t } = useI18n();
  const { can } = useAuth();
  const nav = useNavigate();
  const qc = useQueryClient();
  const notify = useNotify();

  const c = useQuery({ queryKey: ['customer', id], queryFn: () => api.get<Customer>(`/customers/${id}`) });
  const loans = useQuery({ queryKey: ['loans', 'customer', id], queryFn: () => api.get<Page<Loan>>('/loans', { userId: id, limit: 100 }) });
  const pays = useQuery({ queryKey: ['payments', 'customer', id], queryFn: () => api.get<Page<Payment>>('/payments', { userId: id, limit: 20 }) });

  const refresh = () => { qc.invalidateQueries({ queryKey: ['customer', id] }); qc.invalidateQueries({ queryKey: ['customers'] }); };
  const block = useMutation({
    mutationFn: (active: boolean) => api.post<Customer>(`/customers/${id}/${active ? 'unblock' : 'block'}`),
    onSuccess: () => { notify.ok(); refresh(); }, onError: notify.error,
  });
  const reset = useMutation({
    mutationFn: () => api.post<{ sessionsRevoked: number }>(`/customers/${id}/reset-access`),
    onSuccess: (r) => { notify.ok(t('cust.resetDone', { n: r.sessionsRevoked })); refresh(); }, onError: notify.error,
  });

  if (c.isLoading) return <Loading />;
  if (c.error) return <ErrorBox error={c.error} />;
  const cu = c.data!;

  const confirm = (title: string, body: string, color: string, onConfirm: () => void) => modals.openConfirmModal({
    title, children: <Text size="sm">{body}</Text>, labels: { confirm: t('common.confirm'), cancel: t('common.cancel') },
    confirmProps: { color }, onConfirm,
  });

  return (
    <>
      <Button variant="subtle" leftSection={<IconArrowLeft size={16} />} mb="xs" px={0} onClick={() => nav('/customers')}>{t('nav.customers')}</Button>
      <PageHeader title={cu.fullName} sub={<span className="mono">{cu.phone}</span>} actions={can('operator') && (
        <>
          <Button variant="default" leftSection={<IconEdit size={16} />} onClick={() => modals.open({ title: t('common.edit'), children: <CustomerForm customer={cu} onDone={() => { modals.closeAll(); refresh(); }} /> })}>{t('common.edit')}</Button>
          <Button variant="default" leftSection={<IconRefresh size={16} />} loading={reset.isPending} onClick={() => confirm(t('cust.resetAccess'), t('cust.resetAccessHelp'), 'blue', () => reset.mutate())}>{t('cust.resetAccess')}</Button>
          {cu.isActive
            ? <Button color="red" variant="light" leftSection={<IconLock size={16} />} onClick={() => confirm(t('cust.block'), t('cust.blockHelp'), 'red', () => block.mutate(false))}>{t('cust.block')}</Button>
            : <Button color="teal" variant="light" leftSection={<IconLockOpen size={16} />} onClick={() => block.mutate(true)}>{t('cust.unblock')}</Button>}
        </>
      )} />

      <Grid>
        <Grid.Col span={{ base: 12, md: 4 }}>
          <Card withBorder>
            <Stack gap="sm">
              <Field label={t('common.status')}><ActiveBadge active={cu.isActive} /></Field>
              <Field label={t('cust.language')}>{cu.language.toUpperCase()}</Field>
              <Field label={t('cust.loans')}>{cu.loansOpen} / {cu.loansTotal}</Field>
              <Field label={t('cust.outstanding')}>{fmtMoney(cu.outstandingPrincipal)}</Field>
              <Field label={t('cust.sessions')}>{cu.activeSessions}</Field>
              <Field label={t('cust.since')}>{fmtDate(cu.createdAt)}</Field>
            </Stack>
          </Card>
          {!cu.isActive && <Alert color="red" mt="md">{t('cust.blockHelp')}</Alert>}
        </Grid.Col>
        <Grid.Col span={{ base: 12, md: 8 }}>
          <Card withBorder>
            <Group justify="space-between" mb="sm">
              <Title order={5}>{t('nav.loans')}</Title>
              {can('operator') && cu.isActive && (
                <Button size="xs" leftSection={<IconPlus size={14} />} onClick={() => modals.open({ title: t('loan.new'), size: 'lg', children: <LoanCreateForm customer={cu} onDone={(l) => { modals.closeAll(); nav(`/loans/${l.id}`); }} /> })}>{t('loan.new')}</Button>
              )}
            </Group>
            {loans.isLoading ? <Loading /> : (
              <Table.ScrollContainer minWidth={560}>
                <Table highlightOnHover>
                  <Table.Thead><Table.Tr>
                    <Table.Th>{t('loan.contract')}</Table.Th><Table.Th>{t('loan.product')}</Table.Th>
                    <Table.Th className="num">{t('loan.amount')}</Table.Th><Table.Th className="num">{t('loan.outstanding')}</Table.Th><Table.Th>{t('loan.state')}</Table.Th>
                  </Table.Tr></Table.Thead>
                  <Table.Tbody>
                    {loans.data?.items.map((l) => (
                      <Table.Tr key={l.id} className="clickable-row" onClick={() => nav(`/loans/${l.id}`)}>
                        <Table.Td className="mono">{l.contractNo}</Table.Td><Table.Td>{t(l.productName)}</Table.Td>
                        <Table.Td className="num">{fmtMoney(l.amount, l.currency)}</Table.Td>
                        <Table.Td className="num">{fmtMoney(l.outstandingPrincipal, l.currency)}</Table.Td>
                        <Table.Td><StateBadge state={l.state} /></Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              </Table.ScrollContainer>
            )}
            {loans.data?.items.length === 0 && <Empty />}
          </Card>
          <Card withBorder mt="md">
            <Title order={5} mb="sm">{t('nav.payments')}</Title>
            <Table.ScrollContainer minWidth={560}>
              <Table>
                <Table.Thead><Table.Tr>
                  <Table.Th>{t('pay.paidAt')}</Table.Th><Table.Th>{t('loan.contract')}</Table.Th><Table.Th>{t('pay.installment')}</Table.Th>
                  <Table.Th className="num">{t('loan.amount')}</Table.Th><Table.Th>{t('pay.method')}</Table.Th>
                </Table.Tr></Table.Thead>
                <Table.Tbody>
                  {pays.data?.items.map((p) => (
                    <Table.Tr key={p.id} style={p.reversedAt ? { opacity: 0.5, textDecoration: 'line-through' } : undefined}>
                      <Table.Td>{fmtDateTime(p.paidAt)}</Table.Td><Table.Td className="mono">{p.contractNo}</Table.Td>
                      <Table.Td>{p.installmentNumber}</Table.Td><Table.Td className="num">{fmtMoney(p.amount, p.currency)}</Table.Td>
                      <Table.Td><MethodBadge method={p.method} /></Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Table.ScrollContainer>
            {pays.data?.items.length === 0 && <Empty />}
          </Card>
        </Grid.Col>
      </Grid>
    </>
  );
}
