import { ActionIcon, Alert, Anchor, Button, Card, Group, Menu, SimpleGrid, Table, Tabs, Text, Tooltip } from '@mantine/core';
import { modals } from '@mantine/modals';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  IconArrowLeft, IconCash, IconDots, IconDownload, IconEdit, IconEye, IconFileUpload, IconPencil,
  IconRefresh, IconReplace, IconRotate, IconTrash, IconArrowBackUp,
} from '@tabler/icons-react';
import { api } from '../api/client';
import type { DocumentItem, LoanDetail, Page, Payment } from '../api/types';
import { useAuth } from '../auth';
import { useI18n } from '../i18n';
import { Empty, ErrorBox, InstBadge, Loading, MethodBadge, PageHeader, StateBadge, fmtDate, fmtDateTime, fmtMoney, fmtSize, useNotify } from '../components/ui';
import { DocumentRenameForm, DocumentReplaceForm, DocumentUploadForm, InstallmentForm, LoanEditForm, PaymentForm, RestructureForm, ReverseForm } from './forms';

function Stat({ label, value, color }: { label: string; value: React.ReactNode; color?: string }) {
  return (
    <div>
      <Text size="xs" c="dimmed">{label}</Text>
      <Text fw={600} c={color} style={{ fontVariantNumeric: 'tabular-nums' }}>{value}</Text>
    </div>
  );
}

