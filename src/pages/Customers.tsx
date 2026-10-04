import { useState } from 'react';
import { Button, Card, Group, SegmentedControl, Table, TextInput, Text } from '@mantine/core';
import { useDebouncedValue } from '@mantine/hooks';
import { modals } from '@mantine/modals';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { IconPlus, IconSearch } from '@tabler/icons-react';
import { api } from '../api/client';
import type { Customer, Page } from '../api/types';
import { useAuth } from '../auth';
import { useI18n } from '../i18n';
import { ActiveBadge, Empty, ErrorBox, Loading, PageHeader, Pager, fmtDate, fmtMoney } from '../components/ui';
import { CustomerForm } from './forms';

const LIMIT = 25;

export default function CustomersPage() {
  const { t } = useI18n();
  const { can } = useAuth();
  const nav = useNavigate();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [offset, setOffset] = useState(0);
  const [dq] = useDebouncedValue(q, 300);

  const query = useQuery({
    queryKey: ['customers', dq, status, offset],
    queryFn: () => api.get<Page<Customer>>('/customers', { q: dq, status, limit: LIMIT, offset }),
    placeholderData: keepPreviousData,
  });

  const openNew = () => modals.open({
    title: t('cust.new'),
    children: <CustomerForm onDone={(c) => { modals.closeAll(); nav(`/customers/${c.id}`); }} />,
  });

  return (
    <>
      <PageHeader title={t('nav.customers')} actions={can('operator') && <Button leftSection={<IconPlus size={16} />} onClick={openNew}>{t('cust.new')}</Button>} />
      <Card withBorder padding="sm">
        <Group mb="sm" wrap="wrap">
          <TextInput placeholder={t('cust.searchHint')} leftSection={<IconSearch size={16} />} value={q} onChange={(e) => { setQ(e.currentTarget.value); setOffset(0); }} w={280} maw="100%" />
          <SegmentedControl value={status} onChange={(v) => { setStatus(v); setOffset(0); }} data={[{ label: t('common.all'), value: '' }, { label: t('common.active'), value: 'active' }, { label: t('common.blocked'), value: 'blocked' }]} />
        </Group>
        {query.isLoading ? <Loading /> : query.error ? <ErrorBox error={query.error} /> : (
          <>
            <Table.ScrollContainer minWidth={760}>
              <Table highlightOnHover verticalSpacing="xs">
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>{t('cust.name')}</Table.Th><Table.Th>{t('cust.phone')}</Table.Th>
                    <Table.Th>{t('cust.loans')}</Table.Th><Table.Th className="num">{t('cust.outstanding')}</Table.Th>
                    <Table.Th>{t('common.status')}</Table.Th><Table.Th>{t('cust.since')}</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {query.data!.items.map((c) => (
                    <Table.Tr key={c.id} className="clickable-row" onClick={() => nav(`/customers/${c.id}`)}>
                      <Table.Td fw={500}>{c.fullName}</Table.Td>
                      <Table.Td className="mono">{c.phone}</Table.Td>
                      <Table.Td>
                        <Text size="sm">{c.loansOpen} / {c.loansTotal}{c.loansOverdue > 0 && <Text span c="red" fw={600}> · {c.loansOverdue} {t('state.overdue').toLowerCase()}</Text>}</Text>
                      </Table.Td>
                      <Table.Td className="num">{fmtMoney(c.outstandingPrincipal)}</Table.Td>
                      <Table.Td><ActiveBadge active={c.isActive} /></Table.Td>
                      <Table.Td>{fmtDate(c.createdAt)}</Table.Td>
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
