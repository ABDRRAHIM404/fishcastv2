import { LoginClient } from '@/app/(auth)/login/login-client';

export const metadata = { title: 'Sign in' };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{
    redirectTo?: string;
    error?: string;
    message?: string;
  }>;
}) {
  const { redirectTo = '/', error, message } = await searchParams;

  return (
    <LoginClient
      redirectTo={redirectTo}
      error={error}
      message={message}
    />
  );
}