// Modal forms used across pages. Each calls the API and invalidates the
// related queries; `onDone` closes the modal.

import { useState } from 'react';
import { Alert, Button, Checkbox, FileInput, Group, NumberInput, PasswordInput, Select, Stack, Text, TextInput, Textarea } from '@mantine/core';
import { DateInput, DateTimePicker } from '@mantine/dates';
import { useForm } from '@mantine/form';
import { useDebouncedValue } from '@mantine/hooks';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { IconUpload } from '@tabler/icons-react';
import { api } from '../api/client';
import type { AdminUser, Application, Customer, DocumentItem, Installment, Loan, LoanDetail, Page, Payment, PaymentMethod, Product, Role } from '../api/types';
import { useI18n } from '../i18n';
import { fmtMoney, isoDate, useNotify } from '../components/ui';

const LANGS = [{ value: 'az', label: 'Azərbaycan' }, { value: 'en', label: 'English' }, { value: 'ru', label: 'Русский' }];
export const DOC_TYPES = ['doc.agreement', 'doc.schedule', 'doc.application', 'doc.bureau', 'doc.insurance', 'doc.disbursement', 'doc.passport', 'doc.id_card', 'doc.income', 'doc.collateral', 'doc.other'];
const METHODS: PaymentMethod[] = ['cash', 'bank_transfer', 'card'];
const ROLES: Role[] = ['viewer', 'operator', 'admin'];

function useInvalidate() {
  const qc = useQueryClient();
  return (...keys: string[]) => keys.forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
}

const toNum = (v: string | number) => (v === '' ? undefined : Number(v));

// ------------------------------------------------------------------ customers

export function CustomerForm({ customer, onDone }: { customer?: Customer; onDone: (c: Customer) => void }) {
  const { t } = useI18n();
  const notify = useNotify();
  const inv = useInvalidate();
  const form = useForm({ initialValues: { phone: customer?.phone ?? '+994 ', fullName: customer?.fullName ?? '', language: customer?.language ?? 'az' } });
  const m = useMutation({
    mutationFn: (v: typeof form.values) => customer ? api.patch<Customer>(`/customers/${customer.id}`, v) : api.post<Customer>('/customers', v),
    onSuccess: (c) => { notify.ok(); inv('customers', 'customer', 'dashboard'); onDone(c); },
    onError: notify.error,
  });
  return (
    <form onSubmit={form.onSubmit((v) => m.mutate(v))}>
      <Stack>
        <TextInput label={t('cust.phone')} required placeholder="+994 50 123 45 67" {...form.getInputProps('phone')} />
        {customer && <Text size="xs" c="dimmed" mt={-8}>{t('cust.phoneChangeHelp')}</Text>}
        <TextInput label={t('cust.name')} required minLength={3} {...form.getInputProps('fullName')} />
        <Select label={t('cust.language')} data={LANGS} allowDeselect={false} {...form.getInputProps('language')} />
        <Button type="submit" loading={m.isPending}>{customer ? t('common.save') : t('common.create')}</Button>
      </Stack>
    </form>
  );
}

function CustomerPicker({ value, onChange }: { value: string | null; onChange: (id: string | null) => void }) {
  const { t } = useI18n();
  const [search, setSearch] = useState('');
  const [dq] = useDebouncedValue(search, 250);
  const q = useQuery({ queryKey: ['customers', 'pick', dq], queryFn: () => api.get<Page<Customer>>('/customers', { q: dq, status: 'active', limit: 20 }) });
  return (
    <Select label={t('loan.customer')} required searchable clearable value={value} onChange={onChange}
      searchValue={search} onSearchChange={setSearch} filter={({ options }) => options}
      placeholder={t('cust.searchHint')} nothingFoundMessage={t('common.empty')}
      data={(q.data?.items ?? []).map((c) => ({ value: c.id, label: `${c.fullName} · ${c.phone}` }))} />
  );
}

// ---------------------------------------------------------------------- loans

export function useProducts() {
  return useQuery({ queryKey: ['products'], queryFn: () => api.get<Product[]>('/products'), staleTime: 60_000 });
}

