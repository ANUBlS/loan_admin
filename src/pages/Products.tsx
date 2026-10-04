import { ActionIcon, Badge, Button, Card, Table, Tooltip } from '@mantine/core';
import { modals } from '@mantine/modals';
import { IconPencil, IconPlus } from '@tabler/icons-react';
import { useAuth } from '../auth';
import { useI18n } from '../i18n';
import { Empty, ErrorBox, Loading, PageHeader, fmtMoney } from '../components/ui';
import { ProductForm, useProducts } from './forms';

export default function ProductsPage() {
  const { t } = useI18n();
  const { can } = useAuth();
  const q = useProducts();
  const admin = can('admin');
  return (
    <>
      <PageHeader title={t('nav.products')} actions={admin && (
        <Button leftSection={<IconPlus size={16} />} onClick={() => modals.open({ title: t('prod.new'), size: 'lg', children: <ProductForm onDone={() => modals.closeAll()} /> })}>{t('prod.new')}</Button>
      )} />
      <Card withBorder padding="sm">
        {q.isLoading ? <Loading /> : q.error ? <ErrorBox error={q.error} /> : (
          <Table.ScrollContainer minWidth={900}>
            <Table verticalSpacing="xs">
              <Table.Thead><Table.Tr>
                <Table.Th>{t('prod.code')}</Table.Th><Table.Th>{t('loan.product')}</Table.Th><Table.Th>{t('prod.type')}</Table.Th>
                <Table.Th className="num">{t('loan.rate')}</Table.Th><Table.Th className="num">{t('prod.min')}</Table.Th><Table.Th className="num">{t('prod.max')}</Table.Th>
                <Table.Th className="num">{t('prod.step')}</Table.Th><Table.Th>{t('loan.term')}</Table.Th><Table.Th>{t('common.status')}</Table.Th><Table.Th />
              </Table.Tr></Table.Thead>
              <Table.Tbody>
                {q.data!.map((p) => (
                  <Table.Tr key={p.id}>
                    <Table.Td className="mono">{p.code}</Table.Td><Table.Td fw={500}>{t(p.loanNameKey)}</Table.Td><Table.Td>{t(`type.${p.type}`)}</Table.Td>
                    <Table.Td className="num">{p.annualRate}%</Table.Td><Table.Td className="num">{fmtMoney(p.minAmount)}</Table.Td>
                    <Table.Td className="num">{fmtMoney(p.maxAmount)}</Table.Td><Table.Td className="num">{fmtMoney(p.step)}</Table.Td>
                    <Table.Td>{p.minTerm}–{p.maxTerm}</Table.Td>
                    <Table.Td><Badge variant="light" color={p.isActive ? 'teal' : 'gray'}>{p.isActive ? t('common.active') : t('common.inactive')}</Badge></Table.Td>
                    <Table.Td>{admin && <Tooltip label={t('common.edit')}><ActionIcon variant="subtle" size="sm" onClick={() => modals.open({ title: t(p.loanNameKey), size: 'lg', children: <ProductForm product={p} onDone={() => modals.closeAll()} /> })}><IconPencil size={15} /></ActionIcon></Tooltip>}</Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Table.ScrollContainer>
        )}
        {q.data?.length === 0 && <Empty />}
      </Card>
    </>
  );
}
