import { useMemo, useState } from 'react';

import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
  useComboboxAnchor,
} from '@/components/ui/combobox';
import { InputGroupAddon } from '@/components/ui/input-group';
import { cn } from '@/lib/utils';

export type SelectComboboxOption = {
  value: string;
  label: string;
  /** Cor opcional exibida como círculo à esquerda (ex.: rua). */
  color?: string;
};

export const selectComboboxClassName =
  'h-[var(--control-height,2.5rem)] w-full min-w-0 rounded-xl border-2 border-zinc-200 bg-white text-sm font-medium leading-snug text-zinc-900 outline-none transition-colors focus-within:border-brand focus-within:ring-[3px] focus-within:ring-brand/35 disabled:cursor-not-allowed disabled:opacity-50';

const selectComboboxDarkClassName =
  'h-[var(--control-height,2.5rem)] w-full min-w-0 rounded-xl border-2 border-zinc-600 bg-zinc-800 text-sm font-medium leading-snug text-zinc-100 outline-none transition-colors focus-within:border-sky-500 focus-within:ring-[3px] focus-within:ring-sky-500/30 disabled:cursor-not-allowed disabled:opacity-50 [&_[data-slot=input-group-control]]:text-zinc-100 [&_[data-slot=input-group-control]]:placeholder:text-zinc-400 [&_svg]:text-zinc-300';

const selectComboboxDarkContentClassName =
  'border-zinc-600 bg-zinc-800 text-zinc-100 shadow-lg *:data-[slot=input-group]:border-zinc-600';

const selectComboboxDarkItemClassName =
  'text-zinc-100 data-highlighted:bg-zinc-700 data-highlighted:text-zinc-50';

export type SelectComboboxProps = {
  id?: string;
  value: string;
  onValueChange: (value: string) => void;
  options: SelectComboboxOption[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  /** Aparência para fundos escuros (ex.: monitor TV). */
  dark?: boolean;
  'aria-label'?: string;
  emptyMessage?: string;
  searchable?: boolean;
};

export function SelectCombobox({
  id,
  value,
  onValueChange,
  options,
  placeholder = 'Selecione…',
  disabled = false,
  className,
  dark = false,
  'aria-label': ariaLabel,
  emptyMessage = 'Nenhuma opção encontrada.',
  searchable,
}: SelectComboboxProps) {
  const anchorRef = useComboboxAnchor();
  const [search, setSearch] = useState('');
  const canSearch = searchable ?? options.length > 5;

  const labelByValue = useMemo(
    () => new Map(options.map((option) => [option.value, option.label])),
    [options],
  );

  const colorByValue = useMemo(
    () =>
      new Map(
        options
          .filter((option) => option.color)
          .map((option) => [option.value, option.color!]),
      ),
    [options],
  );

  const items = useMemo(() => options.map((option) => option.value), [options]);

  const itemToStringLabel = (item: string) =>
    labelByValue.get(item) ?? placeholder;

  const filteredItems = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('pt-BR');
    if (!canSearch || !query) return items;

    return items.filter((item) =>
      itemToStringLabel(item).toLocaleLowerCase('pt-BR').includes(query),
    );
  }, [canSearch, items, itemToStringLabel, search]);

  const selectedValue = items.includes(value) ? value : (items[0] ?? '');
  const selectedColor = colorByValue.get(selectedValue);

  return (
    <Combobox
      items={items}
      value={selectedValue}
      onValueChange={(nextValue) => {
        if (nextValue == null) return;
        onValueChange(nextValue);
        setSearch('');
      }}
      itemToStringLabel={itemToStringLabel}
      disabled={disabled}
    >
      <div ref={anchorRef} className="w-full min-w-0">
        <ComboboxInput
          id={id}
          placeholder={placeholder}
          aria-label={ariaLabel}
          disabled={disabled}
          readOnly={!canSearch}
          className={cn(
            dark ? selectComboboxDarkClassName : selectComboboxClassName,
            className,
            disabled && 'pointer-events-none opacity-50',
          )}
          onChange={(event) => setSearch(event.target.value)}
        >
          {selectedColor ? (
            <InputGroupAddon align="inline-start" className="pl-3">
              <span
                className={cn(
                  'size-3 shrink-0 rounded-full border',
                  dark ? 'border-zinc-500' : 'border-zinc-200',
                )}
                style={{ backgroundColor: selectedColor }}
                aria-hidden
              />
            </InputGroupAddon>
          ) : null}
        </ComboboxInput>
      </div>
      <ComboboxContent
        anchor={anchorRef}
        side="bottom"
        align="start"
        className={cn(
          'w-(--anchor-width)',
          dark && selectComboboxDarkContentClassName,
        )}
      >
        <ComboboxList>
          {filteredItems.map((item) => {
            const color = colorByValue.get(item);
            return (
              <ComboboxItem
                key={item}
                value={item}
                className={dark ? selectComboboxDarkItemClassName : undefined}
              >
                <span className="inline-flex min-w-0 items-center gap-2">
                  {color ? (
                    <span
                      className={cn(
                        'size-3 shrink-0 rounded-full border',
                        dark ? 'border-zinc-500' : 'border-zinc-200',
                      )}
                      style={{ backgroundColor: color }}
                      aria-hidden
                    />
                  ) : null}
                  <span className="truncate">{itemToStringLabel(item)}</span>
                </span>
              </ComboboxItem>
            );
          })}
          <ComboboxEmpty className={dark ? 'text-zinc-400' : undefined}>
            {emptyMessage}
          </ComboboxEmpty>
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}
