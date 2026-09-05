import type { ElementType, ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';

/**
 * Glass surfaces, three levels deep:
 *   1 resting  — cards, rails, chips
 *   2 floating — header, dropdowns, toolbars
 *   3 modal    — dialogs, sheets, the player rail
 */
export function GlassPanel({
  level = 1,
  as: Tag = 'div',
  hairline = false,
  className,
  children,
}: {
  level?: 1 | 2 | 3;
  as?: ElementType;
  /** Adds the bevelled top highlight. Reads best on wide surfaces. */
  hairline?: boolean;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <Tag
      className={cn(
        level === 1 && 'glass-1',
        level === 2 && 'glass-2',
        level === 3 && 'glass-3',
        hairline && 'hairline-top',
        'rounded-2xl',
        className,
      )}
    >
      {children}
    </Tag>
  );
}