export function LoanCreateForm({ customer, onDone }: { customer?: Customer; onDone: (l: LoanDetail) => void }) {
  const { t } = useI18n();
  const notify = useNotify();
  const inv = useInvalidate();
  const products = useProducts();
  const form = useForm({
    initialValues: {
      userId: customer?.id ?? null as string | null, productId: null as string | null,
      amount: '' as string | number, annualRate: '' as string | number, termMonths: '' as string | number,
      startDate: new Date() as Date | null, contractNo: '', checkProductLimits: true,
    },
  });
  const product = products.data?.find((p) => String(p.id) === form.values.productId);
  const m = useMutation({
    mutationFn: (v: typeof form.values) => api.post<LoanDetail>('/loans', {
      userId: v.userId, productId: Number(v.productId), amount: toNum(v.amount), termMonths: toNum(v.termMonths),
      annualRate: toNum(v.annualRate), startDate: isoDate(v.startDate), contractNo: v.contractNo.trim() || undefined,
      checkProductLimits: v.checkProductLimits,
    }),
    onSuccess: (l) => { notify.ok(); inv('loans', 'customer', 'customers', 'dashboard'); onDone(l); },
    onError: notify.error,
  });
  return (
    <form onSubmit={form.onSubmit((v) => m.mutate(v))}>
      <Stack>
        {customer ? <TextInput label={t('loan.customer')} value={`${customer.fullName} · ${customer.phone}`} readOnly /> :
          <CustomerPicker value={form.values.userId} onChange={(v) => form.setFieldValue('userId', v)} />}
        <Select label={t('loan.product')} required allowDeselect={false}
          data={(products.data ?? []).map((p) => ({ value: String(p.id), label: `${t(p.loanNameKey)} — ${p.annualRate}%${p.isActive ? '' : ' (—)'}` }))}
          {...form.getInputProps('productId')} />
        {product && <Text size="xs" c="dimmed" mt={-8}>{fmtMoney(product.minAmount)} – {fmtMoney(product.maxAmount)} · {product.minTerm}–{product.maxTerm} {t('loan.term').split(',')[0].toLowerCase()}</Text>}
        <Group grow>
          <NumberInput label={t('loan.amount')} required min={1} decimalScale={2} thousandSeparator=" " {...form.getInputProps('amount')} />
          <NumberInput label={t('loan.term')} required min={1} max={600} allowDecimal={false} {...form.getInputProps('termMonths')} />
        </Group>
        <Group grow>
          <NumberInput label={t('loan.rate')} placeholder={product ? String(product.annualRate) : t('loan.rateDefault')} min={0} max={100} decimalScale={2} {...form.getInputProps('annualRate')} />
          <DateInput label={t('loan.start')} valueFormat="DD.MM.YYYY" required {...form.getInputProps('startDate')} />
        </Group>
        <TextInput label={t('loan.contract')} placeholder={t('loan.contractAuto')} {...form.getInputProps('contractNo')} />
        <Checkbox label={t('loan.checkLimits')} {...form.getInputProps('checkProductLimits', { type: 'checkbox' })} />
        <Button type="submit" loading={m.isPending} disabled={!form.values.userId || !form.values.productId}>{t('common.create')}</Button>
      </Stack>
    </form>
  );
}

