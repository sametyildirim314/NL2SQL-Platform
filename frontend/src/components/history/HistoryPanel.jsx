import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, RefreshCw, Trash2, Clock, Play, History as HistoryIcon } from "lucide-react";
import { api, ApiError } from "../../services/api";
import { useToast } from "../../context/ToastContext";
import { useDatabase } from "../../context/DatabaseContext";
import SqlHighlight from "../shared/SqlHighlight";

export default function HistoryPanel() {
  const { selectedDbId, selectedDatabase } = useDatabase();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [scope, setScope] = useState("active"); // 'active' | 'all'
  const navigate = useNavigate();
  const toast = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = { page: 1, pageSize: 50 };
      if (scope === "active" && selectedDbId) params.dbId = selectedDbId;
      const list = await api.history.list(params);
      setItems(Array.isArray(list) ? list : []);
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : "Geçmiş alınamadı.";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [scope, selectedDbId, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const handleRerun = (item) => {
    const text = pickText(item);
    if (!text) {
      toast.warning("Bu kayıtta yeniden çalıştırılacak metin bulunamadı.");
      return;
    }
    navigate("/workspace", { state: { presetQuery: text } });
  };

  const handleDelete = async (item) => {
    if (!item?.id) return;
    try {
      await api.history.remove(item.id);
      setItems((prev) => prev.filter((x) => x.id !== item.id));
      toast.success("Kayıt silindi.");
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Silme işlemi başarısız.";
      toast.error(msg);
    }
  };

  return (
    <div className="flex-1 min-h-0 overflow-y-auto">
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Sorgu Geçmişi</h1>
            <p className="text-sm text-slate-500 mt-1">
              {scope === "active" && selectedDatabase
                ? `${selectedDatabase.displayName} için son sorgular.`
                : "Tüm veritabanlarındaki son sorgular."}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 text-xs font-medium">
              <ScopeBtn active={scope === "active"} onClick={() => setScope("active")}>
                Aktif DB
              </ScopeBtn>
              <ScopeBtn active={scope === "all"} onClick={() => setScope("all")}>
                Tümü
              </ScopeBtn>
            </div>
            <button
              type="button"
              onClick={load}
              disabled={loading}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              Yenile
            </button>
          </div>
        </div>

        {loading && items.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-400">
            <Loader2 className="w-6 h-6 mx-auto animate-spin mb-3" />
            <p className="text-sm">Yükleniyor...</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-sm text-red-700">
            {error}
          </div>
        ) : items.length === 0 ? (
          <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-12 text-center">
            <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center mx-auto mb-4">
              <HistoryIcon className="w-6 h-6 text-slate-400" />
            </div>
            <h2 className="text-lg font-semibold text-slate-800">Henüz sorgu yok</h2>
            <p className="text-sm text-slate-500 mt-1">
              Sorgu çalıştırdıkça geçmişiniz burada görünecek.
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {items.map((item) => (
              <li
                key={item.id || pickText(item)}
                className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:border-blue-200 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-800 line-clamp-2">
                      {pickText(item) || "(boş soru)"}
                    </p>
                    <div className="mt-1.5 flex items-center gap-3 text-xs text-slate-400">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDateTime(item.createdAt || item.created_at)}
                      </span>
                      {(item.dbId || item.db_id) && (
                        <span className="font-mono">{item.dbId || item.db_id}</span>
                      )}
                    </div>
                    {pickSql(item) && (
                      <div className="mt-3 bg-slate-900 rounded-lg px-3 py-2 font-mono text-[11px] overflow-x-auto">
                        <SqlHighlight sql={pickSql(item)} />
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleRerun(item)}
                      title="Tekrar çalıştır"
                      className="p-2 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                    >
                      <Play className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(item)}
                      title="Sil"
                      className="p-2 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function ScopeBtn({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
        active ? "bg-blue-600 text-white" : "text-slate-600 hover:bg-slate-50"
      }`}
    >
      {children}
    </button>
  );
}

function pickText(item) {
  return (
    item?.query ||
    item?.naturalLanguageQuery ||
    item?.natural_language_query ||
    item?.question ||
    item?.prompt ||
    ""
  );
}

function pickSql(item) {
  return (
    item?.sqlQuery ||
    item?.sql_query ||
    item?.sql ||
    item?.generatedSql ||
    item?.generated_sql ||
    ""
  );
}

function formatDateTime(value) {
  if (!value) return "-";
  try {
    return new Date(value).toLocaleString("tr-TR", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return String(value);
  }
}
