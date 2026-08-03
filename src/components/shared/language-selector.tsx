'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, Globe2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  LOCALE_SHORT_LABEL,
  SUPPORTED_LOCALES,
  type Locale,
} from '@/i18n/config';
import { useI18n } from '@/i18n/provider';
import { cn } from '@/lib/utils';

const LANGUAGE_KEYS: Readonly<Record<Locale, 'locale.english' | 'locale.french' | 'locale.arabic'>> = {
  en: 'locale.english',
  fr: 'locale.french',
  ar: 'locale.arabic',
};

export function LanguageSelector({
  compact = false,
  className,
}: {
  compact?: boolean;
  className?: string;
}) {
  const { locale, direction, t, setLocale } = useI18n();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);

  function close(restoreFocus = true) {
    setOpen(false);
    if (restoreFocus) {
      window.requestAnimationFrame(() => buttonRef.current?.focus());
    }
  }

  function focusOption(index: number) {
    const normalized = (index + SUPPORTED_LOCALES.length) % SUPPORTED_LOCALES.length;
    optionRefs.current[normalized]?.focus();
  }

  useEffect(() => {
    if (!open) return;
    focusOption(SUPPORTED_LOCALES.indexOf(locale));
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) close(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [locale, open]);

  function handleMenuKey(event: React.KeyboardEvent<HTMLDivElement>) {
    const activeIndex = optionRefs.current.findIndex(
      (option) => option === document.activeElement
    );
    if (event.key === 'Escape') {
      event.stopPropagation();
      close();
    } else if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
      event.preventDefault();
      focusOption(activeIndex + (direction === 'rtl' && event.key === 'ArrowRight' ? -1 : 1));
    } else if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
      event.preventDefault();
      focusOption(activeIndex + (direction === 'rtl' && event.key === 'ArrowLeft' ? 1 : -1));
    } else if (event.key === 'Home') {
      event.preventDefault();
      focusOption(0);
    } else if (event.key === 'End') {
      event.preventDefault();
      focusOption(SUPPORTED_LOCALES.length - 1);
    }
  }

  return (
    <div ref={rootRef} className={cn('relative', className)}>
      <Button
        ref={buttonRef}
        type="button"
        variant="control"
        size={compact ? 'sm' : 'default'}
        aria-label={t('locale.selectorCurrent', {
          language: t(LANGUAGE_KEYS[locale]),
        })}
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((value) => !value)}
        className={cn('w-full justify-center', !compact && 'justify-between')}
      >
        <span className="inline-flex items-center gap-2">
          <Globe2 className="size-4" aria-hidden />
          <span>{LOCALE_SHORT_LABEL[locale]}</span>
        </span>
        {!compact ? <ChevronDown className="size-4" aria-hidden /> : null}
      </Button>

      {open ? (
        <div
          role="menu"
          aria-label={t('locale.menuLabel')}
          onKeyDown={handleMenuKey}
          className="absolute bottom-[calc(100%+0.5rem)] z-[80] min-w-48 rounded-xl border border-border bg-popover p-1.5 text-popover-foreground shadow-premium [inset-inline-start:0]"
        >
          {SUPPORTED_LOCALES.map((option, index) => (
            <button
              key={option}
              ref={(node) => {
                optionRefs.current[index] = node;
              }}
              type="button"
              role="menuitemradio"
              aria-checked={locale === option}
              lang={option}
              dir={option === 'ar' ? 'rtl' : 'ltr'}
              onClick={() => {
                close();
                setLocale(option);
              }}
              className="flex min-h-11 w-full items-center justify-between gap-4 rounded-lg px-3 py-2 text-start text-sm hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span>{t(LANGUAGE_KEYS[option])}</span>
              {locale === option ? <Check className="size-4" aria-hidden /> : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
