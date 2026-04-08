import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Database as DatabaseIcon,
  Loader2,
  RefreshCw,
  Save,
  Sparkles,
  AlertCircle,
} from "lucide-react";
import { api, ApiError } from "../../services/api";
import { useToast } from "../../context/ToastContext";
import { useDatabase } from "../../context/DatabaseContext";
import SchemaTableCard from "./SchemaTableCard";

/**
 * View / extract / enrich / register the schema for a single database
 * connection. Lives at /databases/:dbId/schema.
 *
 * Flow on mount:
 *   1. GET /onboarding/schema/{dbId} → if cached, populate the cards
 *   2. If 404, show empty CTA → user clicks "Şemayı Çıkar"
 *   3. POST /onboarding/extract → cards become editable
 *   4. User enriches descriptions/rules → "Vector Store'a Kaydet"
 *   5. POST /onboarding/register → toast with chunksSaved
 */
export default function DatabaseSchemaPage() {
  const { dbId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { databases } = useDatabase();

  const dbMeta = useMemo(
    () => databases.find((d) => d.dbId === dbId) || null,
    [databases, dbId]
  );

  /** @type {[Array<{name:string,columns:string[],humanDescription:string,businessRules:string}>, Function]} */
  const [tables, setTables] = useState([]);
  const [fewShotExamples, setFewShotExamples] = useState([]);
  const [cachedMeta, setCachedMeta] = useState(null); // {databaseName, expiresAt, updatedAt}
  const [rawSchemaJson, setRawSchemaJson] = useState(null); // fallback if parse fails

  const [loadingCached, setLoadingCached] = useState(true);
  const [extracting, setExtracting] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [hasInitialised, setHasInitialised] = useState(false);

  // Keep a ref to the latest toast actions so loadCached doesn't need to
  // depend on it. Without this, every toast push would invalidate the
  // useCallback identity, which in turn re-fired the useEffect below and
  // wiped freshly-extracted tables (the "appears then disappears" bug).
  const toastRef = useRef(toast);
  useEffect(() => {
    toastRef.current = toast;
  }, [toast]);

  const loadCached = useCallback(async () => {
    if (!dbId) return;
    setLoadingCached(true);
    setRawSchemaJson(null);
    try {
      const cached = await api.onboarding.getCachedSchema(dbId);
      if (cached) {
        setCachedMeta({
          databaseName: cached.databaseName,
          expiresAt: cached.expiresAt,
          updatedAt: cached.updatedAt,
        });

        // schemaJson is a JSON string. We don't have a strict contract,
        // so try to coerce it into our table shape and fall back to a raw
        // view if anything looks off.
        const parsed = safeParseSchemaJson(cached.schemaJson);
        if (parsed && Array.isArray(parsed.tables)) {
          setTables(parsed.tables.map(normalizeTable));
          setFewShotExamples(parsed.fewShotExamples || []);
        } else {
          setRawSchemaJson(cached.schemaJson);
          setTables([]);
        }
      }
    } catch (err) {
      // 404 = no cached schema yet, treat as empty state silently
      const status = err instanceof ApiError ? err.status : 0;
      if (status !== 404) {
        const msg =
          err instanceof ApiError ? err.message : "Şema bilgisi alınamadı.";
        toastRef.current.error(msg);
      }
      setTables([]);
      setCachedMeta(null);
    } finally {
      setLoadingCached(false);
      setHasInitialised(true);
    }
  }, [dbId]);

  useEffect(() => {
    loadCached();
  }, [loadCached]);

  const handleExtract = async () => {
    if (extracting || !dbId) return;
    setExtracting(true);
    try {
      const resp = await api.onboarding.extract(dbId);
      const respTables = Array.isArray(resp?.tables) ? resp.tables : [];
      setTables(respTables.map(normalizeTable));
      setFewShotExamples(resp?.fewShotExamples || []);
      setRawSchemaJson(null);
      toast.success(
        `Şema çıkarıldı: ${respTables.length} tablo bulundu.`
      );
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : "Şema çıkarma başarısız.";
      toast.error(msg);
    } finally {
      setExtracting(false);
    }
  };

  const handleRegister = async () => {
    if (registering || !dbId || tables.length === 0) return;
    setRegistering(true);
    try {
      const resp = await api.onboarding.register(dbId, tables, fewShotExamples);
      const chunks = resp?.chunksSaved ?? 0;
      toast.success(
        `Şema vector store'a kaydedildi (${chunks} chunk). Artık sorgu yapabilirsiniz.`
      );
      // Refresh cached view so updatedAt reflects the save
      loadCached();
    } catch (err) {
      const msg =
        err instanceof ApiError ? err.message : "Şema kaydetme başarısız.";
      toast.error(msg);
    } finally {
      setRegistering(false);
    }
  };

  const updateTable = (index, next) => {
    setTables((prev) => prev.map((t, i) => (i === index ? next : t)));
  };

  const hasSchema = tables.length > 0;

  return (
    <div className="flex-1 min-h-0 overflow-y-auto">
      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-6">
          <button
            type="button"
            onClick={() => navigate("/databases")}
            className="inline-flex items-center gap-1.5 text-sm text-blue-700 hover:text-blue-800 hover:underline mb-3 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            Veritabanlarına Dön
          </button>

          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-blue-100/70 text-blue-700 text-[11px] font-semibold mb-1.5">
                <Sparkles className="w-3 h-3" />
                Şema Yönetimi
              </div>
              <h1 className="text-2xl font-bold text-slate-900 truncate">
                {dbMeta?.displayName || dbId}
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                <span className="font-mono">{dbId}</span>
                {dbMeta?.provider && (
                  <span className="text-slate-400"> · {dbMeta.provider}</span>
                )}
                {cachedMeta?.updatedAt && (
                  <span className="text-slate-400">
                    {" "}
                    · Son güncelleme: {formatDate(cachedMeta.updatedAt)}
                  </span>
                )}
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {hasSchema && (
                <button
                  type="button"
                  onClick={handleExtract}
                  disabled={extracting || registering}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-blue-200/70 bg-white/60 backdrop-blur text-sm font-medium text-blue-700 hover:bg-blue-50 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <RefreshCw className={`w-4 h-4 ${extracting ? "animate-spin" : ""}`} />
                  Yeniden Çıkar
                </button>
              )}
              {hasSchema && (
                <button
                  type="button"
                  onClick={handleRegister}
                  disabled={registering || extracting}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-sm font-semibold text-white hover:bg-blue-700 transition-colors cursor-pointer shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {registering ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  Vector Store'a Kaydet
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Body */}
        {loadingCached && !hasInitialised ? (
          <div className="bg-white/60 backdrop-blur-xl border border-blue-200/60 rounded-2xl p-12 text-center text-slate-500 shadow-sm shadow-blue-200/30">
            <Loader2 className="w-6 h-6 mx-auto animate-spin mb-3 text-blue-500" />
            <p className="text-sm">Şema bilgisi yükleniyor...</p>
          </div>
        ) : rawSchemaJson ? (
          <RawJsonFallback json={rawSchemaJson} onExtract={handleExtract} extracting={extracting} />
        ) : !hasSchema ? (
          <EmptyState onExtract={handleExtract} extracting={extracting} />
        ) : (
          <div className="space-y-3">
            {tables.map((t, i) => (
              <SchemaTableCard
                key={`${t.name}-${i}`}
                table={t}
                onChange={(next) => updateTable(i, next)}
                defaultOpen={tables.length <= 5}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ----------------- helpers ----------------- */

function normalizeTable(t) {
  return {
    name: t?.name ?? "",
    columns: Array.isArray(t?.columns) ? t.columns : [],
    humanDescription: t?.humanDescription ?? t?.human_description ?? "",
    businessRules: t?.businessRules ?? t?.business_rules ?? "",
  };
}

function safeParseSchemaJson(value) {
  if (value == null) return null;
  if (typeof value === "object") return value;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function formatDate(value) {
  if (!value) return "-";
  try {
    return new Date(value).toLocaleString("tr-TR", {
      dateStyle: "short",
      timeStyle: "short",
    });
  } catch {
    return String(value);
  }
}

function EmptyState({ onExtract, extracting }) {
  return (
    <div className="bg-white/60 backdrop-blur-xl border border-dashed border-blue-300/70 rounded-2xl p-12 text-center shadow-sm shadow-blue-200/30">
      <div className="w-14 h-14 rounded-2xl bg-blue-100/70 border border-blue-200/60 flex items-center justify-center mx-auto mb-4">
        <DatabaseIcon className="w-6 h-6 text-blue-600" />
      </div>
      <h2 className="text-lg font-semibold text-slate-800">Bu veritabanı için kayıtlı şema yok</h2>
      <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
        AI'ın doğru SQL üretebilmesi için önce şemayı çıkarıp vector store'a kaydetmemiz gerekiyor.
        Aşağıdaki butonla başlayabilirsiniz.
      </p>
      <button
        type="button"
        onClick={onExtract}
        disabled={extracting}
        className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-sm font-semibold text-white hover:bg-blue-700 transition-colors cursor-pointer shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {extracting ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Sparkles className="w-4 h-4" />
        )}
        Şemayı Çıkar
      </button>
    </div>
  );
}

function RawJsonFallback({ json, onExtract, extracting }) {
  return (
    <div className="bg-white/65 backdrop-blur-xl border border-amber-200 rounded-2xl p-6 shadow-sm shadow-blue-200/30">
      <div className="flex items-start gap-3 mb-4">
        <div className="w-9 h-9 rounded-lg bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0">
          <AlertCircle className="w-4 h-4 text-amber-600" />
        </div>
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-slate-800">
            Saklı şema beklenen formatta değil
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Cache'deki JSON tablo listesine dönüştürülemedi. Aşağıda ham içerik gösteriliyor;
            zenginleştirme yapmak için "Yeniden Çıkar" diyerek canlı şemayı tekrar alabilirsiniz.
          </p>
        </div>
      </div>
      <pre className="bg-slate-900 text-slate-100 text-xs rounded-lg p-4 overflow-x-auto max-h-80">
        {typeof json === "string" ? json : JSON.stringify(json, null, 2)}
      </pre>
      <button
        type="button"
        onClick={onExtract}
        disabled={extracting}
        className="mt-4 inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-600 text-sm font-semibold text-white hover:bg-blue-700 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <RefreshCw className={`w-4 h-4 ${extracting ? "animate-spin" : ""}`} />
        Yeniden Çıkar
      </button>
    </div>
  );
}
