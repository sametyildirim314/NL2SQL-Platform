import { useState } from "react";
import { ChevronDown, Table } from "lucide-react";

/**
 * Expandable card for a single table in the extracted/cached schema.
 * Allows the user to enrich `humanDescription` and `businessRules`
 * before posting back to /onboarding/register.
 *
 * @param {{
 *   table: { name: string, columns: string[], humanDescription: string, businessRules: string },
 *   onChange: (next: object) => void,
 *   defaultOpen?: boolean,
 *   readOnly?: boolean,
 * }} props
 */
export default function SchemaTableCard({ table, onChange, defaultOpen = false, readOnly = false }) {
  const [open, setOpen] = useState(defaultOpen);

  const update = (key, value) => {
    if (readOnly) return;
    onChange({ ...table, [key]: value });
  };

  return (
    <div className="bg-white/65 backdrop-blur-xl border border-blue-200/60 rounded-xl overflow-hidden shadow-sm shadow-blue-200/30">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 hover:bg-blue-50/40 transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-blue-100/70 border border-blue-200/60 flex items-center justify-center shrink-0">
            <Table className="w-4 h-4 text-blue-600" />
          </div>
          <div className="min-w-0 text-left">
            <p className="text-sm font-semibold text-slate-800 truncate">{table.name}</p>
            <p className="text-xs text-slate-500">{table.columns?.length ?? 0} kolon</p>
          </div>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="px-4 pb-4 pt-1 space-y-3 border-t border-blue-100">
          {/* Columns */}
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-blue-700/80 mb-1.5">
              Kolonlar
            </p>
            <div className="flex flex-wrap gap-1.5">
              {(table.columns || []).map((col) => (
                <span
                  key={col}
                  className="px-2 py-0.5 rounded-md bg-blue-50 border border-blue-100 text-[11px] font-mono text-blue-700"
                >
                  {col}
                </span>
              ))}
              {(!table.columns || table.columns.length === 0) && (
                <span className="text-xs text-slate-400">Kolon bilgisi yok.</span>
              )}
            </div>
          </div>

          {/* Human description */}
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-blue-700/80 mb-1.5">
              Açıklama
            </label>
            <textarea
              value={table.humanDescription || ""}
              onChange={(e) => update("humanDescription", e.target.value)}
              disabled={readOnly}
              rows={2}
              placeholder="Bu tablo neyi temsil ediyor? (örn. Kullanıcıların temel profil bilgileri)"
              className="w-full rounded-lg border border-blue-200/70 bg-white/80 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50 disabled:text-slate-500 resize-none"
            />
          </div>

          {/* Business rules */}
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-blue-700/80 mb-1.5">
              İş Kuralları
            </label>
            <textarea
              value={table.businessRules || ""}
              onChange={(e) => update("businessRules", e.target.value)}
              disabled={readOnly}
              rows={2}
              placeholder="Sorgu üretirken AI'ın bilmesi gereken kurallar (örn. is_deleted=false filtresi her zaman uygulanmalı)."
              className="w-full rounded-lg border border-blue-200/70 bg-white/80 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50 disabled:text-slate-500 resize-none"
            />
          </div>
        </div>
      )}
    </div>
  );
}
