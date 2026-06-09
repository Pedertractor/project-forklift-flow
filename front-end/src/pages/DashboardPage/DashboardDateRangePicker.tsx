import { useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import { ptBR } from 'date-fns/locale';
import { Calendar as CalendarIcon, ChevronDownIcon } from 'lucide-react';
import type { DateRange } from 'react-day-picker';

import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

import {
  dashboardDateToIso,
  formatDashboardPeriodLabel,
  normalizeDashboardDate,
} from './dashboard-date-utils';

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
  const today = useMemo(() => normalizeDashboardDate(new Date()), []);
  const selectedRange = useMemo(() => datesToRange(dates), [dates]);

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
        className="w-fit overflow-hidden p-0"
        align="start"
        side="bottom"
        sideOffset={6}
        avoidCollisions={false}
      >
        <Calendar
          mode="range"
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
          captionLayout="dropdown"
          disabled={isFutureDate}
          defaultMonth={selectedRange?.from ?? today}
          locale={ptBR}
          numberOfMonths={1}
        />
      </PopoverContent>
    </Popover>
  );
}
