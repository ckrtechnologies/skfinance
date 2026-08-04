import '@mantine/core/styles.css';
import '@mantine/charts/styles.css';
import './globals.css';
import { ColorSchemeScript, MantineProvider, createTheme } from '@mantine/core';
import StoreProvider from '@/store/StoreProvider';
import AdminShell from '@/components/layout/AdminShell';

export const metadata = {
  title: 'SK Finance — Admin Panel',
  description: 'Shreeja Finance Platform — Internal Admin Dashboard',
};

const theme = createTheme({
  primaryColor: 'blue',
  defaultRadius: 'md',
  fontFamily: 'Inter, system-ui, sans-serif',
  fontSizes: {
    xs: '0.65rem',
    sm: '0.75rem',
    md: '0.85rem',
    lg: '1rem',
    xl: '1.15rem',
  },
  spacing: {
    xs: '0.5rem',
    sm: '0.75rem',
    md: '1rem',
    lg: '1.25rem',
    xl: '1.75rem',
  }
});

export default function RootLayout({ children }) {
  return (
    <html lang="en" data-mantine-color-scheme="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <ColorSchemeScript defaultColorScheme="dark" />
      </head>
      <body>
        <MantineProvider theme={theme} defaultColorScheme="dark">
          <StoreProvider>
            <AdminShell>{children}</AdminShell>
          </StoreProvider>
        </MantineProvider>
      </body>
    </html>
  );
}
