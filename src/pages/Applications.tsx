import { useState } from 'react';
import { Anchor, Button, Card, Group, SegmentedControl, Table, Text } from '@mantine/core';
import { modals } from '@mantine/modals';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import type { Application } from '../api/types';
import { useAuth } from '../auth';
import { useI18n } from '../i18n';
import { AppBadge, Empty, ErrorBox, Loading, PageHeader, fmtDateTime, fmtMoney } from '../components/ui';
import { ApproveForm, RejectForm } from './forms';

export default function ApplicationsPage() {
  const { t } = useI18n();
  const { can } = useAuth();
  const nav = useNavigate();
  const [status, setStatus] = useState('submitted');
  const q = useQuery({ queryKey: ['applications', status], queryFn: () => api.get<Application[]>('/applications', { status: status || undefined, limit: 500 }) });

  return (
    <>
      <PageHeader title={t('nav.applications')} />
      <Card withBorder padding="sm">
        <SegmentedControl mb="sm" value={status} onChange={setStatus}
          data={[{ label: t('app.status.submitted'), value: 'submitted' }, { label: t('app.status.approved'), value: 'approved' }, { label: t('app.status.rejected'), value: 'rejected' }, { label: t('app.status.cancelled'), value: 'cancelled' }]} />
        {q.isLoading ? <Loading /> : q.error ? <ErrorBox error={q.error} /> : (
          <>
            <Table.ScrollContainer minWidth={980}>
              <Table verticalSpacing="xs">
                <Table.Thead><Table.Tr>
                  <Table.Th>{t('app.reference')}</Table.Th><Table.Th>{t('app.submitted')}</Table.Th><Table.Th>{t('loan.customer')}</Table.Th>
                  <Table.Th>{t('loan.product')}</Table.Th><Table.Th className="num">{t('loan.amount')}</Table.Th><Table.Th>{t('loan.term')}</Table.Th>
                  <Table.Th className="num">{t('loan.monthly')}</Table.Th><Table.Th>{t('app.purpose')}</Table.Th><Table.Th>{t('common.status')}</Table.Th><Table.Th />
                </Table.Tr></Table.Thead>
                <Table.Tbody>
                  {q.data!.map((a) => (
                    <Table.Tr key={a.id}>
                      <Table.Td className="mono">{a.reference}</Table.Td><Table.Td>{fmtDateTime(a.createdAt)}</Table.Td>
                      <Table.Td><Anchor component={Link} to={`/customers/${a.userId}`} size="sm">{a.userFullName}</Anchor><Text size="xs" c="dimmed" className="mono">{a.userPhone}</Text></Table.Td>
                      <Table.Td>{t(a.productName)}<Text size="xs" c="dimmed">{a.annualRate}%</Text></Table.Td>
                      <Table.Td className="num">{fmtMoney(a.amount, a.currency)}</Table.Td><Table.Td>{a.termMonths}</Table.Td>
                      <Table.Td className="num">{fmtMoney(a.monthlyPayment, a.currency)}</Table.Td>
                      <Table.Td>{t(a.purpose)}</Table.Td>
                      <Table.Td><AppBadge status={a.status} />{a.decisionNote && <Text size="xs" c="dimmed">{a.decisionNote}</Text>}</Table.Td>
                      <Table.Td>
                        <Group gap={6} wrap="nowrap" justify="flex-end">
                          {a.status === 'submitted' && can('operator') && <>
                            <Button size="xs" color="teal" onClick={() => modals.open({ title: t('app.approve'), children: <ApproveForm app={a} onDone={(loanId) => { modals.closeAll(); nav(`/loans/${loanId}`); }} /> })}>{t('app.approve')}</Button>
                            <Button size="xs" color="red" variant="light" onClick={() => modals.open({ title: t('app.reject'), children: <RejectForm app={a} onDone={() => modals.closeAll()} /> })}>{t('app.reject')}</Button>
                          </>}
                          {a.loanId && <Button size="xs" variant="default" onClick={() => nav(`/loans/${a.loanId}`)}>{t('app.openLoan')}</Button>}
                        </Group>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Table.ScrollContainer>
            {q.data!.length === 0 && <Empty />}
          </>
        )}
      </Card>
    </>
  );
}