export function LoanEditForm({ loan, hasPayments, onDone }: { loan: LoanDetail; hasPayments: boolean; onDone: () => void }) {
  const { t } = useI18n();
  const notify = useNotify();
  const inv = useInvalidate();
  const products = useProducts();
  const form = useForm({
    initialValues: {
      contractNo: loan.contractNo, productId: String(loan.productId), amount: loan.amount as string | number,
      annualRate: loan.annualRate as string | number, termMonths: loan.termMonths as string | number,
      startDate: new Date(loan.startDate) as Date | null,
    },
  });
  const m = useMutation({
    mutationFn: (v: typeof form.values) => {
      const body: Record<string, unknown> = {};
      if (v.contractNo !== loan.contractNo) body.contractNo = v.contractNo;
      if (!hasPayments) {
        if (Number(v.productId) !== loan.productId) body.productId = Number(v.productId);
        if (Number(v.amount) !== loan.amount) body.amount = Number(v.amount);
        if (Number(v.annualRate) !== loan.annualRate) body.annualRate = Number(v.annualRate);
        if (Number(v.termMonths) !== loan.termMonths) body.termMonths = Number(v.termMonths);
        if (isoDate(v.startDate) !== loan.startDate) body.startDate = isoDate(v.startDate);
      }
      return api.patch<LoanDetail>(`/loans/${loan.id}`, body);
    },
    onSuccess: () => { notify.ok(); inv('loan', 'loans', 'documents', 'dashboard'); onDone(); },
    onError: notify.error,
  });
  return (
    <form onSubmit={form.onSubmit((v) => m.mutate(v))}>
      <Stack>
        <Alert color={hasPayments ? 'yellow' : 'blue'}>{t('loan.editTermsHelp')}</Alert>
        <TextInput label={t('loan.contract')} required {...form.getInputProps('contractNo')} />
        <Select label={t('loan.product')} disabled={hasPayments} allowDeselect={false}
          data={(products.data ?? []).map((p) => ({ value: String(p.id), label: t(p.loanNameKey) }))} {...form.getInputProps('productId')} />
        <Group grow>
          <NumberInput label={t('loan.amount')} disabled={hasPayments} min={1} decimalScale={2} thousandSeparator=" " {...form.getInputProps('amount')} />
          <NumberInput label={t('loan.term')} disabled={hasPayments} min={1} max={600} allowDecimal={false} {...form.getInputProps('termMonths')} />
        </Group>
        <Group grow>
          <NumberInput label={t('loan.rate')} disabled={hasPayments} min={0} max={100} decimalScale={2} {...form.getInputProps('annualRate')} />
          <DateInput label={t('loan.start')} disabled={hasPayments} valueFormat="DD.MM.YYYY" {...form.getInputProps('startDate')} />
        </Group>
        <Button type="submit" loading={m.isPending}>{t('common.save')}</Button>
      </Stack>
    </form>
  );
}

export function InstallmentForm({ loan, inst, onDone }: { loan: LoanDetail; inst: Installment; onDone: () => void }) {
  const { t } = useI18n();
  const notify = useNotify();
  const inv = useInvalidate();
  const form = useForm({ initialValues: { dueDate: new Date(inst.dueDate) as Date | null, principal: inst.principal as string | number, interest: inst.interest as string | number } });
  const m = useMutation({
    mutationFn: (v: typeof form.values) => api.patch<LoanDetail>(`/loans/${loan.id}/installments/${inst.number}`, {
      dueDate: isoDate(v.dueDate), principal: toNum(v.principal), interest: toNum(v.interest),
    }),
    onSuccess: () => { notify.ok(); inv('loan', 'loans', 'documents', 'dashboard'); onDone(); },
    onError: notify.error,
  });
  const total = (Number(form.values.principal) || 0) + (Number(form.values.interest) || 0);
  return (
    <form onSubmit={form.onSubmit((v) => m.mutate(v))}>
      <Stack>
        <DateInput label={t('inst.due')} valueFormat="DD.MM.YYYY" required {...form.getInputProps('dueDate')} />
        <Group grow>
          <NumberInput label={t('inst.principal')} min={0} decimalScale={2} fixedDecimalScale thousandSeparator=" " {...form.getInputProps('principal')} />
          <NumberInput label={t('inst.interest')} min={0} decimalScale={2} fixedDecimalScale thousandSeparator=" " {...form.getInputProps('interest')} />
        </Group>
        <Text size="sm">{t('inst.total')}: <b>{fmtMoney(total, loan.currency)}</b></Text>
        <Button type="submit" loading={m.isPending}>{t('common.save')}</Button>
      </Stack>
    </form>
  );
}

