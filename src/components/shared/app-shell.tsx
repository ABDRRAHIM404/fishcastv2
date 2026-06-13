'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Fish } from 'lucide-react';
import { mainNav, siteConfig } from '@/config/site';
import { cn } from '@/lib/utils';

/**
 * Responsive, mobile-first app shell.
 * - Top bar with brand on all viewports.
 * - Desktop: inline nav in the header.
 * - Mobile: fixed bottom tab bar.
 */
export function AppShell({
  children,
  authSlot,
}: {
  children: React.ReactNode;
  authSlot?: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/70 backdrop-blur-md">
        <div className="container flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex size-9 items-center justify-center rounded-lg bg-primary/15 text-primary">
              <Fish className="size-5" />
            </span>
            <span className="font-display text-lg font-semibold tracking-tight">
              {siteConfig.name}
            </span>
          </Link>
          <nav className="hidden items-center gap-1 sm:flex">
            {mainNav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground',
                  pathname.startsWith(item.href) && 'text-foreground'
                )}
              >
                {item.title}
              </Link>
            ))}
            {authSlot}
          </nav>
        </div>
      </header>

      <main className="container flex-1 py-6 pb-24 sm:pb-10">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border/70 bg-background/80 backdrop-blur-md sm:hidden">
        <div className="container flex h-16 items-center justify-around">
          {mainNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-1 flex-col items-center gap-1 py-2 text-caption text-muted-foreground transition-colors',
                pathname.startsWith(item.href) && 'text-primary'
              )}
            >
              {item.title}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
