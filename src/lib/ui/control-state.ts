export const CONTROL_VARIANT_CLASSES = {
  inactive:
    'border border-border/90 bg-card/55 text-muted-foreground shadow-sm hover:border-primary/50 hover:bg-secondary/75 hover:text-foreground',
  active:
    'border border-primary/70 bg-primary/20 text-primary shadow-[0_0_0_1px_hsl(var(--primary)/0.12)] hover:bg-primary/25',
} as const;

export const CONTROL_TOUCH_SIZE_CLASSES = {
  default: 'min-h-11 px-5 py-2',
  small: 'min-h-11 rounded-md px-4 py-2',
  large: 'min-h-12 rounded-lg px-8 py-3 text-base',
  icon: 'size-11',
} as const;
