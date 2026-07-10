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

export type SelectComboboxProps = {
  id?: string;
  value: string;
  onValueChange: (value: string) => void;
  options: SelectComboboxOption[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
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
      <div ref={anchorRef} className={cn('w-full min-w-0', className)}>
        <ComboboxInput
          id={id}
          placeholder={placeholder}
          aria-label={ariaLabel}
          disabled={disabled}
          readOnly={!canSearch}
          className={cn(
            selectComboboxClassName,
            disabled && 'pointer-events-none opacity-50',
          )}
          onChange={(event) => setSearch(event.target.value)}
        >
          {selectedColor ? (
            <InputGroupAddon align="inline-start" className="pl-3">
              <span
                className="size-3 shrink-0 rounded-full border border-zinc-200"
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
        className="w-(--anchor-width)"
      >
        <ComboboxList>
          {filteredItems.map((item) => {
            const color = colorByValue.get(item);
            return (
              <ComboboxItem key={item} value={item}>
                <span className="inline-flex min-w-0 items-center gap-2">
                  {color ? (
                    <span
                      className="size-3 shrink-0 rounded-full border border-zinc-200"
                      style={{ backgroundColor: color }}
                      aria-hidden
                    />
                  ) : null}
                  <span className="truncate">{itemToStringLabel(item)}</span>
                </span>
              </ComboboxItem>
            );
          })}
          <ComboboxEmpty>{emptyMessage}</ComboboxEmpty>
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}
