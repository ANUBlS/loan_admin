import { Badge, Button, Card, Group, Menu, ActionIcon, Table, Text } from '@mantine/core';
import { modals } from '@mantine/modals';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { IconDots, IconKey, IconPencil, IconPlus, IconUserCheck, IconUserOff } from '@tabler/icons-react';
import dayjs from 'dayjs';
import { api } from '../api/client';
import type { AdminUser } from '../api/types';
import { useAuth } from '../auth';
import { useI18n } from '../i18n';
import { ErrorBox, Loading, PageHeader, RoleBadge, fmtDateTime, useNotify } from '../components/ui';
import { AdminCreateForm, AdminEditForm, AdminPasswordForm } from './forms';

export default function AdminsPage() {
  const { t } = useI18n();
  const { user } = useAuth();
  const qc = useQueryClient();
  const notify = useNotify();
  const q = useQuery({ queryKey: ['admins'], queryFn: () => api.get<AdminUser[]>('/admin-users') });
  const toggle = useMutation({
    mutationFn: (a: AdminUser) => api.patch(`/admin-users/${a.id}`, { isActive: !a.isActive }),
    onSuccess: () => { notify.ok(); qc.invalidateQueries({ queryKey: ['admins'] }); }, onError: notify.error,
  });
  const close = () => modals.closeAll();

  return (
    <>
      <PageHeader title={t('nav.admins')} sub={t('adm.roleHelp')} actions={
        <Button leftSection={<IconPlus size={16} />} onClick={() => modals.open({ title: t('adm.new'), children: <AdminCreateForm onDone={close} /> })}>{t('adm.new')}</Button>
      } />
      <Card withBorder padding="sm">
        {q.isLoading ? <Loading /> : q.error ? <ErrorBox error={q.error} /> : (
          <Table.ScrollContainer minWidth={760}>
            <Table verticalSpacing="xs">
              <Table.Thead><Table.Tr>
                <Table.Th>{t('auth.username')}</Table.Th><Table.Th>{t('cust.name')}</Table.Th><Table.Th>{t('adm.role')}</Table.Th>
                <Table.Th>{t('common.status')}</Table.Th><Table.Th>{t('adm.lastLogin')}</Table.Th><Table.Th />
              </Table.Tr></Table.Thead>
              <Table.Tbody>
                {q.data!.map((a) => (
                  <Table.Tr key={a.id}>
                    <Table.Td className="mono">{a.username}</Table.Td>
                    <Table.Td fw={500}>{a.fullName}{a.id === user?.id && <Text span c="dimmed" size="xs"> (you)</Text>}</Table.Td>
                    <Table.Td><RoleBadge role={a.role} /></Table.Td>
                    <Table.Td>
                      <Group gap={4}>
                        <Badge variant="dot" color={a.isActive ? 'teal' : 'gray'}>{a.isActive ? t('common.active') : t('common.inactive')}</Badge>
                        {a.lockedUntil && dayjs(a.lockedUntil).isAfter(dayjs()) && <Badge color="red" variant="light">{t('adm.locked', { t: fmtDateTime(a.lockedUntil) })}</Badge>}
                        {a.mustChangePassword && <Badge color="yellow" variant="light"><IconKey size={10} /></Badge>}
                      </Group>
                    </Table.Td>
                    <Table.Td>{fmtDateTime(a.lastLoginAt)}</Table.Td>
                    <Table.Td>
                      <Menu position="bottom-end">
                        <Menu.Target><ActionIcon variant="subtle"><IconDots size={16} /></ActionIcon></Menu.Target>
                        <Menu.Dropdown>
                          <Menu.Item leftSection={<IconPencil size={15} />} onClick={() => modals.open({ title: t('common.edit'), children: <AdminEditForm admin={a} onDone={close} /> })}>{t('common.edit')}</Menu.Item>
                          <Menu.Item leftSection={<IconKey size={15} />} onClick={() => modals.open({ title: t('adm.resetPassword'), children: <AdminPasswordForm admin={a} onDone={close} /> })}>{t('adm.resetPassword')}</Menu.Item>
                          {a.id !== user?.id && (
                            <Menu.Item color={a.isActive ? 'red' : 'teal'} leftSection={a.isActive ? <IconUserOff size={15} /> : <IconUserCheck size={15} />} onClick={() => toggle.mutate(a)}>
                              {a.isActive ? t('adm.deactivate') : t('adm.activate')}
                            </Menu.Item>
                          )}
                        </Menu.Dropdown>
                      </Menu>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        )}
      </Card>
    </>
  );
}
