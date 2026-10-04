import { useState } from 'react';
import { Button, Card, Group, SegmentedControl, Table, Text, TextInput } from '@mantine/core';
import { useDebouncedValue } from '@mantine/hooks';
import { modals } from '@mantine/modals';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { IconPlus, IconSearch } from '@tabler/icons-react';
import { api } from '../api/client';
import type { Loan, Page } from '../api/types';
import { useAuth } from '../auth';
import { useI18n } from '../i18n';
import { Empty, ErrorBox, Loading, PageHeader, Pager, StateBadge, fmtDate, fmtMoney } from '../components/ui';
import { LoanCreateForm } from './forms';

const LIMIT = 25;

export default function LoansPage() {
  const { t } = useI18n();
  const { can } = useAuth();
  const nav = useNavigate();
  const [params, setParams] = useSearchParams();
  const state = params.get('state') ?? '';
  const [q, setQ] = useState('');
  const [offset, setOffset] = useState(0);
  const [dq] = useDebouncedValue(q, 300);

  const query = useQuery({
    queryKey: ['loans', dq, state, offset],
    queryFn: () => api.get<Page<Loan>>('/loans', { q: dq, state, limit: LIMIT, offset }),
    placeholderData: keepPreviousData,
  });

  return (
    <>
      <PageHeader title={t('nav.loans')} actions={can('operator') && (
        <Button leftSection={<IconPlus size={16} />} onClick={() => modals.open({ title: t('loan.new'), size: 'lg', children: <LoanCreateForm onDone={(l) => { modals.closeAll(); nav(`/loans/${l.id}`); }} /> })}>{t('loan.new')}</Button>
      )} />
      <Card withBorder padding="sm">
        <Group mb="sm" wrap="wrap">
          <TextInput placeholder={t('loan.searchHint')} leftSection={<IconSearch size={16} />} value={q} onChange={(e) => { setQ(e.currentTarget.value); setOffset(0); }} w={280} maw="100%" />
          <SegmentedControl value={state} onChange={(v) => { setParams(v ? { state: v } : {}); setOffset(0); }}
            data={[{ label: t('common.all'), value: '' }, { label: t('state.open'), value: 'open' }, { label: t('state.overdue'), value: 'overdue' }, { label: t('state.active'), value: 'active' }, { label: t('state.closed'), value: 'closed' }]} />
        </Group>
        {query.isLoading ? <Loading /> : query.error ? <ErrorBox error={query.error} /> : (
          <>
            <Table.ScrollContainer minWidth={900}>
              <Table highlightOnHover verticalSpacing="xs">
                <Table.Thead><Table.Tr>
                  <Table.Th>{t('loan.contract')}</Table.Th><Table.Th>{t('loan.customer')}</Table.Th><Table.Th>{t('loan.product')}</Table.Th>
                  <Table.Th className="num">{t('loan.amount')}</Table.Th><Table.Th className="num">{t('loan.outstanding')}</Table.Th>
                  <Table.Th>{t('loan.paid')}</Table.Th><Table.Th>{t('loan.next')}</Table.Th><Table.Th>{t('loan.state')}</Table.Th>
                </Table.Tr></Table.Thead>
                <Table.Tbody>
                  {query.data!.items.map((l) => (
                    <Table.Tr key={l.id} className="clickable-row" onClick={() => nav(`/loans/${l.id}`)}>
                      <Table.Td className="mono">{l.contractNo}</Table.Td>
                      <Table.Td><Text size="sm" fw={500}>{l.userFullName}</Text><Text size="xs" c="dimmed" className="mono">{l.userPhone}</Text></Table.Td>
                      <Table.Td>{t(l.productName)}</Table.Td>
                      <Table.Td className="num">{fmtMoney(l.amount, l.currency)}</Table.Td>
                      <Table.Td className="num">{fmtMoney(l.outstandingPrincipal, l.currency)}</Table.Td>
                      <Table.Td>{t('loan.paidCount', { paid: l.paidCount, total: l.termMonths })}</Table.Td>
                      <Table.Td>{l.overdueCount > 0
                        ? <Text size="sm" c="red" fw={600}>{fmtMoney(l.overdueAmount, l.currency)}</Text>
                        : l.nextInstallment ? <Text size="sm">{fmtDate(l.nextInstallment.dueDate)}</Text> : '—'}</Table.Td>
                      <Table.Td><StateBadge state={l.state} /></Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Table.ScrollContainer>
            {query.data!.items.length === 0 && <Empty />}
            <Pager total={query.data!.total} limit={LIMIT} offset={offset} onChange={setOffset} />
          </>
        )}
      </Card>
    </>
  );
}
