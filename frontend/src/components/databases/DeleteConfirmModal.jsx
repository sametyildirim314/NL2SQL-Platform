import { useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import Modal from "../shared/Modal";
import { api, ApiError } from "../../services/api";
import { useToast } from "../../context/ToastContext";

/**
 * Confirms deletion of a database connection.
 *
 * @param {{
 *   open: boolean,
 *   target: { id: string, displayName: string } | null,
 *   onClose: () => void,
 *   onDeleted: () => void,
 * }} props
 */
export default function DeleteConfirmModal({ open, target, onClose, onDeleted }) {
  const [submitting, setSubmitting] = useState(false);
  const toast = useToast();

  const handleConfirm = async () => {
    if (!target || submitting) return;
    setSubmitting(true);
    try {
      await api.databases.remove(target.id);
      toast.success("Veritabanı bağlantısı silindi.");
      onDeleted?.();
      onClose?.();
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : "Silme işlemi başarısız oldu.";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={() => !submitting && onClose?.()}
      title="Bağlantıyı Sil"
      size="sm"
      footer={
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer disabled:opacity-50"
          >
            İptal
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={submitting}
            className={`px-4 py-2 rounded-lg text-sm font-semibold text-white transition-colors ${
              submitting
                ? "bg-slate-400 cursor-not-allowed"
                : "bg-red-600 hover:bg-red-700 cursor-pointer"
            }`}
          >
            {submitting ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Siliniyor...
              </span>
            ) : (
              "Sil"
            )}
          </button>
        </div>
      }
    >
      <div className="flex gap-3">
        <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
          <AlertTriangle className="w-5 h-5 text-red-600" />
        </div>
        <div className="text-sm text-slate-700 leading-relaxed">
          <p>
            <span className="font-semibold">{target?.displayName || "Bu bağlantı"}</span>{" "}
            kalıcı olarak silinecek. Bu işlem geri alınamaz.
          </p>
          <p className="mt-2 text-slate-500">Devam etmek istiyor musunuz?</p>
        </div>
      </div>
    </Modal>
  );
}
