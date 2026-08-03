import { cloneElement, forwardRef, isValidElement, type ReactElement } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import {
  CONTROL_TOUCH_SIZE_CLASSES,
  CONTROL_VARIANT_CLASSES,
} from '@/lib/ui/control-state';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-[background-color,border-color,color,box-shadow,opacity,transform] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50 disabled:active:translate-y-0 aria-busy:cursor-wait aria-busy:opacity-75 [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default:
          'bg-primary text-primary-foreground shadow-glow hover:bg-primary/90',
        secondary:
          'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        outline:
          'border border-border bg-transparent hover:bg-secondary/60 hover:text-foreground',
        ghost: 'hover:bg-secondary/60 hover:text-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
        control: CONTROL_VARIANT_CLASSES.inactive,
        controlActive: CONTROL_VARIANT_CLASSES.active,
      },
      size: {
        default: CONTROL_TOUCH_SIZE_CLASSES.default,
        sm: CONTROL_TOUCH_SIZE_CLASSES.small,
        lg: CONTROL_TOUCH_SIZE_CLASSES.large,
        icon: CONTROL_TOUCH_SIZE_CLASSES.icon,
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, children, ...props }, ref) => {
    const buttonClassName = cn(buttonVariants({ variant, size, className }));

    if (asChild && isValidElement(children)) {
      return cloneElement(children as ReactElement<Record<string, unknown>>, {
        ...props,
        className: cn(
          (children as ReactElement<Record<string, unknown>>).props.className as string,
          buttonClassName
        ),
      });
    }

    return (
      <button ref={ref} className={buttonClassName} {...props}>
        {children}
      </button>
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
