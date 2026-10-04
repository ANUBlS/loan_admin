import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { MantineProvider, createTheme } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { ModalsProvider } from '@mantine/modals';
import { DatesProvider } from '@mantine/dates';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@mantine/core/styles.css';
import '@mantine/dates/styles.css';
import '@mantine/notifications/styles.css';
import '@mantine/charts/styles.css';
import './styles.css';
import { I18nProvider, useI18n } from './i18n';
import { AuthProvider } from './auth';
import App from './App';

const theme = createTheme({
  primaryColor: 'blue',
  defaultRadius: 'md',
  fontFamily: 'Inter, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
  headings: { fontWeight: '650' },
});

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false, staleTime: 15_000 } },
});

function WithDates({ children }: { children: React.ReactNode }) {
  const { lang } = useI18n();
  return <DatesProvider settings={{ locale: lang, firstDayOfWeek: 1 }}>{children}</DatesProvider>;
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <MantineProvider theme={theme} defaultColorScheme="light">
      <I18nProvider>
        <WithDates>
          <QueryClientProvider client={queryClient}>
            <ModalsProvider>
              <Notifications position="top-right" />
              <AuthProvider>
                <BrowserRouter>
                  <App />
                </BrowserRouter>
              </AuthProvider>
            </ModalsProvider>
          </QueryClientProvider>
        </WithDates>
      </I18nProvider>
    </MantineProvider>
  </React.StrictMode>,
);
