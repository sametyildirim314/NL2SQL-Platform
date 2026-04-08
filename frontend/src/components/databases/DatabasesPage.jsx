import { useState } from "react";
import { Plus, Pencil, Trash2, Zap, Loader2, Database as DatabaseIcon, RefreshCw } from "lucide-react";
import { useDatabase } from "../../context/DatabaseContext";
import { api, ApiError } from "../../services/api";
import { useToast } from "../../context/ToastContext";
import DatabaseFormModal from "./DatabaseFormModal";
import DeleteConfirmModal from "./DeleteConfirmModal";

export default function DatabasesPage() {
  const { databases, loading, refresh } = useDatabase();
  const toast = useToast();

  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [testingId, setTestingId] = useState(null);

  const openCreate = () => {
    setEditTarget(null);
    setFormOpen(true);
  };

  const openEdit = (db) => {
    setEditTarget(db);
    setFormOpen(true);
  };

  const handleTest = async (db) => {
    if (testingId) return;
    setTestingId(db.id);
    try {
      const result = await api.databases.test(db.id);
      if (result?.success) {
        toast.success(
          `${db.displayName}: Bağlantı başarılı${result.message ? ` — ${result.message}` : ""}.`
        );
      } else {
        toast.error(
          `${db.displayName}: Bağlantı başarısız${result?.message ? ` — ${result.message}` : ""}.`
        );
      }
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : "Bağlantı testi başarısız oldu.";
      toast.error(msg);
    } finally {
      setTestingId(null);
    }
  };

  return (
    <div className="flex-1 min-h-0 overflow-y-auto">
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Veritabanı Bağlantıları</h1>
            <p className="text-sm text-slate-500 mt-1">
              NL2SQL için kullanılabilir veritabanı bağlantılarınızı yönetin.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => refresh()}
              disabled={loading}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              Yenile
            </button>
            <button
              type="button"
              onClick={openCreate}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-sm font-semibold text-white hover:bg-blue-700 transition-colors cursor-pointer shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Yeni Bağlantı
            </button>
          </div>
        </div>

        {/* Content */}
        {loading && databases.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-400">
            <Loader2 className="w-6 h-6 mx-auto animate-spin mb-3" />
            <p className="text-sm">Yükleniyor...</p>
          </div>
        ) : databases.length === 0 ? (
          <EmptyState onAdd={openCreate} />
        ) : (
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="px-6 py-3">Görünen Ad</th>
                    <th className="px-4 py-3">DbId</th>
                    <th className="px-4 py-3">Sağlayıcı</th>
                    <th className="px-4 py-3">Durum</th>
                    <th className="px-4 py-3">Eklenme</th>
                    <th className="px-4 py-3 text-right">Eylemler</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {databases.map((db) => (
                    <tr key={db.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-6 py-3 font-medium text-slate-800">{db.displayName}</td>
                      <td className="px-4 py-3 text-slate-500 font-mono text-xs">{db.dbId}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-xs font-medium">
                          {db.provider}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {db.isActive !== false ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-[11px] font-semibold">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                            Aktif
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-[11px] font-semibold">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                            Pasif
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs">
                        {formatDate(db.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <IconBtn
                            label="Bağlantıyı Test Et"
                            onClick={() => handleTest(db)}
                            disabled={testingId === db.id}
                            variant="blue"
                          >
                            {testingId === db.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Zap className="w-4 h-4" />
                            )}
                          </IconBtn>
                          <IconBtn label="Düzenle" onClick={() => openEdit(db)}>
                            <Pencil className="w-4 h-4" />
                          </IconBtn>
                          <IconBtn
                            label="Sil"
                            onClick={() => setDeleteTarget(db)}
                            variant="red"
                          >
                            <Trash2 className="w-4 h-4" />
                          </IconBtn>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <DatabaseFormModal
        open={formOpen}
        initial={editTarget}
        onClose={() => setFormOpen(false)}
        onSaved={refresh}
      />
      <DeleteConfirmModal
        open={Boolean(deleteTarget)}
        target={deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onDeleted={refresh}
      />
    </div>
  );
}

function EmptyState({ onAdd }) {
  return (
    <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-12 text-center">
      <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center mx-auto mb-4">
        <DatabaseIcon className="w-6 h-6 text-blue-500" />
      </div>
      <h2 className="text-lg font-semibold text-slate-800">Henüz bir bağlantınız yok</h2>
      <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
        NL2SQL'in sorgulayacağı veritabanını eklemek için aşağıdaki butona tıklayın.
      </p>
      <button
        type="button"
        onClick={onAdd}
        className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-sm font-semibold text-white hover:bg-blue-700 transition-colors cursor-pointer shadow-sm"
      >
        <Plus className="w-4 h-4" />
        İlk Bağlantınızı Ekleyin
      </button>
    </div>
  );
}

function IconBtn({ label, onClick, disabled, children, variant = "slate" }) {
  const color =
    variant === "red"
      ? "text-slate-500 hover:text-red-600 hover:bg-red-50"
      : variant === "blue"
        ? "text-slate-500 hover:text-blue-600 hover:bg-blue-50"
        : "text-slate-500 hover:text-slate-800 hover:bg-slate-100";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className={`p-2 rounded-lg transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${color}`}
    >
      {children}
    </button>
  );
}

function formatDate(value) {
  if (!value) return "-";
  try {
    return new Date(value).toLocaleDateString("tr-TR", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return String(value);
  }
}
