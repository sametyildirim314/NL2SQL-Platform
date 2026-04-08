import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import Modal from "../shared/Modal";
import { api, ApiError } from "../../services/api";
import { useToast } from "../../context/ToastContext";

const PROVIDERS = ["PostgreSQL", "MsSql", "MySql", "Oracle", "SqLite"];

const EMPTY = {
  dbId: "",
  displayName: "",
  connectionString: "",
  provider: "PostgreSQL",
};

/**
 * Create or edit a database connection.
 *
 * @param {{
 *   open: boolean,
 *   onClose: () => void,
 *   onSaved: () => void,
 *   initial?: object | null   // null/undefined = create mode; object = edit mode
 * }} props
 */
export default function DatabaseFormModal({ open, onClose, onSaved, initial }) {
  const isEdit = Boolean(initial?.id);
  const [form, setForm] = useState(EMPTY);
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const toast = useToast();

  useEffect(() => {
    if (!open) return;
    setFieldErrors({});
    if (isEdit) {
      setForm({
        dbId: initial.dbId || "",
        displayName: initial.displayName || "",
        connectionString: "", // never prefill (masked behavior)
        provider: initial.provider || "PostgreSQL",
      });
    } else {
      setForm(EMPTY);
    }
  }, [open, isEdit, initial]);

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const validate = () => {
    const errors = {};
    if (!form.displayName.trim()) errors.displayName = "Görünen ad zorunludur.";
    if (!isEdit) {
      if (!form.dbId.trim()) errors.dbId = "DbId zorunludur.";
      if (!form.connectionString.trim())
        errors.connectionString = "Bağlantı dizesi zorunludur.";
    }
    if (!PROVIDERS.includes(form.provider)) errors.provider = "Geçersiz sağlayıcı.";
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    if (!validate()) return;

    setSubmitting(true);
    try {
      if (isEdit) {
        const payload = {
          displayName: form.displayName.trim(),
          provider: form.provider,
        };
        // Only send connection string if user typed one (preserves secrecy)
        const trimmedCs = form.connectionString.trim();
        if (trimmedCs) payload.connectionString = trimmedCs;

        await api.databases.update(initial.id, payload);
        toast.success("Veritabanı bağlantısı güncellendi.");
      } else {
        await api.databases.create({
          dbId: form.dbId.trim(),
          displayName: form.displayName.trim(),
          connectionString: form.connectionString.trim(),
          provider: form.provider,
        });
        toast.success("Yeni veritabanı bağlantısı eklendi.");
      }
      onSaved?.();
      onClose?.();
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : "Bir hata oluştu, lütfen tekrar deneyin.";
      toast.error(msg);
      if (err instanceof ApiError && err.fieldErrors) {
        setFieldErrors(err.fieldErrors);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={() => !submitting && onClose?.()}
      title={isEdit ? "Veritabanını Düzenle" : "Yeni Veritabanı Bağlantısı"}
      size="md"
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
            type="submit"
            form="database-form"
            disabled={submitting}
            className={`px-4 py-2 rounded-lg text-sm font-semibold text-white transition-colors ${
              submitting
                ? "bg-slate-400 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700 cursor-pointer"
            }`}
          >
            {submitting ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Kaydediliyor...
              </span>
            ) : isEdit ? (
              "Güncelle"
            ) : (
              "Ekle"
            )}
          </button>
        </div>
      }
    >
      <form id="database-form" onSubmit={handleSubmit} className="space-y-4">
        <Field
          label="DbId"
          error={fieldErrors.dbId}
          hint={isEdit ? "Bu alan oluşturulduktan sonra değiştirilemez." : "Tekil tanımlayıcı (örn. prod-db)."}
        >
          <input
            type="text"
            value={form.dbId}
            onChange={(e) => setField("dbId", e.target.value)}
            disabled={isEdit}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50 disabled:text-slate-500"
            placeholder="prod-db"
          />
        </Field>

        <Field label="Görünen Ad" error={fieldErrors.displayName}>
          <input
            type="text"
            value={form.displayName}
            onChange={(e) => setField("displayName", e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            placeholder="Üretim Veritabanı"
          />
        </Field>

        <Field label="Sağlayıcı" error={fieldErrors.provider}>
          <select
            value={form.provider}
            onChange={(e) => setField("provider", e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 bg-white focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 cursor-pointer"
          >
            {PROVIDERS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </Field>

        <Field
          label="Bağlantı Dizesi"
          error={fieldErrors.connectionString}
          hint={
            isEdit
              ? "Boş bırakırsanız mevcut bağlantı dizesi değişmez."
              : "Sunucu, port, kullanıcı, şifre ve veritabanı bilgilerini içerir."
          }
        >
          <input
            type="password"
            value={form.connectionString}
            onChange={(e) => setField("connectionString", e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 font-mono"
            placeholder={
              isEdit ? "Değiştirmek istemiyorsanız boş bırakın" : "Host=...;Database=...;Username=...;Password=..."
            }
          />
        </Field>
      </form>
    </Modal>
  );
}

function Field({ label, error, hint, children }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <div className="mt-1.5">{children}</div>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      {!error && hint && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
    </label>
  );
}
