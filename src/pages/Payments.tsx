import { useState } from 'react';
import { ActionIcon, Anchor, Button, Card, Checkbox, Group, Select, Table, Text, TextInput, Tooltip } from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { useDebouncedValue } from '@mantine/hooks';
import { modals } from '@mantine/modals';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { IconArrowBackUp, IconPlus, IconSearch } from '@tabler/icons-react';
import { api } from '../api/client';
import type { Page, Payment } from '../api/types';
import { useAuth } from '../auth';
import { useI18n } from '../i18n';
import { Empty, ErrorBox, Loading, MethodBadge, PageHeader, Pager, fmtDateTime, fmtMoney, isoDate } from '../components/ui';
import { PaymentForm, ReverseForm } from './forms';

const LIMIT = 50;

export default function PaymentsPage() {
  const { t } = useI18n();
  const { can } = useAuth();
  const [q, setQ] = useState('');
  const [method, setMethod] = useState<string | null>(null);
  const [range, setRange] = useState<[Date | null, Date | null]>([null, null]);
  const [withReversed, setWithReversed] = useState(true);
  const [offset, setOffset] = useState(0);
  const [dq] = useDebouncedValue(q, 300);

  const query = useQuery({
    queryKey: ['payments', dq, method, isoDate(range[0]), isoDate(range[1]), withReversed, offset],
    queryFn: () => api.get<Page<Payment>>('/payments', {
      q: dq, method, from: isoDate(range[0]), to: isoDate(range[1]), includeReversed: withReversed, limit: LIMIT, offset,
    }),
    placeholderData: keepPreviousData,
  });
  const reset = () => setOffset(0);
  const sum = (query.data?.items ?? []).filter((p) => !p.reversedAt).reduce((s, p) => s + p.amount, 0);

  return (
    <>
      <PageHeader title={t('nav.payments')} actions={can('operator') && (
        <Button leftSection={<IconPlus size={16} />} onClick={() => modals.open({ title: t('pay.new'), children: <PaymentForm onDone={() => modals.closeAll()} /> })}>{t('pay.new')}</Button>
      )} />
      <Card withBorder padding="sm">
        <Group mb="sm" wrap="wrap" align="flex-end">
          <TextInput placeholder={t('pay.searchHint')} leftSection={<IconSearch size={16} />} value={q} onChange={(e) => { setQ(e.currentTarget.value); reset(); }} w={280} maw="100%" />
          <Select placeholder={t('pay.method')} clearable value={method} onChange={(v) => { setMethod(v); reset(); }} w={170}
            data={['app', 'cash', 'bank_transfer', 'card'].map((m) => ({ value: m, label: t(`method.${m}`) }))} />
          <DatePickerInput type="range" placeholder={`${t('common.from')} – ${t('common.to')}`} valueFormat="DD.MM.YYYY" clearable value={range} onChange={(v) => { setRange(v as [Date | null, Date | null]); reset(); }} w={240} />
          <Checkbox label={t('pay.includeReversed')} checked={withReversed} onChange={(e) => { setWithReversed(e.currentTarget.checked); reset(); }} mb={8} />
        </Group>
        {query.isLoading ? <Loading /> : query.error ? <ErrorBox error={query.error} /> : (
          <>
            <Table.ScrollContainer minWidth={980}>
              <Table verticalSpacing="xs" highlightOnHover>
                <Table.Thead><Table.Tr>
                  <Table.Th>{t('pay.reference')}</Table.Th><Table.Th>{t('pay.paidAt')}</Table.Th><Table.Th>{t('loan.customer')}</Table.Th>
                  <Table.Th>{t('loan.contract')}</Table.Th><Table.Th>{t('pay.installment')}</Table.Th><Table.Th className="num">{t('loan.amount')}</Table.Th>
                  <Table.Th>{t('pay.method')}</Table.Th><Table.Th>{t('pay.by')}</Table.Th><Table.Th />
                </Table.Tr></Table.Thead>
                <Table.Tbody>
                  {query.data!.items.map((p) => (
                    <Table.Tr key={p.id} style={p.reversedAt ? { opacity: 0.55 } : undefined}>
                      <Table.Td className="mono">{p.reference}</Table.Td>
                      <Table.Td>{fmtDateTime(p.paidAt)}</Table.Td>
                      <Table.Td><Anchor component={Link} to={`/customers/${p.userId}`} size="sm">{p.userFullName}</Anchor></Table.Td>
                      <Table.Td><Anchor component={Link} to={`/loans/${p.loanId}`} size="sm" className="mono">{p.contractNo}</Anchor></Table.Td>
                      <Table.Td>#{p.installmentNumber}</Table.Td>
                      <Table.Td className="num" style={p.reversedAt ? { textDecoration: 'line-through' } : undefined}>{fmtMoney(p.amount, p.currency)}</Table.Td>
                      <Table.Td><MethodBadge method={p.method} />{p.reversedAt && <Text size="xs" c="red">{t('pay.reversed')}: {p.reversalReason}</Text>}</Table.Td>
                      <Table.Td><Text size="sm">{p.createdBy ?? '—'}</Text>{p.note && <Text size="xs" c="dimmed">{p.note}</Text>}</Table.Td>
                      <Table.Td>{can('admin') && !p.reversedAt && (
                        <Tooltip label={t('pay.reverse')}><ActionIcon color="red" variant="subtle" size="sm" onClick={() => modals.open({ title: t('pay.reverse'), children: <ReverseForm payment={p} onDone={() => modals.closeAll()} /> })}><IconArrowBackUp size={15} /></ActionIcon></Tooltip>
                      )}</Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Table.ScrollContainer>
            {query.data!.items.length === 0 ? <Empty /> : <Text size="sm" ta="right" mt="xs">{t('common.total')} ({t('loan.paid').toLowerCase()}): <b>{fmtMoney(sum)}</b></Text>}
            <Pager total={query.data!.total} limit={LIMIT} offset={offset} onChange={setOffset} />
          </>
        )}
      </Card>
    </>
  );
}