export function RestructureForm({ loan, onDone }: { loan: LoanDetail; onDone: () => void }) {
  const { t } = useI18n();
  const notify = useNotify();
  const inv = useInvalidate();
  const unpaid = loan.schedule.filter((i) => i.status !== 'paid');
  const form = useForm({
    initialValues: {
      termMonths: unpaid.length as string | number, annualRate: loan.annualRate as string | number,
      firstDueDate: unpaid[0] ? new Date(unpaid[0].dueDate) as Date | null : null,
    },
  });
  const m = useMutation({
    mutationFn: (v: typeof form.values) => api.post<LoanDetail>(`/loans/${loan.id}/restructure`, {
      termMonths: toNum(v.termMonths), annualRate: toNum(v.annualRate), firstDueDate: isoDate(v.firstDueDate),
    }),
    onSuccess: () => { notify.ok(); inv('loan', 'loans', 'documents', 'dashboard'); onDone(); },
    onError: notify.error,
  });
  return (
    <form onSubmit={form.onSubmit((v) => m.mutate(v))}>
      <Stack>
        <Alert color="blue">{t('loan.restructureHelp')}</Alert>
        <Text size="sm">{t('loan.outstanding')}: <b>{fmtMoney(loan.amount - loan.paidPrincipal, loan.currency)}</b></Text>
        <Group grow>
          <NumberInput label={t('loan.remaining')} min={1} max={600} allowDecimal={false} required {...form.getInputProps('termMonths')} />
          <NumberInput label={t('loan.rate')} min={0} max={100} decimalScale={2} required {...form.getInputProps('annualRate')} />
        </Group>
        <DateInput label={t('loan.firstDue')} valueFormat="DD.MM.YYYY" required {...form.getInputProps('firstDueDate')} />
        <Button type="submit" loading={m.isPending}>{t('loan.restructure')}</Button>
      </Stack>
    </form>
  );
}

// ------------------------------------------------------------------- payments

function LoanPicker({ value, onChange }: { value: string | null; onChange: (id: string | null) => void }) {
  const { t } = useI18n();
  const [search, setSearch] = useState('');
  const [dq] = useDebouncedValue(search, 250);
  const q = useQuery({ queryKey: ['loans', 'pick', dq], queryFn: () => api.get<Page<Loan>>('/loans', { q: dq, state: 'open', limit: 20 }) });
  return (
    <Select label={t('pay.loan')} required searchable clearable value={value} onChange={onChange}
      searchValue={search} onSearchChange={setSearch} filter={({ options }) => options}
      placeholder={t('loan.searchHint')} nothingFoundMessage={t('common.empty')}
      data={(q.data?.items ?? []).map((l) => ({ value: l.id, label: `${l.contractNo} · ${l.userFullName}` }))} />
  );
}

export function PaymentForm({ loan, onDone }: { loan?: LoanDetail; onDone: () => void }) {
  const { t } = useI18n();
  const notify = useNotify();
  const inv = useInvalidate();
  const form = useForm({
    initialValues: { loanId: loan?.id ?? null as string | null, installments: 1 as string | number, method: 'cash' as PaymentMethod, paidAt: new Date() as Date | null, note: '' },
  });
  const detail = useQuery({
    queryKey: ['loan', form.values.loanId], enabled: !!form.values.loanId && !loan,
    queryFn: () => api.get<LoanDetail>(`/loans/${form.values.loanId}`),
  });
  const l = loan ?? detail.data;
  const unpaid = l ? l.schedule.filter((i) => i.status !== 'paid') : [];
  const n = Math.min(Number(form.values.installments) || 1, unpaid.length);
  const toPay = unpaid.slice(0, n).reduce((s, i) => s + i.total, 0);
  const m = useMutation({
    mutationFn: (v: typeof form.values) => api.post<Payment[]>('/payments', {
      loanId: v.loanId, installments: toNum(v.installments), method: v.method,
      paidAt: v.paidAt ? v.paidAt.toISOString() : undefined, note: v.note.trim() || undefined,
    }),
    onSuccess: () => { notify.ok(); inv('loan', 'loans', 'payments', 'dashboard', 'customer', 'customers'); onDone(); },
    onError: notify.error,
  });
  return (
    <form onSubmit={form.onSubmit((v) => m.mutate(v))}>
      <Stack>
        {loan ? <TextInput label={t('pay.loan')} value={`${loan.contractNo} · ${loan.userFullName}`} readOnly /> :
          <LoanPicker value={form.values.loanId} onChange={(v) => form.setFieldValue('loanId', v)} />}
        <NumberInput label={t('pay.count')} description={t('pay.countHelp')} min={1} max={Math.max(1, unpaid.length)} allowDecimal={false} {...form.getInputProps('installments')} />
        <Group grow>
          <Select label={t('pay.method')} allowDeselect={false} data={METHODS.map((m) => ({ value: m, label: t(`method.${m}`) }))} {...form.getInputProps('method')} />
          <DateTimePicker label={t('pay.paidAt')} valueFormat="DD.MM.YYYY HH:mm" {...form.getInputProps('paidAt')} />
        </Group>
        <Textarea label={t('common.note')} autosize minRows={2} maxLength={500} {...form.getInputProps('note')} />
        {l && unpaid.length > 0 && <Alert color="teal">{t('pay.amountToPay', { v: fmtMoney(toPay, l.currency) })} · {unpaid.slice(0, n).map((i) => `#${i.number}`).join(', ')}</Alert>}
        <Button type="submit" loading={m.isPending} disabled={!form.values.loanId || unpaid.length === 0}>{t('pay.new')}</Button>
      </Stack>
    </form>
  );
}

