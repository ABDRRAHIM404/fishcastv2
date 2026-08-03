import { describe, expect, it } from 'vitest';
import {
  CONTROL_TOUCH_SIZE_CLASSES,
  CONTROL_VARIANT_CLASSES,
} from '@/lib/ui/control-state';

describe('shared interactive control states', () => {
  it('provides distinct active and inactive control treatments', () => {
    expect(CONTROL_VARIANT_CLASSES.inactive).toContain('border-border/90');
    expect(CONTROL_VARIANT_CLASSES.inactive).toContain(
      'hover:border-primary/50'
    );
    expect(CONTROL_VARIANT_CLASSES.active).toContain('border-primary/70');
    expect(CONTROL_VARIANT_CLASSES.active).toContain('bg-primary/20');
  });

  it('keeps compact controls at an approximately 44px touch target', () => {
    expect(CONTROL_TOUCH_SIZE_CLASSES.small).toContain('min-h-11');
    expect(CONTROL_TOUCH_SIZE_CLASSES.icon).toContain('size-11');
  });
});
