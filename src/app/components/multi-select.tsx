import { useState } from 'react';
import { Search } from 'lucide-react';

export function MultiSelect({ label, options, selected, onChange }: {
  label: string;
  options: { value: string; label: string }[];
  selected: Set<string>;
  onChange: (s: Set<string>) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const toggle = (v: string) => {
    const n = new Set(selected);
    n.has(v) ? n.delete(v) : n.add(v);
    onChange(n);
  };
  const count = selected.size;
  const btnLabel = count === 0 ? `All ${label}` : `${label}: ${count}`;
  const visible = search.trim()
    ? options.filter(o => o.label.toLowerCase().includes(search.toLowerCase()))
    : options;
  return (
    <div className="relative">
      <button
        onClick={() => { setOpen(o => !o); setSearch(''); }}
        className={`flex items-center gap-1.5 px-3 py-1.5 text-sm border rounded-lg bg-white transition-colors ${count > 0 ? 'border-black text-black font-medium' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
      >
        {btnLabel}
        <svg className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute z-20 mt-1 min-w-[220px] bg-white border border-gray-200 rounded-xl shadow-lg py-1">
            <div className="px-2 pt-1.5 pb-1 border-b border-gray-100">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
                <input
                  autoFocus
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder={`Search ${label.toLowerCase()}…`}
                  className="w-full pl-6 pr-2 py-1 text-xs border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-black/10"
                />
              </div>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 border-b border-gray-100">
              <button onClick={() => onChange(new Set(options.map(o => o.value)))} className="text-xs text-blue-600 hover:underline">All</button>
              <span className="text-gray-300">·</span>
              <button onClick={() => onChange(new Set())} className="text-xs text-gray-500 hover:underline">None</button>
            </div>
            <div className="max-h-52 overflow-y-auto">
              {visible.length === 0
                ? <p className="px-3 py-2 text-xs text-muted-foreground">No results</p>
                : visible.map(o => (
                  <label key={o.value} className="flex items-center gap-2.5 px-3 py-1.5 hover:bg-gray-50 cursor-pointer">
                    <input type="checkbox" checked={selected.has(o.value)} onChange={() => toggle(o.value)} className="w-3.5 h-3.5 accent-black rounded" />
                    <span className="text-sm text-gray-700 truncate max-w-[180px]">{o.label}</span>
                  </label>
                ))
              }
            </div>
          </div>
        </>
      )}
    </div>
  );
}
