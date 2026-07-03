import { useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { ptBR } from 'date-fns/locale';
import {
  Calendar as CalendarIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from 'lucide-react';
import type { DateRange } from 'react-day-picker';

import { Calendar, CalendarDayButton } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { SelectCombobox } from '@/components/ui/select-combobox';
import { cn } from '@/lib/utils';

import {
  dashboardDateToIso,
  formatDashboardPeriodLabel,
  normalizeDashboardDate,
} from './dashboard-date-utils';

const calendarComboboxClassName =
  'h-7! w-auto min-w-0 shrink-0 rounded-md! border! border-zinc-200! bg-white p-0 text-xs font-normal shadow-none focus-within:border-brand! focus-within:ring-2! focus-within:ring-brand/25! [&_[data-slot=input-group]]:h-7! [&_[data-slot=input-group]]:min-h-0! [&_[data-slot=input-group]]:rounded-md! [&_[data-slot=input-group]]:border-0! [&_[data-slot=input-group]]:bg-transparent! [&_[data-slot=input-group]]:shadow-none! [&_[data-slot=input-group]]:ring-0! [&_[data-slot=input-group-control]]:h-7! [&_[data-slot=input-group-control]]:px-1.5! [&_[data-slot=input-group-control]]:py-0! [&_[data-slot=input-group-control]]:text-xs! [&_[data-slot=input-group-addon]]:px-0.5! [&_[data-slot=input-group-addon]_svg]:size-3!';

type DashboardDateRangePickerProps = {
  dates: Date[];
  setDates: Dispatch<SetStateAction<Date[]>>;
  className?: string;
  id?: string;
};

function datesToRange(dates: Date[]): DateRange | undefined {
  const from = dates[0];
  if (!from) return undefined;

  const to = dates[dates.length - 1] ?? from;
  return { from, to };
}

function rangeToDates(range: DateRange | undefined): Date[] {
  if (!range?.from) return [];

  const from = normalizeDashboardDate(range.from);
  const to = normalizeDashboardDate(range.to ?? range.from);
  return [from, to];
}

export function DashboardDateRangePicker({
  dates,
  setDates,
  className,
  id = 'dashboard-period',
}: DashboardDateRangePickerProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const today = useMemo(() => normalizeDashboardDate(new Date()), []);
  const selectedRange = useMemo(() => datesToRange(dates), [dates]);
  const [month, setMonth] = useState<Date>(
    () => selectedRange?.from ?? today,
  );

  useEffect(() => {
    if (!open) {
      return;
    }
    setMonth(selectedRange?.from ?? today);
    triggerRef.current?.scrollIntoView({
      block: 'center',
      inline: 'nearest',
      behavior: 'smooth',
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const currentYear = today.getFullYear();
  const currentMonthStart = useMemo(
    () => new Date(currentYear, today.getMonth(), 1),
    [currentYear, today],
  );

  const clampMonth = (date: Date) =>
    date > currentMonthStart ? currentMonthStart : date;

  const monthOptions = useMemo(() => {
    const maxMonth = month.getFullYear() === currentYear ? today.getMonth() : 11;
    return Array.from({ length: maxMonth + 1 }, (_, index) => {
      const label = new Date(2000, index, 1)
        .toLocaleString('pt-BR', { month: 'short' })
        .replace('.', '');
      return {
        value: String(index),
        label: label.charAt(0).toUpperCase() + label.slice(1),
      };
    });
  }, [month, currentYear, today]);

  const yearOptions = useMemo(
    () =>
      Array.from({ length: 6 }, (_, index) => {
        const year = currentYear - index;
        return { value: String(year), label: String(year) };
      }),
    [currentYear],
  );

  const canGoNext =
    new Date(month.getFullYear(), month.getMonth(), 1) < currentMonthStart;

  const goToPreviousMonth = () => {
    setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    if (!canGoNext) return;
    setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1));
  };

  const handleMonthChange = (value: string) => {
    setMonth(clampMonth(new Date(month.getFullYear(), Number(value), 1)));
  };

  const handleYearChange = (value: string) => {
    setMonth(clampMonth(new Date(Number(value), month.getMonth(), 1)));
  };

  const formattedPeriod = useMemo(() => {
    if (dates.length === 0) return 'Selecione o período';

    const startIso = dashboardDateToIso(dates[0]);
    const endIso = dashboardDateToIso(dates[dates.length - 1] ?? dates[0]);
    return formatDashboardPeriodLabel(
      startIso,
      startIso === endIso ? null : endIso,
    );
  }, [dates]);

  const isFutureDate = (date: Date) => normalizeDashboardDate(date) > today;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          ref={triggerRef}
          type="button"
          id={id}
          className={cn(
            'inline-flex h-[var(--control-height,2.5rem)] w-full min-w-0 items-center justify-between gap-2 rounded-xl border-2 border-zinc-200 bg-white px-4 py-2 text-left text-sm font-medium text-zinc-900 transition-colors outline-none hover:bg-zinc-50 focus-visible:border-brand focus-visible:ring-[3px] focus-visible:ring-brand/35',
            className,
          )}
          aria-label="Filtrar por período"
          aria-expanded={open}
        >
          <span className="inline-flex min-w-0 items-center gap-2 truncate">
            <CalendarIcon
              className="size-4 shrink-0 text-zinc-500"
              aria-hidden
            />
            {formattedPeriod}
          </span>
          <ChevronDownIcon
            className="size-4 shrink-0 text-zinc-500"
            aria-hidden
          />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-fit! max-w-none p-2! shadow-sm"
        align="start"
        side="bottom"
        sideOffset={4}
      >
        <div className="mb-1 flex items-center justify-center gap-0.5">
          <button
            type="button"
            onClick={goToPreviousMonth}
            className="flex size-7 shrink-0 items-center justify-center rounded-md text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
            aria-label="Mês anterior"
          >
            <ChevronLeftIcon className="size-3.5" aria-hidden />
          </button>
          <SelectCombobox
            value={String(month.getMonth())}
            onValueChange={handleMonthChange}
            options={monthOptions}
            searchable={false}
            aria-label="Selecionar mês"
            className={cn(calendarComboboxClassName, 'w-[4.25rem]')}
          />
          <SelectCombobox
            value={String(month.getFullYear())}
            onValueChange={handleYearChange}
            options={yearOptions}
            searchable={false}
            aria-label="Selecionar ano"
            className={cn(calendarComboboxClassName, 'w-14')}
          />
          <button
            type="button"
            onClick={goToNextMonth}
            disabled={!canGoNext}
            className="flex size-7 shrink-0 items-center justify-center rounded-md text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 disabled:pointer-events-none disabled:opacity-40"
            aria-label="Próximo mês"
          >
            <ChevronRightIcon className="size-3.5" aria-hidden />
          </button>
        </div>
        <Calendar
          mode="range"
          month={month}
          onMonthChange={setMonth}
          hideNavigation
          selected={selectedRange}
          onSelect={(range) => {
            if (!range?.from || isFutureDate(range.from)) return;

            if (range.to) {
              if (isFutureDate(range.to)) return;
              setDates(rangeToDates(range));
              setOpen(false);
              return;
            }

            setDates([normalizeDashboardDate(range.from)]);
          }}
          disabled={isFutureDate}
          locale={ptBR}
          numberOfMonths={1}
          className="border-0 p-0 shadow-none [--cell-size:2rem]"
          classNames={{
            months: 'flex flex-col',
            month: 'flex flex-col gap-1',
            month_caption: 'hidden',
            weekdays: 'flex',
            weekday: 'w-(--cell-size) text-[0.65rem] font-normal text-zinc-500',
            week: 'mt-0.5 flex w-full',
            day: 'flex size-(--cell-size) items-center justify-center p-0',
          }}
          components={{
            DayButton: ({ className, ...dayButtonProps }) => (
              <CalendarDayButton
                {...dayButtonProps}
                className={cn(
                  className,
                  'size-[1.6rem]! aspect-auto min-h-0 min-w-0 gap-0 rounded-md! p-0 text-[0.7rem] leading-none',
                  'data-[range-middle=true]:bg-brand/10! data-[range-middle=true]:text-zinc-900!',
                  'data-[range-start=true]:bg-brand! data-[range-start=true]:text-white!',
                  'data-[range-end=true]:bg-brand! data-[range-end=true]:text-white!',
                  'data-[selected-single=true]:bg-brand! data-[selected-single=true]:text-white!',
                )}
              />
            ),
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