export function ReverseForm({ payment, onDone }: { payment: Payment; onDone: () => void }) {
  const { t } = useI18n();
  const notify = useNotify();
  const inv = useInvalidate();
  const [reason, setReason] = useState('');
  const m = useMutation({
    mutationFn: () => api.post<Payment>(`/payments/${payment.id}/reverse`, { reason }),
    onSuccess: () => { notify.ok(); inv('loan', 'loans', 'payments', 'dashboard', 'customer', 'customers'); onDone(); },
    onError: notify.error,
  });
  return (
    <Stack>
      <Alert color="red">{t('pay.reverseHelp')}</Alert>
      <Text size="sm"><span className="mono">{payment.reference}</span> · {payment.contractNo} · #{payment.installmentNumber} · <b>{fmtMoney(payment.amount, payment.currency)}</b></Text>
      <Textarea label={t('pay.reason')} required minLength={3} maxLength={500} value={reason} onChange={(e) => setReason(e.currentTarget.value)} />
      <Button color="red" loading={m.isPending} disabled={reason.trim().length < 3} onClick={() => m.mutate()}>{t('pay.reverse')}</Button>
    </Stack>
  );
}

// ------------------------------------------------------------------ documents

const ACCEPT = '.pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,application/pdf,image/*';

export function DocumentUploadForm({ loanId, onDone }: { loanId: string; onDone: () => void }) {
  const { t } = useI18n();
  const notify = useNotify();
  const inv = useInvalidate();
  const [file, setFile] = useState<File | null>(null);
  const [nameKey, setNameKey] = useState<string | null>('doc.other');
  const m = useMutation({
    mutationFn: () => {
      const fd = new FormData();
      fd.append('file', file!);
      fd.append('nameKey', nameKey ?? 'doc.other');
      return api.upload<DocumentItem>('POST', `/loans/${loanId}/documents`, fd);
    },
    onSuccess: () => { notify.ok(); inv('documents'); onDone(); },
    onError: notify.error,
  });
  return (
    <Stack>
      <Select label={t('doc.type')} data={DOC_TYPES.map((k) => ({ value: k, label: t(k) }))} value={nameKey} onChange={setNameKey} allowDeselect={false} searchable />
      <FileInput label={t('doc.file')} description={t('doc.fileHelp')} accept={ACCEPT} value={file} onChange={setFile} leftSection={<IconUpload size={16} />} clearable required />
      <Button loading={m.isPending} disabled={!file} onClick={() => m.mutate()}>{t('doc.upload')}</Button>
    </Stack>
  );
}

