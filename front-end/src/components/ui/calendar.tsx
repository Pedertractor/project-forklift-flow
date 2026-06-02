import * as React from 'react';
import {
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from 'lucide-react';
import { DayButton, DayPicker, getDefaultClassNames } from 'react-day-picker';

import { cn } from '@/lib/utils';

const ghostButtonClass =
  'inline-flex shrink-0 items-center justify-center rounded-xl border-2 border-transparent font-medium whitespace-nowrap transition-colors outline-none select-none text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50';

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  captionLayout = 'label',
  formatters,
  components,
  ...props
}: React.ComponentProps<typeof DayPicker>) {
  const defaultClassNames = getDefaultClassNames();

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn(
        'group/calendar bg-background p-3 [--cell-size:2rem] [[data-slot=popover-content]_&]:bg-transparent',
        String.raw`rtl:**:[.rdp-button\_next>svg]:rotate-180`,
        String.raw`rtl:**:[.rdp-button\_previous>svg]:rotate-180`,
        className,
      )}
      captionLayout={captionLayout}
      formatters={{
        formatMonthDropdown: (date) =>
          date.toLocaleString('pt-BR', { month: 'short' }),
        ...formatters,
      }}
      classNames={{
        root: cn('w-fit', defaultClassNames.root),
        months: cn(
          'relative flex flex-col gap-4 md:flex-row',
          defaultClassNames.months,
        ),
        month: cn('flex w-full flex-col gap-4', defaultClassNames.month),
        nav: cn(
          'absolute inset-x-0 top-0 flex w-full items-center justify-between gap-1',
          defaultClassNames.nav,
        ),
        button_previous: cn(
          ghostButtonClass,
          'size-(--cell-size) p-0 select-none aria-disabled:opacity-50',
          defaultClassNames.button_previous,
        ),
        button_next: cn(
          ghostButtonClass,
          'size-(--cell-size) p-0 select-none aria-disabled:opacity-50',
          defaultClassNames.button_next,
        ),
        month_caption: cn(
          'flex h-(--cell-size) w-full items-center justify-center px-(--cell-size)',
          defaultClassNames.month_caption,
        ),
        dropdowns: cn(
          'flex h-(--cell-size) w-full items-center justify-center gap-1.5 text-sm font-medium',
          defaultClassNames.dropdowns,
        ),
        dropdown_root: cn(
          'relative rounded-md border border-zinc-200 shadow-xs has-focus:border-brand has-focus:ring-[3px] has-focus:ring-brand/35',
          defaultClassNames.dropdown_root,
        ),
        dropdown: cn(
          'absolute inset-0 bg-white opacity-0',
          defaultClassNames.dropdown,
        ),
        caption_label: cn(
          'select-none font-medium',
          captionLayout === 'label'
            ? 'text-sm'
            : 'flex h-8 items-center gap-1 rounded-md pr-1 pl-2 text-sm [&>svg]:size-3.5 [&>svg]:text-zinc-500',
          defaultClassNames.caption_label,
        ),
        table: 'w-full border-collapse',
        weekdays: cn('flex', defaultClassNames.weekdays),
        weekday: cn(
          'flex-1 rounded-md text-[0.8rem] font-normal text-zinc-500 select-none',
          defaultClassNames.weekday,
        ),
        week: cn('mt-2 flex w-full', defaultClassNames.week),
        week_number_header: cn(
          'w-(--cell-size) select-none',
          defaultClassNames.week_number_header,
        ),
        week_number: cn(
          'text-[0.8rem] text-zinc-500 select-none',
          defaultClassNames.week_number,
        ),
        day: cn(
          'group/day relative aspect-square w-full p-0 text-center select-none [&:first-child[data-selected=true]_button]:rounded-l-md [&:last-child[data-selected=true]_button]:rounded-r-md',
          defaultClassNames.day,
        ),
        range_start: cn('rounded-l-md bg-zinc-100', defaultClassNames.range_start),
        range_middle: cn('rounded-none', defaultClassNames.range_middle),
        range_end: cn('rounded-r-md bg-zinc-100', defaultClassNames.range_end),
        today: cn(
          'rounded-md bg-zinc-100 text-zinc-900 data-[selected=true]:rounded-none',
          defaultClassNames.today,
        ),
        outside: cn(
          'text-zinc-400 aria-selected:text-zinc-400',
          defaultClassNames.outside,
        ),
        disabled: cn('text-zinc-400 opacity-50', defaultClassNames.disabled),
        hidden: cn('invisible', defaultClassNames.hidden),
        ...classNames,
      }}
      components={{
        Root: ({ className, rootRef, ...rootProps }) => (
          <div
            data-slot="calendar"
            ref={rootRef}
            className={cn(className)}
            {...rootProps}
          />
        ),
        Chevron: ({ className, orientation, ...chevronProps }) => {
          if (orientation === 'left') {
            return (
              <ChevronLeftIcon
                className={cn('size-4', className)}
                {...chevronProps}
              />
            );
          }

          if (orientation === 'right') {
            return (
              <ChevronRightIcon
                className={cn('size-4', className)}
                {...chevronProps}
              />
            );
          }

          return (
            <ChevronDownIcon className={cn('size-4', className)} {...chevronProps} />
          );
        },
        DayButton: CalendarDayButton,
        WeekNumber: ({ children, ...weekProps }) => (
          <td {...weekProps}>
            <div className="flex size-(--cell-size) items-center justify-center text-center">
              {children}
            </div>
          </td>
        ),
        ...components,
      }}
      {...props}
    />
  );
}

function CalendarDayButton({
  className,
  day,
  modifiers,
  ...props
}: React.ComponentProps<typeof DayButton>) {
  const defaultClassNames = getDefaultClassNames();
  const ref = React.useRef<HTMLButtonElement>(null);

  React.useEffect(() => {
    if (modifiers.focused) ref.current?.focus();
  }, [modifiers.focused]);

  return (
    <button
      ref={ref}
      type="button"
      data-day={day.date.toLocaleDateString()}
      data-selected-single={
        modifiers.selected &&
        !modifiers.range_start &&
        !modifiers.range_end &&
        !modifiers.range_middle
      }
      data-range-start={modifiers.range_start}
      data-range-end={modifiers.range_end}
      data-range-middle={modifiers.range_middle}
      className={cn(
        ghostButtonClass,
        'flex aspect-square size-auto w-full min-w-(--cell-size) flex-col gap-1 text-sm leading-none font-normal group-data-[focused=true]/day:relative group-data-[focused=true]/day:z-10 group-data-[focused=true]/day:border-brand group-data-[focused=true]/day:ring-[3px] group-data-[focused=true]/day:ring-brand/35 data-[range-end=true]:rounded-md data-[range-end=true]:rounded-r-md data-[range-middle=true]:rounded-none data-[range-start=true]:rounded-md data-[range-start=true]:rounded-l-md data-[selected-single=true]:rounded-md data-[selected-single=true]:bg-brand data-[selected-single=true]:text-white [&>span]:text-xs [&>span]:opacity-70',
        defaultClassNames.day,
        className,
      )}
      {...props}
    />
  );
}

export { Calendar, CalendarDayButton };
