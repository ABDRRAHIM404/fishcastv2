'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MotionConfig } from 'framer-motion';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Fish,
  Heart,
  Home,
  Map,
  MapPin,
  Menu,
  X,
  type LucideIcon,
} from 'lucide-react';
import { siteConfig } from '@/config/site';
import { LanguageSelector } from '@/components/shared/language-selector';
import { useI18n } from '@/i18n/provider';
import {
  DESKTOP_NAVIGATION,
  MOBILE_MORE_NAVIGATION,
  MOBILE_PRIMARY_NAVIGATION,
  isNavigationActive,
  parseShellPreference,
  type NavigationDestination,
  type NavigationIcon,
} from '@/lib/navigation/config';
import { cn } from '@/lib/utils';

const SHELL_PREFERENCE_KEY = 'fishcast:application-shell:v1';

const ICONS: Readonly<Record<NavigationIcon, LucideIcon>> = {
  home: Home,
  forecast: CalendarDays,
  map: Map,
  spots: MapPin,
  species: Fish,
  favorites: Heart,
};

function NavigationLink({
  item,
  pathname,
  compact = false,
  onNavigate,
}: {
  item: NavigationDestination;
  pathname: string;
  compact?: boolean;
  onNavigate?: () => void;
}) {
  const { t } = useI18n();
  const Icon = ICONS[item.icon];
  const active = isNavigationActive(pathname, item);
  const label = t(item.label === 'favorites' ? 'nav.favourites' : `nav.${item.label}`);
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? 'page' : undefined}
      aria-label={label}
      title={label}
      className={cn(
        'flex min-h-11 items-center gap-3 rounded-lg border px-3 text-sm font-medium text-muted-foreground shadow-sm transition-[background-color,border-color,color,transform] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:translate-y-px',
        'justify-center xl:justify-start',
        compact && 'px-2 xl:justify-center',
        active
          ? 'border-primary/65 bg-primary/20 text-primary'
          : 'border-transparent bg-card/30 hover:border-primary/40 hover:bg-secondary/70 hover:text-foreground'
      )}
    >
      <Icon className="size-5 shrink-0" aria-hidden />
      {!compact ? <span className="hidden xl:inline">{label}</span> : null}
    </Link>
  );
}

/**
 * Responsive application frame: desktop sidebar, tablet icon rail, and a
 * five-destination mobile bottom bar with a real-page More drawer.
 */
