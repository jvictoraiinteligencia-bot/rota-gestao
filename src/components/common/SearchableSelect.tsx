import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Search } from 'lucide-react';

const normalizeSearch = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .toLowerCase();

interface SearchableSelectProps<T> {
  items: T[];
  value: string;
  onChange: (key: string) => void;
  getKey: (item: T) => string;
  getSearchText: (item: T) => string;
  renderOption: (item: T) => React.ReactNode;
  renderSelected?: (item: T) => React.ReactNode;
  placeholder: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  disabledText?: string;
}

export function SearchableSelect<T>({
  items,
  value,
  onChange,
  getKey,
  getSearchText,
  renderOption,
  renderSelected,
  placeholder,
  searchPlaceholder = 'Buscar...',
  disabled = false,
  disabledText,
}: SearchableSelectProps<T>) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const selectedItem = items.find((item) => getKey(item) === value);

  const filteredItems = useMemo(() => {
    const q = normalizeSearch(query.trim());
    if (!q) return items;
    return items.filter((item) => normalizeSearch(getSearchText(item)).includes(q));
  }, [items, query, getSearchText]);

  useEffect(() => {
    if (disabled) setOpen(false);
  }, [disabled]);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setQuery('');
    const selectedIndex = items.findIndex((item) => getKey(item) === value);
    setActiveIndex(selectedIndex >= 0 ? selectedIndex : 0);
  }, [open]);

  useEffect(() => {
    if (open) optionRefs.current[activeIndex]?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex, open]);

  const selectItem = (key: string) => {
    onChange(key);
    setOpen(false);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, filteredItems.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const item = filteredItems[activeIndex];
      if (item) selectItem(getKey(item));
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={`w-full text-left text-xs border rounded-md px-3 py-2 flex items-center justify-between gap-2 transition-colors ${
          disabled
            ? 'bg-slate-100 border-slate-200 cursor-not-allowed'
            : open
              ? 'bg-white border-blue-500 ring-1 ring-blue-500'
              : 'bg-white border-slate-300 hover:border-slate-400'
        }`}
      >
        {disabled ? (
          <span className="text-slate-400 italic">{disabledText || placeholder}</span>
        ) : selectedItem ? (
          <div className="min-w-0 flex-1">{(renderSelected || renderOption)(selectedItem)}</div>
        ) : (
          <span className="text-slate-400 font-medium">{placeholder}</span>
        )}
        <ChevronDown
          size={16}
          className={`shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="absolute z-20 mt-1 w-full bg-white border border-slate-200 rounded-md shadow-lg overflow-hidden">
          <div className="p-2 border-b border-slate-100 relative">
            <Search size={13} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              autoFocus
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setActiveIndex(0);
              }}
              onKeyDown={handleSearchKeyDown}
              placeholder={searchPlaceholder}
              className="w-full text-xs pl-7 pr-2 py-1.5 border border-slate-200 rounded text-slate-800 placeholder-slate-400 focus:outline-blue-600"
            />
          </div>

          <div role="listbox" className="max-h-64 overflow-y-auto divide-y divide-slate-100">
            {filteredItems.length === 0 ? (
              <div className="px-3 py-4 text-center text-xs text-slate-400">Nenhum resultado encontrado.</div>
            ) : (
              filteredItems.map((item, index) => {
                const key = getKey(item);
                const isSelected = key === value;
                return (
                  <button
                    key={key}
                    ref={(el) => {
                      optionRefs.current[index] = el;
                    }}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => selectItem(key)}
                    onMouseEnter={() => setActiveIndex(index)}
                    className={`w-full text-left px-3 py-2 text-xs flex items-start gap-2 transition-colors ${
                      index === activeIndex ? 'bg-blue-50' : 'bg-white'
                    }`}
                  >
                    <div className="min-w-0 flex-1">{renderOption(item)}</div>
                    {isSelected && <Check size={14} className="shrink-0 mt-0.5 text-blue-600" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
