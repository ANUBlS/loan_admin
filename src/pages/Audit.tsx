import { useState } from 'react';
import { Card, Code, Group, Select, Table, Text, TextInput, Tooltip } from '@mantine/core';
import { useDebouncedValue } from '@mantine/hooks';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import type { AuditEntry, Page } from '../api/types';
import { useI18n } from '../i18n';
import { Empty, ErrorBox, Loading, PageHeader, Pager, fmtDateTime } from '../components/ui';

const LIMIT = 100;
const ENTITIES = ['customer', 'loan', 'payment', 'document', 'application', 'product', 'admin_user'];

export default function AuditPage() {
  const { t } = useI18n();
  const [entity, setEntity] = useState<string | null>(null);
  const [action, setAction] = useState('');
  const [entityId, setEntityId] = useState('');
  const [offset, setOffset] = useState(0);
  const [da] = useDebouncedValue(action, 300);
  const [di] = useDebouncedValue(entityId, 300);
  const q = useQuery({
    queryKey: ['audit', entity, da, di, offset],
    queryFn: () => api.get<Page<AuditEntry>>('/audit', { entity, action: da ? (da.includes('*') ? da : `${da}*`) : undefined, entityId: di.trim() || undefined, limit: LIMIT, offset }),
    placeholderData: keepPreviousData,
  });

  return (
    <>
      <PageHeader title={t('nav.audit')} />
      <Card withBorder padding="sm">
        <Group mb="sm" wrap="wrap">
          <Select placeholder={t('audit.entity')} clearable value={entity} onChange={(v) => { setEntity(v); setOffset(0); }} data={ENTITIES} w={170} />
          <TextInput placeholder={`${t('audit.action')} (loan., payment.reverse)`} value={action} onChange={(e) => { setAction(e.currentTarget.value); setOffset(0); }} w={240} />
          <TextInput placeholder="ID" value={entityId} onChange={(e) => { setEntityId(e.currentTarget.value); setOffset(0); }} w={300} maw="100%" />
        </Group>
        {q.isLoading ? <Loading /> : q.error ? <ErrorBox error={q.error} /> : (
          <>
            <Table.ScrollContainer minWidth={900}>
              <Table verticalSpacing={6} striped>
                <Table.Thead><Table.Tr>
                  <Table.Th>{t('audit.when')}</Table.Th><Table.Th>{t('audit.who')}</Table.Th><Table.Th>{t('audit.action')}</Table.Th>
                  <Table.Th>{t('audit.entity')}</Table.Th><Table.Th>{t('common.details')}</Table.Th><Table.Th>{t('audit.ip')}</Table.Th>
                </Table.Tr></Table.Thead>
                <Table.Tbody>
                  {q.data!.items.map((e) => (
                    <Table.Tr key={e.id}>
                      <Table.Td style={{ whiteSpace: 'nowrap' }}>{fmtDateTime(e.createdAt)}</Table.Td>
                      <Table.Td className="mono">{e.adminUsername}</Table.Td>
                      <Table.Td><Code>{e.action}</Code></Table.Td>
                      <Table.Td><Text size="xs">{e.entity}</Text><Tooltip label={e.entityId ?? ''}><Text size="xs" c="dimmed" className="mono" truncate maw={140}>{e.entityId}</Text></Tooltip></Table.Td>
                      <Table.Td><Text size="xs" className="mono" style={{ wordBreak: 'break-word' }} maw={420}>{e.details ? JSON.stringify(e.details) : ''}</Text></Table.Td>
                      <Table.Td className="mono">{e.ip}</Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Table.ScrollContainer>
            {q.data!.items.length === 0 && <Empty />}
            <Pager total={q.data!.total} limit={LIMIT} offset={offset} onChange={setOffset} />
          </>
        )}
      </Card>
    </>
  );
}