export function AppShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { direction, t } = useI18n();
  const [collapsed, setCollapsed] = useState(false);
  const [preferenceLoaded, setPreferenceLoaded] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const moreButtonRef = useRef<HTMLButtonElement>(null);

  function closeMoreMenu(restoreFocus = true) {
    setMoreOpen(false);
    if (restoreFocus) {
      window.requestAnimationFrame(() => moreButtonRef.current?.focus());
    }
  }

  useEffect(() => {
    setCollapsed(
      parseShellPreference(localStorage.getItem(SHELL_PREFERENCE_KEY)).collapsed
    );
    setPreferenceLoaded(true);
  }, []);

  useEffect(() => {
    if (!preferenceLoaded) return;
    try {
      localStorage.setItem(
        SHELL_PREFERENCE_KEY,
        JSON.stringify({ version: 1, collapsed })
      );
    } catch {
      // Storage restrictions never block navigation.
    }
  }, [collapsed, preferenceLoaded]);

  useEffect(() => {
    if (!moreOpen) return;
    closeButtonRef.current?.focus();
    const handleDialogKeys = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeMoreMenu();
        return;
      }
      if (event.key !== 'Tab') return;
      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled])'
      );
      if (!focusable || focusable.length === 0) return;
      const first = focusable[0]!;
      const last = focusable[focusable.length - 1]!;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', handleDialogKeys);
    return () => window.removeEventListener('keydown', handleDialogKeys);
  }, [moreOpen]);

  const widePage =
    pathname === '/' || /^\/spots\/[^/]+/.test(pathname) || pathname === '/map';
  const mobileMoreActive = MOBILE_MORE_NAVIGATION.some((item) =>
    isNavigationActive(pathname, item)
  );

  return (
    <MotionConfig reducedMotion="user">
      <a
        href="#main-content"
        className="sr-only z-[100] rounded-md bg-primary px-4 py-3 text-primary-foreground focus:not-sr-only focus:fixed focus:top-3 focus:[inset-inline-start:0.75rem]"
      >
        {t('nav.skip')}
      </a>
      <div className="flex min-h-dvh min-w-0">
        <aside
          className={cn(
            'sticky top-0 hidden h-dvh shrink-0 flex-col border-border/70 bg-card/55 p-3 backdrop-blur-md [border-inline-end-width:1px] md:flex',
            collapsed ? 'w-20' : 'w-20 xl:w-60'
          )}
        >
          <Link
            href="/"
            aria-label={siteConfig.name}
            className={cn(
              'flex h-12 items-center gap-3 rounded-lg px-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              collapsed && 'justify-center'
            )}
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
              <Fish className="size-5" aria-hidden />
            </span>
            {!collapsed ? (
              <span className="hidden font-display text-lg font-semibold tracking-tight xl:block">
                {siteConfig.name}
              </span>
            ) : null}
          </Link>

          <nav className="mt-6 flex flex-1 flex-col gap-1" aria-label={t('nav.primary')}>
            {DESKTOP_NAVIGATION.map((item) => (
              <NavigationLink
                key={item.href}
                item={item}
                pathname={pathname}
                compact={collapsed}
              />
            ))}
          </nav>

          <LanguageSelector compact={collapsed} className="mb-2" />

          <button
            type="button"
            onClick={() => setCollapsed((value) => !value)}
            className="hidden min-h-11 items-center justify-center gap-2 rounded-lg border border-border/80 bg-card/35 px-3 text-sm text-muted-foreground shadow-sm hover:border-primary/45 hover:bg-secondary/70 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:translate-y-px xl:flex"
            aria-label={collapsed ? t('nav.expandSidebar') : t('nav.collapseSidebar')}
          >
            {collapsed ? (
              direction === 'rtl' ? <ChevronLeft aria-hidden /> : <ChevronRight aria-hidden />
            ) : direction === 'rtl' ? <ChevronRight aria-hidden /> : <ChevronLeft aria-hidden />}
            {!collapsed ? <span>{t('nav.collapse')}</span> : null}
          </button>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur-md md:hidden">
            <div className="flex h-16 items-center px-4">
              <Link href="/" className="flex items-center gap-2 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <span className="flex size-9 items-center justify-center rounded-lg bg-primary/15 text-primary">
                  <Fish className="size-5" aria-hidden />
                </span>
                <span className="font-display text-lg font-semibold tracking-tight">
                  {siteConfig.name}
                </span>
              </Link>
            </div>
          </header>

          <main
            id="main-content"
            tabIndex={-1}
            className={cn(
              'mx-auto w-full min-w-0 flex-1 px-4 py-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))] focus:outline-none sm:px-6 sm:py-6 md:pb-8 lg:px-8',
              widePage ? 'max-w-[1800px]' : 'max-w-7xl'
            )}
          >
            {children}
          </main>
        </div>

        {moreOpen ? (
          <div className="fixed inset-0 z-50 md:hidden">
            <button
              type="button"
              aria-label={t('nav.close')}
              className="absolute inset-0 bg-background/75 backdrop-blur-sm"
              onClick={() => closeMoreMenu()}
            />
            <div
              id="mobile-more-menu"
              ref={dialogRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby="mobile-more-title"
              className="absolute inset-x-3 bottom-[calc(5rem+env(safe-area-inset-bottom))] rounded-2xl border border-border bg-card p-4 shadow-premium"
            >
              <div className="flex items-center justify-between">
                <h2 id="mobile-more-title" className="font-display text-h3">{t('nav.more')}</h2>
                <button
                  ref={closeButtonRef}
                  type="button"
                  onClick={() => closeMoreMenu()}
                  className="flex size-11 items-center justify-center rounded-lg hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label={t('nav.closeMore')}
                >
                  <X aria-hidden />
                </button>
              </div>
              <nav className="mt-3 grid gap-2" aria-label={t('nav.moreDestinations')}>
                {MOBILE_MORE_NAVIGATION.map((item) => (
                  <NavigationLink key={item.href} item={item} pathname={pathname} onNavigate={() => closeMoreMenu(false)} />
                ))}
              </nav>
              <LanguageSelector className="mt-3" />
            </div>
          </div>
        ) : null}

        <nav
          className="fixed inset-x-0 bottom-0 z-40 border-t border-border/70 bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden"
          aria-label={t('nav.mobile')}
        >
          <div className="grid h-16 grid-cols-5 px-1">
            {MOBILE_PRIMARY_NAVIGATION.map((item) => {
              const Icon = ICONS[item.icon];
              const active = isNavigationActive(pathname, item);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'm-1 flex min-h-11 flex-col items-center justify-center gap-0.5 rounded-md border border-transparent text-[0.7rem] font-medium text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:translate-y-px',
                    active && 'border-primary/45 bg-primary/15 text-primary'
                  )}
                >
                  <Icon className="size-5" aria-hidden />
                  {item.label === 'home'
                    ? t('nav.home')
                    : t(item.label === 'favorites' ? 'nav.favourites' : `nav.${item.label}`)}
                </Link>
              );
            })}
            <button
              ref={moreButtonRef}
              type="button"
              aria-expanded={moreOpen}
              aria-controls="mobile-more-menu"
              onClick={() => setMoreOpen(true)}
              className={cn(
                'm-1 flex min-h-11 flex-col items-center justify-center gap-0.5 rounded-md border border-transparent text-[0.7rem] font-medium text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:translate-y-px',
                mobileMoreActive && 'border-primary/45 bg-primary/15 text-primary'
              )}
            >
              <Menu className="size-5" aria-hidden />
              {t('nav.more')}
            </button>
          </div>
        </nav>
      </div>
    </MotionConfig>
  );
}
