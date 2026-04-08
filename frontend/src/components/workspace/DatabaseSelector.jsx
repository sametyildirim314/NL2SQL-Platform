import { ChevronDown, Database, AlertCircle } from "lucide-react";
import { useDatabase } from "../../context/DatabaseContext";
import { Link } from "react-router-dom";

/**
 * Compact database selector for the workspace top bar.
 * Pulls list/state from DatabaseContext.
 */
export default function DatabaseSelector() {
  const { databases, selectedDbId, setSelectedDbId, loading } = useDatabase();

  const activeDatabases = databases.filter((d) => d.isActive !== false);
  const hasAny = databases.length > 0;
  const hasActive = activeDatabases.length > 0;

  if (loading && !hasAny) {
    return (
      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-white text-sm text-slate-400">
        <Database className="w-4 h-4" />
        Veritabanları yükleniyor...
      </div>
    );
  }

  if (!hasAny) {
    return (
      <div className="inline-flex items-center gap-3 px-4 py-2 rounded-xl border border-amber-200 bg-amber-50 text-sm text-amber-800">
        <AlertCircle className="w-4 h-4" />
        Henüz bağlantınız yok.
        <Link
          to="/databases"
          className="font-semibold underline hover:no-underline"
        >
          Veritabanı ekleyin
        </Link>
      </div>
    );
  }

  if (!hasActive) {
    return (
      <div className="inline-flex items-center gap-3 px-4 py-2 rounded-xl border border-amber-200 bg-amber-50 text-sm text-amber-800">
        <AlertCircle className="w-4 h-4" />
        Aktif bir veritabanı yok.
        <Link to="/databases" className="font-semibold underline hover:no-underline">
          Yönet
        </Link>
      </div>
    );
  }

  return (
    <div className="relative inline-flex items-center">
      <Database className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
      <select
        value={selectedDbId || ""}
        onChange={(e) => setSelectedDbId(e.target.value || null)}
        className="appearance-none pl-9 pr-9 py-2 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-700 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 cursor-pointer min-w-[220px]"
      >
        {activeDatabases.map((db) => (
          <option key={db.id} value={db.dbId}>
            {db.displayName} ({db.provider})
          </option>
        ))}
      </select>
      <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 pointer-events-none" />
    </div>
  );
}
