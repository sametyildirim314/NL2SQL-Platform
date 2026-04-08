import { useRef, useEffect } from "react";
import { SendHorizontal, Database, User, Loader2, Sparkles, AlertCircle, Plus } from "lucide-react";
import SqlHighlight from "../shared/SqlHighlight";
import ResultTable from "./ResultTable";
import { api } from "../../services/api";
import { useToast } from "../../context/ToastContext";
import { useDatabase } from "../../context/DatabaseContext";
import { useQuery } from "../../context/QueryContext";

/**
 * Full-height GPT-style chat interface for NL → SQL queries.
 * Designed to fill its parent flex container.
 *
 * @param {{ initialQuery?: string }} props
 */
export default function QueryInterface({ initialQuery = "" }) {
  const {
    messages,
    question,
    loading,
    setQuestion,
    setLoading,
    appendMessage,
    clearConversation,
  } = useQuery();
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const toast = useToast();
  const { selectedDbId, selectedDatabase, databases } = useDatabase();

  const noActiveDatabase = !selectedDbId || !selectedDatabase;

  useEffect(() => {
    if (messages.length === 0) return;
    const lastMessage = messages[messages.length - 1];
    if (lastMessage.role === "user") return;
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages]);

  // External callers can preset the input via initialQuery
  useEffect(() => {
    if (initialQuery) setQuestion(initialQuery);
    // setQuestion is stable from context (useCallback-free useState setter)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuery]);

  const handleInput = (e) => {
    setQuestion(e.target.value);
    const ta = textareaRef.current;
    if (ta) {
      ta.style.height = "auto";
      ta.style.height = Math.min(ta.scrollHeight, 200) + "px";
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = question.trim();
    if (!trimmed || loading) return;

    if (!api.isAuthenticated()) {
      const warnMsg = "Öncelikle giriş yapınız.";
      appendMessage({ role: "error", content: warnMsg, fieldErrors: null });
      toast.error(warnMsg);
      return;
    }

    if (noActiveDatabase) {
      const warnMsg = "Lütfen önce sorgulanacak bir veritabanı seçin.";
      toast.warning(warnMsg);
      return;
    }

    appendMessage({ role: "user", content: trimmed });
    setQuestion("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";

    setLoading(true);
    try {
      const resp = await api.post("/query/generate-sql", {
        query: trimmed,
        dbId: selectedDbId,
      });
      const generatePayload = resp?.data ?? resp?.Data ?? resp;
      appendMessage({ role: "assistant", data: generatePayload });
      toast.success("SQL sorgusu başarıyla üretildi.");
    } catch (err) {
      const errorMsg = err.message || "Sunucuya ulaşırken bir hata oluştu.";
      appendMessage({
        role: "error",
        content: errorMsg,
        fieldErrors: err.fieldErrors || null,
      });
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const inputDisabled = loading || noActiveDatabase || !question.trim();

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-transparent">
      {/* Header band */}
      <div className="border-b border-blue-200/60 bg-white/30 backdrop-blur-2xl px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-[11px] font-semibold mb-1.5">
              <Sparkles className="w-3 h-3" />
              AI Destekli
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
              Sorgu Çalışma Alanı
            </h1>
            {selectedDatabase ? (
              <p className="text-xs text-slate-500 mt-0.5">
                Aktif: <span className="font-medium text-slate-700">{selectedDatabase.displayName}</span>
                <span className="text-slate-400"> · {selectedDatabase.provider}</span>
              </p>
            ) : (
              <p className="text-xs text-slate-500 mt-0.5">Sorgu yapmak için bir veritabanı seçin.</p>
            )}
          </div>

          {messages.length > 0 && (
            <button
              type="button"
              onClick={clearConversation}
              disabled={loading}
              className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-blue-700 bg-white/60 backdrop-blur border border-blue-200/70 hover:bg-blue-50 hover:border-blue-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              title="Konuşmayı temizle"
            >
              <Plus className="w-3.5 h-3.5" />
              Yeni Sorgu
            </button>
          )}
        </div>
      </div>

      {/* Messages area */}
      <div
        className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 py-6"
        data-lenis-prevent
      >
        <div className="max-w-5xl mx-auto space-y-4">
          {messages.length === 0 && !loading && (
            <EmptyState
              noActiveDatabase={noActiveDatabase}
              hasAnyDatabase={databases.length > 0}
              onSelectExample={(s) => {
                setQuestion(s);
                textareaRef.current?.focus();
              }}
            />
          )}

          {messages.map((msg, i) => (
            <MessageBubble key={i} message={msg} />
          ))}

          {loading && (
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center shrink-0">
                <Database className="w-4 h-4 text-white" />
              </div>
              <div className="bg-white/60 backdrop-blur-xl border border-blue-200/60 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-2 text-sm text-slate-600 shadow-lg shadow-blue-200/30">
                <Loader2 className="w-4 h-4 animate-spin" />
                Düşünüyor...
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input area (sticky bottom) */}
      <div className="border-t border-blue-200/60 bg-white/30 backdrop-blur-2xl px-4 sm:px-6 py-4">
        <div className="max-w-5xl mx-auto">
          <form
            onSubmit={handleSubmit}
            className={`flex items-end gap-2 bg-white/60 backdrop-blur rounded-2xl px-4 py-3 border shadow-lg shadow-blue-200/30 transition-all ${
              noActiveDatabase
                ? "border-blue-200/60 opacity-70"
                : "border-blue-200/70 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-200/60"
            }`}
          >
            <textarea
              ref={textareaRef}
              value={question}
              onChange={handleInput}
              onKeyDown={handleKeyDown}
              rows={1}
              disabled={noActiveDatabase}
              placeholder={
                noActiveDatabase
                  ? "Önce yan menüden bir veritabanı bağlayın..."
                  : "Veritabanınıza bir soru sorun..."
              }
              className="flex-1 bg-transparent resize-none text-sm sm:text-base text-slate-800 placeholder-slate-400 focus:outline-none py-1.5 leading-relaxed max-h-[200px] disabled:cursor-not-allowed"
            />
            <button
              type="submit"
              disabled={inputDisabled}
              className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                inputDisabled
                  ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                  : "bg-blue-600 text-white hover:bg-blue-700 cursor-pointer shadow-sm"
              }`}
            >
              <SendHorizontal className="w-4 h-4" />
            </button>
          </form>
          <p className="text-[11px] text-slate-400 text-center mt-2">
            Enter ile gönder &middot; Shift+Enter ile yeni satır
          </p>
        </div>
      </div>
    </div>
  );
}

/* --- Empty state --- */

function EmptyState({ noActiveDatabase, hasAnyDatabase, onSelectExample }) {
  if (noActiveDatabase) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-slate-400">
        <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center mb-4">
          <AlertCircle className="w-6 h-6 text-amber-500" />
        </div>
        <p className="text-base font-medium text-slate-600 mb-1">
          {hasAnyDatabase ? "Bir veritabanı seçin" : "Henüz veritabanı bağlantınız yok"}
        </p>
        <p className="text-sm text-slate-400 max-w-sm text-center">
          {hasAnyDatabase
            ? "Üst bardan aktif bir veritabanı seçerek sorgu yapmaya başlayabilirsiniz."
            : "Sol menüden 'Veritabanları'na giderek ilk bağlantınızı ekleyin."}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-12 text-slate-400">
      <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center mb-4">
        <Database className="w-6 h-6 text-blue-500" />
      </div>
      <p className="text-base font-medium text-slate-600 mb-1">
        Doğal dilde bir soru yazın
      </p>
      <p className="text-sm text-slate-400 max-w-sm text-center mb-4">
        Yapay zeka sizin için optimize edilmiş SQL sorgusunu üretsin.
      </p>
      <div className="flex flex-wrap gap-2 justify-center">
        {["Son 10 kullanıcıyı getir", "Toplam sipariş sayısı", "En çok satan ürün"].map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onSelectExample(s)}
            className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-500 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50 transition-all cursor-pointer"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}

/* --- Message Bubble --- */

function MessageBubble({ message }) {
  const { role, content, data, fieldErrors } = message;

  if (role === "user") {
    return (
      <div className="flex items-start gap-3 justify-end">
        <div className="bg-blue-600 text-white rounded-2xl rounded-tr-sm px-4 py-2.5 max-w-[80%] text-sm leading-relaxed shadow-sm">
          {content}
        </div>
        <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center shrink-0">
          <User className="w-4 h-4 text-slate-600" />
        </div>
      </div>
    );
  }

  if (role === "error") {
    return (
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center shrink-0">
          <Database className="w-4 h-4 text-red-500" />
        </div>
        <div className="bg-red-50 border border-red-200 rounded-2xl rounded-tl-sm px-4 py-2.5 max-w-[80%]">
          <p className="text-sm text-red-700">{content}</p>
          {fieldErrors && Object.keys(fieldErrors).length > 0 && (
            <ul className="mt-2 space-y-1">
              {Object.entries(fieldErrors).map(([field, msg]) => (
                <li key={field} className="text-xs text-red-600">
                  <span className="font-semibold">{field}:</span> {msg}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    );
  }

  // Assistant message with data
  const sqlText =
    data?.sql_query || data?.sql || data?.sqlQuery || data?.sql_query_text || "";
  const explanationText = data?.explanation || data?.message || data?.details || "";
  const dataRows = data?.data ?? data?.rows ?? data?.result ?? null;
  const isValidated =
    data && Object.prototype.hasOwnProperty.call(data, "is_validated")
      ? data.is_validated
      : Object.prototype.hasOwnProperty.call(data, "isValidated")
        ? data.isValidated
        : undefined;

  const isArrayOfObjects =
    Array.isArray(dataRows) &&
    dataRows.length > 0 &&
    typeof dataRows[0] === "object" &&
    dataRows[0] !== null &&
    !Array.isArray(dataRows[0]);
  const tableColumns = isArrayOfObjects ? Object.keys(dataRows[0]) : [];

  return (
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center shrink-0 mt-0.5">
        <Database className="w-4 h-4 text-white" />
      </div>
      <div className="flex-1 min-w-0 space-y-3 max-w-[90%]">
        {sqlText && (
          <div className="bg-slate-900 rounded-xl px-4 py-3 font-mono text-xs sm:text-sm overflow-x-auto shadow-sm">
            <span className="text-blue-400 text-[10px] uppercase tracking-wider font-semibold block mb-1.5">
              SQL
            </span>
            <SqlHighlight sql={sqlText} />
          </div>
        )}

        {explanationText && (
          <div className="bg-white/60 backdrop-blur-xl border border-blue-200/60 rounded-xl px-4 py-3 text-sm text-slate-700 leading-relaxed shadow-lg shadow-blue-200/30">
            {explanationText}
          </div>
        )}

        {isValidated !== undefined && (
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
              isValidated
                ? "bg-green-100 text-green-700"
                : "bg-amber-100 text-amber-700"
            }`}
          >
            {isValidated ? "Doğrulandı" : "Doğrulanmadı"}
          </span>
        )}

        {dataRows != null &&
          !(Array.isArray(dataRows) && dataRows.length === 0) && (
            <div className="bg-white/65 backdrop-blur-xl border border-blue-200/60 rounded-xl overflow-hidden shadow-lg shadow-blue-200/30">
              <div className="px-4 py-2 bg-blue-100/50 border-b border-blue-200/60 text-xs font-semibold text-blue-700 uppercase tracking-wider">
                Sonuçlar
              </div>
              <div className="max-h-[420px] overflow-y-auto">
                <ResultTable
                  dataRows={dataRows}
                  tableColumns={tableColumns}
                  isArrayOfObjects={isArrayOfObjects}
                />
              </div>
            </div>
          )}
      </div>
    </div>
  );
}