export function DocumentReplaceForm({ doc, onDone }: { doc: DocumentItem; onDone: () => void }) {
  const { t } = useI18n();
  const notify = useNotify();
  const inv = useInvalidate();
  const [file, setFile] = useState<File | null>(null);
  const m = useMutation({
    mutationFn: () => { const fd = new FormData(); fd.append('file', file!); return api.upload<DocumentItem>('PUT', `/documents/${doc.id}/file`, fd); },
    onSuccess: () => { notify.ok(); inv('documents'); onDone(); },
    onError: notify.error,
  });
  return (
    <Stack>
      <Text size="sm">{t(doc.nameKey)} · <span className="mono">{doc.fileName}</span></Text>
      <FileInput label={t('doc.file')} description={t('doc.fileHelp')} accept={ACCEPT} value={file} onChange={setFile} leftSection={<IconUpload size={16} />} required />
      <Button loading={m.isPending} disabled={!file} onClick={() => m.mutate()}>{t('doc.replace')}</Button>
    </Stack>
  );
}

export function DocumentRenameForm({ doc, onDone }: { doc: DocumentItem; onDone: () => void }) {
  const { t } = useI18n();
  const notify = useNotify();
  const inv = useInvalidate();
  const form = useForm({ initialValues: { nameKey: doc.nameKey, fileName: doc.fileName, sortOrder: doc.sortOrder as string | number } });
  const m = useMutation({
    mutationFn: (v: typeof form.values) => api.patch<DocumentItem>(`/documents/${doc.id}`, { ...v, sortOrder: toNum(v.sortOrder) }),
    onSuccess: () => { notify.ok(); inv('documents'); onDone(); },
    onError: notify.error,
  });
  const keys = DOC_TYPES.includes(doc.nameKey) ? DOC_TYPES : [doc.nameKey, ...DOC_TYPES];
  return (
    <form onSubmit={form.onSubmit((v) => m.mutate(v))}>
      <Stack>
        <Select label={t('doc.type')} data={keys.map((k) => ({ value: k, label: t(k) }))} allowDeselect={false} searchable {...form.getInputProps('nameKey')} />
        <TextInput label={t('doc.name')} required {...form.getInputProps('fileName')} />
        <NumberInput label={t('doc.order')} allowDecimal={false} {...form.getInputProps('sortOrder')} />
        <Button type="submit" loading={m.isPending}>{t('common.save')}</Button>
      </Stack>
    </form>
  );
}

// --------------------------------------------------------------- applications

export function ApproveForm({ app, onDone }: { app: Application; onDone: (loanId: string) => void }) {
  const { t } = useI18n();
  const notify = useNotify();
  const inv = useInvalidate();
  const form = useForm({ initialValues: { startDate: new Date() as Date | null, annualRate: '' as string | number, note: '' } });
  const m = useMutation({
    mutationFn: (v: typeof form.values) => api.post<{ id: string }>(`/applications/${app.id}/approve`, {
      startDate: isoDate(v.startDate), annualRate: toNum(v.annualRate), note: v.note.trim() || undefined,
    }),
    onSuccess: (loan) => { notify.ok(); inv('applications', 'loans', 'dashboard', 'customers'); onDone(loan.id); },
    onError: notify.error,
  });
  return (
    <form onSubmit={form.onSubmit((v) => m.mutate(v))}>
      <Stack>
        <Alert color="teal">{t('app.approveHelp')}</Alert>
        <Text size="sm">{app.userFullName} · {t(app.productName)} · <b>{fmtMoney(app.amount, app.currency)}</b> · {app.termMonths} · {app.annualRate}%</Text>
        <Group grow>
          <DateInput label={t('loan.start')} valueFormat="DD.MM.YYYY" {...form.getInputProps('startDate')} />
          <NumberInput label={t('app.rateOverride')} placeholder={String(app.annualRate)} min={0.01} max={100} decimalScale={2} {...form.getInputProps('annualRate')} />
        </Group>
        <Textarea label={t('app.decision')} autosize minRows={2} maxLength={500} {...form.getInputProps('note')} />
        <Button type="submit" color="teal" loading={m.isPending}>{t('app.approve')}</Button>
      </Stack>
    </form>
  );
}