export default function LoanPage() {
  const { id } = useParams();
  const { t } = useI18n();
  const { can } = useAuth();
  const nav = useNavigate();
  const qc = useQueryClient();
  const notify = useNotify();

  const q = useQuery({ queryKey: ['loan', id], queryFn: () => api.get<LoanDetail>(`/loans/${id}`) });
  const pays = useQuery({ queryKey: ['payments', 'loan', id], queryFn: () => api.get<Page<Payment>>('/payments', { loanId: id, limit: 500 }) });
  const docs = useQuery({ queryKey: ['documents', id], queryFn: () => api.get<DocumentItem[]>(`/loans/${id}/documents`) });

  const del = useMutation({
    mutationFn: () => api.del(`/loans/${id}`),
    onSuccess: () => { notify.ok(); qc.invalidateQueries({ queryKey: ['loans'] }); nav('/loans'); },
    onError: notify.error,
  });
  const regen = useMutation({
    mutationFn: () => api.post(`/loans/${id}/documents/regenerate`),
    onSuccess: () => { notify.ok(); qc.invalidateQueries({ queryKey: ['documents', id] }); },
    onError: notify.error,
  });
  const delDoc = useMutation({
    mutationFn: (docId: string) => api.del(`/documents/${docId}`),
    onSuccess: () => { notify.ok(); qc.invalidateQueries({ queryKey: ['documents', id] }); },
    onError: notify.error,
  });

  if (q.isLoading) return <Loading />;
  if (q.error) return <ErrorBox error={q.error} />;
  const l = q.data!;
  const livePayments = (pays.data?.items ?? []).filter((p) => !p.reversedAt);
  const lastLive = [...livePayments].sort((a, b) => b.installmentNumber - a.installmentNumber)[0];
  const hasPayments = livePayments.length > 0 || l.paidCount > 0;
  const op = can('operator');
  const close = () => modals.closeAll();
  const open = (title: string, children: React.ReactNode, size: string = 'md') => modals.open({ title, children, size });
  const confirm = (title: string, body: string, color: string, onConfirm: () => void) => modals.openConfirmModal({
    title, children: <Text size="sm">{body}</Text>, labels: { confirm: t('common.confirm'), cancel: t('common.cancel') }, confirmProps: { color }, onConfirm,
  });
  const download = (d: DocumentItem, inline: boolean) => api.file(`/documents/${d.id}/download`, d.fileName, inline).catch(notify.error);

  return (
    <>
      <Button variant="subtle" leftSection={<IconArrowLeft size={16} />} mb="xs" px={0} onClick={() => nav(-1)}>{t('common.back')}</Button>
      <PageHeader
        title={<Group gap="sm"><span className="mono">{l.contractNo}</span><StateBadge state={l.state} /></Group>}
        sub={<><Anchor component={Link} to={`/customers/${l.userId}`}>{l.userFullName}</Anchor> · <span className="mono">{l.userPhone}</span> · {t(l.productName)}</>}
        actions={op && (
          <>
            {l.state !== 'closed' && <Button leftSection={<IconCash size={16} />} onClick={() => open(t('pay.new'), <PaymentForm loan={l} onDone={close} />)}>{t('loan.recordPayment')}</Button>}
            <Menu position="bottom-end">
              <Menu.Target><Button variant="default" rightSection={<IconDots size={16} />}>{t('common.actions')}</Button></Menu.Target>
              <Menu.Dropdown>
                <Menu.Item leftSection={<IconEdit size={16} />} onClick={() => open(t('loan.editTerms'), <LoanEditForm loan={l} hasPayments={hasPayments} onDone={close} />, 'lg')}>{t('loan.editTerms')}</Menu.Item>
                {l.state !== 'closed' && <Menu.Item leftSection={<IconRotate size={16} />} onClick={() => open(t('loan.restructure'), <RestructureForm loan={l} onDone={close} />)}>{t('loan.restructure')}</Menu.Item>}
                <Menu.Item leftSection={<IconRefresh size={16} />} onClick={() => confirm(t('loan.regenerate'), t('loan.regenerateHelp'), 'blue', () => regen.mutate())}>{t('loan.regenerate')}</Menu.Item>
                {can('admin') && <><Menu.Divider /><Menu.Item color="red" leftSection={<IconTrash size={16} />} disabled={hasPayments} onClick={() => confirm(t('loan.delete'), t('loan.deleteHelp'), 'red', () => del.mutate())}>{t('loan.delete')}</Menu.Item></>}
              </Menu.Dropdown>
            </Menu>
          </>
        )}
      />

      <Card withBorder mb="md">
        <SimpleGrid cols={{ base: 2, sm: 3, md: 6 }} spacing="md">
          <Stat label={t('loan.amount')} value={fmtMoney(l.amount, l.currency)} />
          <Stat label={t('loan.rate')} value={`${l.annualRate}%`} />
          <Stat label={t('loan.term')} value={`${l.termMonths}`} />
          <Stat label={t('loan.monthly')} value={fmtMoney(l.monthlyPayment, l.currency)} />
          <Stat label={t('loan.start')} value={fmtDate(l.startDate)} />
          <Stat label={t('loan.final')} value={fmtDate(l.finalPaymentDate)} />
          <Stat label={t('loan.paid')} value={`${t('loan.paidCount', { paid: l.paidCount, total: l.schedule.length })} · ${fmtMoney(l.paidTotal, l.currency)}`} />
          <Stat label={t('loan.outstanding')} value={fmtMoney(l.outstandingPrincipal, l.currency)} />
          <Stat label={t('loan.overdue')} value={l.overdueCount ? `${l.overdueCount} · ${fmtMoney(l.overdueAmount, l.currency)}` : '—'} color={l.overdueCount ? 'red' : undefined} />
          <Stat label={t('loan.next')} value={l.nextInstallment ? `${fmtDate(l.nextInstallment.dueDate)} · ${fmtMoney(l.nextInstallment.total, l.currency)}` : '—'} />
        </SimpleGrid>
      </Card>
      {Math.abs(l.principalDifference) >= 0.01 && <Alert color="yellow" mb="md">{t('loan.principalDiff', { v: fmtMoney(l.principalDifference, l.currency) })}</Alert>}

      <Tabs defaultValue="schedule" keepMounted={false}>
        <Tabs.List mb="sm">
          <Tabs.Tab value="schedule">{t('loan.schedule')}</Tabs.Tab>
          <Tabs.Tab value="payments">{t('loan.payments')} ({pays.data?.total ?? 0})</Tabs.Tab>
          <Tabs.Tab value="documents">{t('loan.documents')} ({docs.data?.length ?? 0})</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="schedule">
          <Card withBorder padding="xs">
            <Table.ScrollContainer minWidth={760}>
              <Table striped verticalSpacing={6}>
                <Table.Thead><Table.Tr>
                  <Table.Th>{t('inst.no')}</Table.Th><Table.Th>{t('inst.due')}</Table.Th>
                  <Table.Th className="num">{t('inst.principal')}</Table.Th><Table.Th className="num">{t('inst.interest')}</Table.Th>
                  <Table.Th className="num">{t('inst.total')}</Table.Th><Table.Th className="num">{t('inst.balance')}</Table.Th>
                  <Table.Th>{t('common.status')}</Table.Th><Table.Th>{t('inst.paidOn')}</Table.Th><Table.Th />
                </Table.Tr></Table.Thead>
                <Table.Tbody>
                  {l.schedule.map((i) => (
                    <Table.Tr key={i.number}>
                      <Table.Td>{i.number}</Table.Td><Table.Td>{fmtDate(i.dueDate)}</Table.Td>
                      <Table.Td className="num">{fmtMoney(i.principal, l.currency)}</Table.Td>
                      <Table.Td className="num">{fmtMoney(i.interest, l.currency)}</Table.Td>
                      <Table.Td className="num"><b>{fmtMoney(i.total, l.currency)}</b></Table.Td>
                      <Table.Td className="num">{fmtMoney(i.balanceAfter, l.currency)}</Table.Td>
                      <Table.Td><InstBadge status={i.status} /></Table.Td>
                      <Table.Td>{i.paidDate ? <Text size="sm">{fmtDate(i.paidDate)} <Text span size="xs" c="dimmed" className="mono">{i.paymentReference}</Text></Text> : ''}</Table.Td>
                      <Table.Td>{op && i.status !== 'paid' && (
                        <Tooltip label={t('common.edit')}><ActionIcon variant="subtle" size="sm" onClick={() => open(t('inst.edit', { n: i.number }), <InstallmentForm loan={l} inst={i} onDone={close} />)}><IconPencil size={14} /></ActionIcon></Tooltip>
                      )}</Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Table.ScrollContainer>
          </Card>
        </Tabs.Panel>

        <Tabs.Panel value="payments">
          <Card withBorder padding="xs">
            <Table.ScrollContainer minWidth={800}>
              <Table verticalSpacing={6}>
                <Table.Thead><Table.Tr>
                  <Table.Th>{t('pay.reference')}</Table.Th><Table.Th>{t('pay.paidAt')}</Table.Th><Table.Th>{t('pay.installment')}</Table.Th>
                  <Table.Th className="num">{t('loan.amount')}</Table.Th><Table.Th>{t('pay.method')}</Table.Th><Table.Th>{t('pay.by')}</Table.Th>
                  <Table.Th>{t('common.note')}</Table.Th><Table.Th />
                </Table.Tr></Table.Thead>
                <Table.Tbody>
                  {(pays.data?.items ?? []).map((p) => (
                    <Table.Tr key={p.id} style={p.reversedAt ? { opacity: 0.55 } : undefined}>
                      <Table.Td className="mono">{p.reference}</Table.Td><Table.Td>{fmtDateTime(p.paidAt)}</Table.Td>
                      <Table.Td>#{p.installmentNumber}</Table.Td>
                      <Table.Td className="num" style={p.reversedAt ? { textDecoration: 'line-through' } : undefined}>{fmtMoney(p.amount, p.currency)}</Table.Td>
                      <Table.Td><MethodBadge method={p.method} /></Table.Td>
                      <Table.Td>{p.createdBy ?? '—'}</Table.Td>
                      <Table.Td>{p.reversedAt ? <Text size="xs" c="red">{t('pay.reversed')} {fmtDateTime(p.reversedAt)} · {p.reversedBy}: {p.reversalReason}</Text> : <Text size="xs">{p.note}</Text>}</Table.Td>
                      <Table.Td>{can('admin') && !p.reversedAt && lastLive?.id === p.id && (
                        <Tooltip label={t('pay.reverse')}><ActionIcon color="red" variant="subtle" size="sm" onClick={() => open(t('pay.reverse'), <ReverseForm payment={p} onDone={close} />)}><IconArrowBackUp size={15} /></ActionIcon></Tooltip>
                      )}</Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Table.ScrollContainer>
            {pays.data?.items.length === 0 && <Empty />}
          </Card>
        </Tabs.Panel>

        <Tabs.Panel value="documents">
          <Card withBorder padding="xs">
            {op && <Group justify="flex-end" mb="xs"><Button size="xs" leftSection={<IconFileUpload size={14} />} onClick={() => open(t('doc.upload'), <DocumentUploadForm loanId={l.id} onDone={close} />)}>{t('doc.upload')}</Button></Group>}
            <Table.ScrollContainer minWidth={700}>
              <Table verticalSpacing={6}>
                <Table.Thead><Table.Tr>
                  <Table.Th>{t('doc.type')}</Table.Th><Table.Th>{t('doc.name')}</Table.Th><Table.Th>{t('doc.size')}</Table.Th><Table.Th>{t('common.date')}</Table.Th><Table.Th />
                </Table.Tr></Table.Thead>
                <Table.Tbody>
                  {(docs.data ?? []).map((d) => (
                    <Table.Tr key={d.id}>
                      <Table.Td fw={500}>{t(d.nameKey)}</Table.Td><Table.Td className="mono">{d.fileName}</Table.Td>
                      <Table.Td>{fmtSize(d.sizeBytes)}</Table.Td><Table.Td>{fmtDateTime(d.createdAt)}</Table.Td>
                      <Table.Td>
                        <Group gap={4} justify="flex-end" wrap="nowrap">
                          <Tooltip label={t('common.view')}><ActionIcon variant="subtle" size="sm" onClick={() => download(d, true)}><IconEye size={15} /></ActionIcon></Tooltip>
                          <Tooltip label={t('common.download')}><ActionIcon variant="subtle" size="sm" onClick={() => download(d, false)}><IconDownload size={15} /></ActionIcon></Tooltip>
                          {op && <>
                            <Tooltip label={t('doc.replace')}><ActionIcon variant="subtle" size="sm" onClick={() => open(t('doc.replace'), <DocumentReplaceForm doc={d} onDone={close} />)}><IconReplace size={15} /></ActionIcon></Tooltip>
                            <Tooltip label={t('doc.rename')}><ActionIcon variant="subtle" size="sm" onClick={() => open(t('doc.rename'), <DocumentRenameForm doc={d} onDone={close} />)}><IconPencil size={15} /></ActionIcon></Tooltip>
                            <Tooltip label={t('common.delete')}><ActionIcon color="red" variant="subtle" size="sm" onClick={() => confirm(t('common.delete'), `${t(d.nameKey)} — ${t('doc.deleteHelp')}`, 'red', () => delDoc.mutate(d.id))}><IconTrash size={15} /></ActionIcon></Tooltip>
                          </>}
                        </Group>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Table.ScrollContainer>
            {docs.data?.length === 0 && <Empty />}
          </Card>
        </Tabs.Panel>
      </Tabs>
    </>
  );
}
