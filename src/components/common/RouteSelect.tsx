import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Search } from 'lucide-react';
import { RouteModel } from '../../types';
import { formatNumber } from '../../utils/formatters';

export const formatRouteKm = (km: number) => `${formatNumber(km, Number.isInteger(km) ? 0 : 2)} km`;

const normalizeSearch = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

interface RouteSelectProps {
  routes: RouteModel[];
  value: string;
  onChange: (routeId: string) => void;
  placeholder?: string;
}

const RouteKmLabel: React.FC<{ km: number }> = ({ km }) =>
  Number.isFinite(km) && km > 0 ? (
    <span className="font-mono text-slate-700">{formatRouteKm(km)}</span>
  ) : (
    <span className="text-rose-600 font-semibold">sem KM cadastrado</span>
  );

export const RouteSelect: React.FC<RouteSelectProps> = ({
  routes,
  value,
  onChange,
  placeholder = 'Selecione a rota...',
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const selectedRoute = routes.find((r) => r.id === value);

  const filteredRoutes = useMemo(() => {
    const q = normalizeSearch(query.trim());
    if (!q) return routes;
    return routes.filter((r) =>
      normalizeSearch(`${r.code} ${r.name} ${r.client || ''} ${r.block || ''}`).includes(q)
    );
  }, [routes, query]);

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
    const selectedIndex = routes.findIndex((r) => r.id === value);
    setActiveIndex(selectedIndex >= 0 ? selectedIndex : 0);
  }, [open]);

  useEffect(() => {
    if (open) optionRefs.current[activeIndex]?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex, open]);

  const selectRoute = (routeId: string) => {
    onChange(routeId);
    setOpen(false);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, filteredRoutes.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const route = filteredRoutes[activeIndex];
      if (route) selectRoute(route.id);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={`w-full text-left text-xs border rounded-md px-3 py-2 bg-white flex items-center justify-between gap-2 transition-colors ${
          open ? 'border-blue-500 ring-1 ring-blue-500' : 'border-slate-300 hover:border-slate-400'
        }`}
      >
        {selectedRoute ? (
          <div className="min-w-0 space-y-0.5">
            <div className="truncate text-slate-900">
              <span className="font-mono font-bold text-slate-500">{selectedRoute.code}</span>
              <span className="text-slate-400"> — </span>
              <span className="font-semibold">{selectedRoute.name}</span>
            </div>
            <div className="truncate text-[11px] text-slate-500">
              <span className="font-semibold text-slate-800">{selectedRoute.client || 'Sem cliente'}</span>
              <span className="text-slate-300"> | </span>
              <span className="font-semibold text-indigo-700">{selectedRoute.block || 'Sem bloco'}</span>
              <span className="text-slate-300"> | </span>
              <RouteKmLabel km={Number(selectedRoute.distanceKm)} />
            </div>
          </div>
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
              placeholder="Buscar por código, rota, cliente ou bloco..."
              className="w-full text-xs pl-7 pr-2 py-1.5 border border-slate-200 rounded text-slate-800 placeholder-slate-400 focus:outline-blue-600"
            />
          </div>

          <div role="listbox" className="max-h-72 overflow-y-auto divide-y divide-slate-100">
            {filteredRoutes.length === 0 ? (
              <div className="px-3 py-4 text-center text-xs text-slate-400">Nenhuma rota encontrada.</div>
            ) : (
              filteredRoutes.map((r, index) => {
                const isSelected = r.id === value;
                const isActive = index === activeIndex;
                return (
                  <button
                    key={r.id}
                    ref={(el) => {
                      optionRefs.current[index] = el;
                    }}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => selectRoute(r.id)}
                    onMouseEnter={() => setActiveIndex(index)}
                    className={`w-full text-left px-3 py-2 text-xs flex items-start gap-2 transition-colors ${
                      isActive ? 'bg-blue-50' : 'bg-white'
                    }`}
                  >
                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className="text-slate-900">
                        <span className="font-mono font-bold text-slate-500">{r.code}</span>
                        <span className="text-slate-400"> — </span>
                        <span className="font-semibold">{r.name}</span>
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Cliente: <span className="font-semibold text-slate-800">{r.client || 'Sem cliente'}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 flex flex-wrap items-center gap-1.5">
                        <span>Bloco:</span>
                        <span className="font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 rounded">
                          {r.block || 'Sem bloco'}
                        </span>
                        <span className="text-slate-300">•</span>
                        <span>KM:</span>
                        <RouteKmLabel km={Number(r.distanceKm)} />
                      </div>
                    </div>
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
};