export function RejectForm({ app, onDone }: { app: Application; onDone: () => void }) {
  const { t } = useI18n();
  const notify = useNotify();
  const inv = useInvalidate();
  const [reason, setReason] = useState('');
  const m = useMutation({
    mutationFn: () => api.post(`/applications/${app.id}/reject`, { reason }),
    onSuccess: () => { notify.ok(); inv('applications', 'dashboard'); onDone(); },
    onError: notify.error,
  });
  return (
    <Stack>
      <Text size="sm">{app.userFullName} · {t(app.productName)} · <b>{fmtMoney(app.amount, app.currency)}</b></Text>
      <Textarea label={t('pay.reason')} required minLength={3} maxLength={500} value={reason} onChange={(e) => setReason(e.currentTarget.value)} />
      <Button color="red" loading={m.isPending} disabled={reason.trim().length < 3} onClick={() => m.mutate()}>{t('app.reject')}</Button>
    </Stack>
  );
}

// ------------------------------------------------------------------- products

export function ProductForm({ product, onDone }: { product?: Product; onDone: () => void }) {
  const { t } = useI18n();
  const notify = useNotify();
  const inv = useInvalidate();
  const form = useForm({
    initialValues: {
      code: product?.code ?? '', type: product?.type ?? 'consumer', nameKey: product?.nameKey ?? 'product.',
      loanNameKey: product?.loanNameKey ?? 'product.', annualRate: product?.annualRate ?? '' as string | number,
      minAmount: product?.minAmount ?? '' as string | number, maxAmount: product?.maxAmount ?? '' as string | number,
      step: product?.step ?? 100 as string | number, minTerm: product?.minTerm ?? 6 as string | number,
      maxTerm: product?.maxTerm ?? 60 as string | number, isActive: product?.isActive ?? true,
      sortOrder: product?.sortOrder ?? 0 as string | number,
    },
  });
  const m = useMutation({
    mutationFn: (v: typeof form.values) => {
      const body = {
        nameKey: v.nameKey, loanNameKey: v.loanNameKey, annualRate: toNum(v.annualRate), minAmount: toNum(v.minAmount),
        maxAmount: toNum(v.maxAmount), step: toNum(v.step), minTerm: toNum(v.minTerm), maxTerm: toNum(v.maxTerm),
        isActive: v.isActive, sortOrder: toNum(v.sortOrder),
      };
      return product ? api.patch(`/products/${product.id}`, body) : api.post('/products', { ...body, code: v.code, type: v.type });
    },
    onSuccess: () => { notify.ok(); inv('products'); onDone(); },
    onError: notify.error,
  });
  return (
    <form onSubmit={form.onSubmit((v) => m.mutate(v))}>
      <Stack>
        <Group grow>
          <TextInput label={t('prod.code')} required disabled={!!product} {...form.getInputProps('code')} />
          <Select label={t('prod.type')} disabled={!!product} allowDeselect={false} data={['consumer', 'car', 'mortgage', 'business'].map((v) => ({ value: v, label: t(`type.${v}`) }))} {...form.getInputProps('type')} />
        </Group>
        <Group grow>
          <TextInput label={t('prod.nameKey')} required {...form.getInputProps('nameKey')} />
          <TextInput label={t('prod.loanNameKey')} required {...form.getInputProps('loanNameKey')} />
        </Group>
        <Group grow>
          <NumberInput label={t('loan.rate')} required min={0} max={100} decimalScale={2} {...form.getInputProps('annualRate')} />
          <NumberInput label={t('prod.step')} required min={0.01} decimalScale={2} {...form.getInputProps('step')} />
        </Group>
        <Group grow>
          <NumberInput label={t('prod.min')} required min={0.01} decimalScale={2} thousandSeparator=" " {...form.getInputProps('minAmount')} />
          <NumberInput label={t('prod.max')} required min={0.01} decimalScale={2} thousandSeparator=" " {...form.getInputProps('maxAmount')} />
        </Group>
        <Group grow>
          <NumberInput label={t('prod.minTerm')} required min={1} max={600} allowDecimal={false} {...form.getInputProps('minTerm')} />
          <NumberInput label={t('prod.maxTerm')} required min={1} max={600} allowDecimal={false} {...form.getInputProps('maxTerm')} />
          <NumberInput label={t('prod.order')} allowDecimal={false} {...form.getInputProps('sortOrder')} />
        </Group>
        <Checkbox label={t('prod.active')} {...form.getInputProps('isActive', { type: 'checkbox' })} />
        <Button type="submit" loading={m.isPending}>{product ? t('common.save') : t('common.create')}</Button>
      </Stack>
    </form>
  );
}

