import { AppShell } from '@/components/shared/app-shell';
import { AuthStatus } from '@/components/shared/auth-status';

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // AuthStatus is an async server component; pass it as a slot so the
  // client-side AppShell can render it without becoming a server component.
  return <AppShell authSlot={<AuthStatus />}>{children}</AppShell>;
}
