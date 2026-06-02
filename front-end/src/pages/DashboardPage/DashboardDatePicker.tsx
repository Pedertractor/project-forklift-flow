import { useMemo, useState } from 'react';
import { Calendar as CalendarIcon, ChevronDownIcon } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

function normalizeDate(date: Date) {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  return normalized;
}

function isoToDate(isoDate: string): Date | undefined {
  const [year, month, day] = isoDate.split('-').map(Number);
  if (!year || !month || !day) return undefined;
  return new Date(year, month - 1, day);
}

function dateToIso(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

type DashboardDatePickerProps = {
  value: string;
  onChange: (isoDate: string) => void;
  className?: string;
  id?: string;
};

export function DashboardDatePicker({
  value,
  onChange,
  className,
  id = 'dashboard-date',
}: DashboardDatePickerProps) {
  const [open, setOpen] = useState(false);
  const today = useMemo(() => normalizeDate(new Date()), []);
  const selectedDate = useMemo(() => isoToDate(value), [value]);

  const formattedDate = selectedDate
    ? selectedDate.toLocaleDateString('pt-BR')
    : 'Selecione a data';

  const isFutureDate = (date: Date) => normalizeDate(date) > today;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          id={id}
          variant="outline"
          className={cn(
            'h-[var(--control-height,2.5rem)] w-full min-w-0 justify-between gap-2 rounded-xl border-2 border-zinc-200 bg-white px-4 py-2 text-left text-sm font-medium text-zinc-900 hover:bg-zinc-50',
            className,
          )}
          aria-label="Filtrar por data"
        >
          <span className="inline-flex min-w-0 items-center gap-2 truncate">
            <CalendarIcon className="size-4 shrink-0 text-zinc-500" aria-hidden />
            {formattedDate}
          </span>
          <ChevronDownIcon className="size-4 shrink-0 text-zinc-500" aria-hidden />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-fit overflow-hidden p-0" align="start">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={(date) => {
            if (!date || isFutureDate(date)) return;
            onChange(dateToIso(date));
            setOpen(false);
          }}
          captionLayout="dropdown"
          disabled={isFutureDate}
          defaultMonth={selectedDate ?? today}
        />
      </PopoverContent>
    </Popover>
  );
}