// ---------------------------------------------------------------- admin users

export function AdminCreateForm({ onDone }: { onDone: () => void }) {
  const { t } = useI18n();
  const notify = useNotify();
  const inv = useInvalidate();
  const form = useForm({ initialValues: { username: '', fullName: '', role: 'operator' as Role, password: '', mustChangePassword: true } });
  const m = useMutation({
    mutationFn: (v: typeof form.values) => api.post<AdminUser>('/admin-users', v),
    onSuccess: () => { notify.ok(); inv('admins'); onDone(); },
    onError: notify.error,
  });
  return (
    <form onSubmit={form.onSubmit((v) => m.mutate(v))}>
      <Stack>
        <TextInput label={t('auth.username')} required autoComplete="off" {...form.getInputProps('username')} />
        <TextInput label={t('cust.name')} required {...form.getInputProps('fullName')} />
        <Select label={t('adm.role')} description={t('adm.roleHelp')} allowDeselect={false} data={ROLES.map((r) => ({ value: r, label: t(`role.${r}`) }))} {...form.getInputProps('role')} />
        <PasswordInput label={t('auth.password')} description={t('auth.passwordRules')} required autoComplete="new-password" {...form.getInputProps('password')} />
        <Checkbox label={t('adm.mustChange')} {...form.getInputProps('mustChangePassword', { type: 'checkbox' })} />
        <Button type="submit" loading={m.isPending}>{t('common.create')}</Button>
      </Stack>
    </form>
  );
}

export function AdminEditForm({ admin, onDone }: { admin: AdminUser; onDone: () => void }) {
  const { t } = useI18n();
  const notify = useNotify();
  const inv = useInvalidate();
  const form = useForm({ initialValues: { fullName: admin.fullName, role: admin.role } });
  const m = useMutation({
    mutationFn: (v: typeof form.values) => api.patch<AdminUser>(`/admin-users/${admin.id}`, v),
    onSuccess: () => { notify.ok(); inv('admins'); onDone(); },
    onError: notify.error,
  });
  return (
    <form onSubmit={form.onSubmit((v) => m.mutate(v))}>
      <Stack>
        <TextInput label={t('auth.username')} value={admin.username} readOnly />
        <TextInput label={t('cust.name')} required {...form.getInputProps('fullName')} />
        <Select label={t('adm.role')} description={t('adm.roleHelp')} allowDeselect={false} data={ROLES.map((r) => ({ value: r, label: t(`role.${r}`) }))} {...form.getInputProps('role')} />
        <Button type="submit" loading={m.isPending}>{t('common.save')}</Button>
      </Stack>
    </form>
  );
}

export function AdminPasswordForm({ admin, onDone }: { admin: AdminUser; onDone: () => void }) {
  const { t } = useI18n();
  const notify = useNotify();
  const inv = useInvalidate();
  const form = useForm({ initialValues: { newPassword: '', mustChangePassword: true } });
  const m = useMutation({
    mutationFn: (v: typeof form.values) => api.post<AdminUser>(`/admin-users/${admin.id}/reset-password`, v),
    onSuccess: () => { notify.ok(); inv('admins'); onDone(); },
    onError: notify.error,
  });
  return (
    <form onSubmit={form.onSubmit((v) => m.mutate(v))}>
      <Stack>
        <Text size="sm">{admin.fullName} · <span className="mono">{admin.username}</span></Text>
        <PasswordInput label={t('auth.newPassword')} description={t('auth.passwordRules')} required autoComplete="new-password" {...form.getInputProps('newPassword')} />
        <Checkbox label={t('adm.mustChange')} {...form.getInputProps('mustChangePassword', { type: 'checkbox' })} />
        <Button type="submit" loading={m.isPending}>{t('adm.resetPassword')}</Button>
      </Stack>
    </form>
  );
}
