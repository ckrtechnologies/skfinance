import './globals.css';
import StoreProvider from '@/store/StoreProvider';
import AdminShell from '@/components/layout/AdminShell';

export const metadata = {
  title: 'SK Finance — Admin Panel',
  description: 'Shreeja Finance Platform — Internal Admin Dashboard',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>
        <StoreProvider>
          <AdminShell>{children}</AdminShell>
        </StoreProvider>
      </body>
    </html>
  );
}
