import { useEffect } from 'react';
import { Navigate, NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { ActionIcon, AppShell, Avatar, Burger, Group, Menu, NavLink as MNavLink, SegmentedControl, Text, Tooltip, useMantineColorScheme } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { modals } from '@mantine/modals';
import {
  IconChartBar, IconUsers, IconCash, IconReceipt, IconFileDescription, IconBox, IconUserShield,
  IconHistory, IconLogout, IconKey, IconMoon, IconSun,
} from '@tabler/icons-react';
import { useAuth } from './auth';
import { useI18n } from './i18n';
import type { Role } from './api/types';
import { RoleBadge } from './components/ui';
import LoginPage from './pages/Login';
import ChangePasswordForm from './pages/ChangePassword';
import DashboardPage from './pages/Dashboard';
import CustomersPage from './pages/Customers';
import CustomerPage from './pages/Customer';
import LoansPage from './pages/Loans';
import LoanPage from './pages/Loan';
import PaymentsPage from './pages/Payments';
import ApplicationsPage from './pages/Applications';
import ProductsPage from './pages/Products';
import AdminsPage from './pages/Admins';
import AuditPage from './pages/Audit';

const NAV: { to: string; key: string; icon: typeof IconChartBar; role: Role }[] = [
  { to: '/', key: 'nav.dashboard', icon: IconChartBar, role: 'viewer' },
  { to: '/customers', key: 'nav.customers', icon: IconUsers, role: 'viewer' },
  { to: '/loans', key: 'nav.loans', icon: IconCash, role: 'viewer' },
  { to: '/payments', key: 'nav.payments', icon: IconReceipt, role: 'viewer' },
  { to: '/applications', key: 'nav.applications', icon: IconFileDescription, role: 'viewer' },
  { to: '/products', key: 'nav.products', icon: IconBox, role: 'viewer' },
  { to: '/admins', key: 'nav.admins', icon: IconUserShield, role: 'admin' },
  { to: '/audit', key: 'nav.audit', icon: IconHistory, role: 'admin' },
];

export default function App() {
  const { user, can, logout } = useAuth();
  const { t, lang, setLang } = useI18n();
  const [opened, { toggle, close }] = useDisclosure();
  const location = useLocation();
  const navigate = useNavigate();
  const { colorScheme, toggleColorScheme } = useMantineColorScheme();

  useEffect(() => { close(); }, [location.pathname, close]);

  if (!user) return <LoginPage />;
  if (user.mustChangePassword) return <LoginPage forceChange />;

  const openChangePassword = () => modals.open({
    title: t('auth.changePassword'),
    children: <ChangePasswordForm onDone={() => modals.closeAll()} />,
  });

  const isActive = (to: string) => (to === '/' ? location.pathname === '/' : location.pathname.startsWith(to));

  return (
    <AppShell header={{ height: 56 }} navbar={{ width: 230, breakpoint: 'sm', collapsed: { mobile: !opened } }} padding="md">
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between" wrap="nowrap">
          <Group gap="sm" wrap="nowrap">
            <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
            <img src="/favicon.svg" width={28} height={28} alt="" />
            <Text fw={700} visibleFrom="xs">{t('app.title')}</Text>
          </Group>
          <Group gap="xs" wrap="nowrap">
            <SegmentedControl size="xs" value={lang} onChange={(v) => setLang(v as 'az' | 'en')} data={[{ label: 'AZ', value: 'az' }, { label: 'EN', value: 'en' }]} />
            <Tooltip label={colorScheme === 'dark' ? 'Light' : 'Dark'}>
              <ActionIcon variant="default" onClick={toggleColorScheme} aria-label="Theme">
                {colorScheme === 'dark' ? <IconSun size={16} /> : <IconMoon size={16} />}
              </ActionIcon>
            </Tooltip>
            <Menu position="bottom-end" width={220}>
              <Menu.Target>
                <Group gap={8} style={{ cursor: 'pointer' }} wrap="nowrap">
                  <Avatar size="sm" color="blue" radius="xl">{user.fullName.slice(0, 1).toUpperCase()}</Avatar>
                  <Text size="sm" fw={500} visibleFrom="sm">{user.fullName}</Text>
                </Group>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Label><Group justify="space-between">{user.username}<RoleBadge role={user.role} /></Group></Menu.Label>
                <Menu.Item leftSection={<IconKey size={16} />} onClick={openChangePassword}>{t('auth.changePassword')}</Menu.Item>
                <Menu.Item color="red" leftSection={<IconLogout size={16} />} onClick={() => { logout(); navigate('/'); }}>{t('auth.signOut')}</Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="xs">
        {NAV.filter((n) => can(n.role)).map((n) => (
          <MNavLink key={n.to} component={NavLink} to={n.to} label={t(n.key)} leftSection={<n.icon size={18} />} active={isActive(n.to)} />
        ))}
      </AppShell.Navbar>

      <AppShell.Main>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/customers" element={<CustomersPage />} />
          <Route path="/customers/:id" element={<CustomerPage />} />
          <Route path="/loans" element={<LoansPage />} />
          <Route path="/loans/:id" element={<LoanPage />} />
          <Route path="/payments" element={<PaymentsPage />} />
          <Route path="/applications" element={<ApplicationsPage />} />
          <Route path="/products" element={<ProductsPage />} />
          {can('admin') && <Route path="/admins" element={<AdminsPage />} />}
          {can('admin') && <Route path="/audit" element={<AuditPage />} />}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AppShell.Main>
    </AppShell>
  );
}
