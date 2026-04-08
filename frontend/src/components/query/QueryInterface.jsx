import { useState, useRef, useEffect } from "react";
import { SendHorizontal, Database, User, Loader2, Sparkles } from "lucide-react";
import SectionWrapper from "../shared/SectionWrapper";
import ScrollReveal from "../shared/ScrollReveal";
import SqlHighlight from "../shared/SqlHighlight";
import ResultTable from "./ResultTable";
import { api } from "../../services/api";
import { useToast } from "../../context/ToastContext";

export default function QueryInterface() {
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const toast = useToast();

  // Backend endpoint'i için zorunlu: GenerateSqlRequest.DbId
  // UI'de seçim ekranı yok; bu yüzden env/localStorage ile override edilebilir.
  const dbId =
    localStorage.getItem("dbId") || import.meta.env.VITE_DB_ID || "adventureworks";

  useEffect(() => {
    if (messages.length === 0) return;
    const lastMessage = messages[messages.length - 1];

    // Kullanıcı mesajında veya loading başlangıcında sayfayı kaydırma;
    // yalnızca gerçek yanıt/hata geldiğinde aşağı in.
    if (lastMessage.role === "user") return;

    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages]);

  const handleInput = (e) => {
    setQuestion(e.target.value);
    const ta = textareaRef.current;
    if (ta) {
      ta.style.height = "auto";
      ta.style.height = Math.min(ta.scrollHeight, 160) + "px";
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = question.trim();
    if (!trimmed || loading) return;

    if (!api.isAuthenticated()) {
      const warnMsg = "Öncelikle giriş yapınız.";
      setMessages((prev) => [
        ...prev,
        { role: "error", content: warnMsg, fieldErrors: null },
      ]);
      toast.error(warnMsg);
      return;
    }

    const userMsg = { role: "user", content: trimmed };
    setMessages((prev) => [...prev, userMsg]);
    setQuestion("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";

    setLoading(true);
    try {
      const resp = await api.post("/query/generate-sql", {
        query: trimmed,
        dbId,
      });

      // core-backend ApiResponse<T> döndürür: { success, message, data: T }
      const generatePayload = resp?.data ?? resp?.Data ?? resp;
      setMessages((prev) => [
        ...prev,
        { role: "assistant", data: generatePayload },
      ]);
      toast.success("SQL sorgusu başarıyla üretildi.");
    } catch (err) {
      const errorMsg = err.message || "Sunucuya ulaşırken bir hata oluştu.";
      setMessages((prev) => [
        ...prev,
        { role: "error", content: errorMsg, fieldErrors: err.fieldErrors || null },
      ]);
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

  return (
    <div className="bg-slate-50/50">
      <SectionWrapper id="query" className="!py-12 sm:!py-16">
        <ScrollReveal>
          <div className="max-w-3xl mx-auto">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-medium mb-3">
                <Sparkles className="w-3 h-3" />
                AI Destekli
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">
                Veritabanınıza sorun
              </h2>
            </div>

            {/* Chat container */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              {/* Messages area */}
              <div
                className="min-h-[120px] max-h-[480px] overflow-y-auto p-4 sm:p-6 space-y-4"
                data-lenis-prevent
              >
                {messages.length === 0 && !loading && (
                  <div className="flex flex-col items-center justify-center py-10 text-slate-400">
                    <Database className="w-10 h-10 mb-3 text-slate-300" />
                    <p className="text-sm text-center max-w-xs">
                      Doğal dilde bir soru yazın, yapay zeka sizin için SQL üretsin.
                    </p>
                    <div className="flex flex-wrap gap-2 mt-4 justify-center">
                      {["Son 10 kullanıcıyı getir", "Toplam sipariş sayısı", "En çok satan ürün"].map(
                        (s) => (
                          <button
                            key={s}
                            onClick={() => {
                              setQuestion(s);
                              textareaRef.current?.focus();
                            }}
                            className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 text-slate-500 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50 transition-all cursor-pointer"
                          >
                            {s}
                          </button>
                        )
                      )}
                    </div>
                  </div>
                )}

                {messages.map((msg, i) => (
                  <MessageBubble key={i} message={msg} />
                ))}

                {loading && (
                  <div className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center shrink-0">
                      <Database className="w-3.5 h-3.5 text-white" />
                    </div>
                    <div className="bg-slate-50 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-2 text-sm text-slate-500">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Düşünüyor...
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Input area */}
              <div className="border-t border-slate-100 p-3 sm:p-4">
                <form
                  onSubmit={handleSubmit}
                  className="flex items-end gap-2 bg-slate-50 rounded-xl px-4 py-2 border border-slate-200 focus-within:border-blue-400 focus-within:ring-2 focus-within:ring-blue-100 transition-all"
                >
                  <textarea
                    ref={textareaRef}
                    value={question}
                    onChange={handleInput}
                    onKeyDown={handleKeyDown}
                    rows={1}
                    placeholder="Veritabanınıza bir soru sorun..."
                    className="flex-1 bg-transparent resize-none text-sm sm:text-base text-slate-800 placeholder-slate-400 focus:outline-none py-1.5 leading-relaxed max-h-[160px]"
                  />
                  <button
                    type="submit"
                    disabled={loading || !question.trim()}
                    className={`shrink-0 w-9 h-9 rounded-lg flex items-center justify-center transition-all ${
                      loading || !question.trim()
                        ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                        : "bg-blue-600 text-white hover:bg-blue-700 cursor-pointer"
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
        </ScrollReveal>
      </SectionWrapper>
    </div>
  );
}

/* --- Message Bubble --- */

function MessageBubble({ message }) {
  const { role, content, data, fieldErrors } = message;

  if (role === "user") {
    return (
      <div className="flex items-start gap-3 justify-end">
        <div className="bg-blue-600 text-white rounded-2xl rounded-tr-sm px-4 py-2.5 max-w-[80%] text-sm leading-relaxed">
          {content}
        </div>
        <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center shrink-0">
          <User className="w-3.5 h-3.5 text-slate-600" />
        </div>
      </div>
    );
  }

  if (role === "error") {
    return (
      <div className="flex items-start gap-3">
        <div className="w-7 h-7 rounded-full bg-red-100 flex items-center justify-center shrink-0">
          <Database className="w-3.5 h-3.5 text-red-500" />
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
      <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center shrink-0 mt-0.5">
        <Database className="w-3.5 h-3.5 text-white" />
      </div>
      <div className="flex-1 min-w-0 space-y-3 max-w-[90%]">
        {/* SQL block with syntax highlighting */}
        {sqlText && (
          <div className="bg-slate-900 rounded-xl px-4 py-3 font-mono text-xs sm:text-sm overflow-x-auto">
            <span className="text-blue-400 text-[10px] uppercase tracking-wider font-semibold block mb-1.5">
              SQL
            </span>
            <SqlHighlight sql={sqlText} />
          </div>
        )}

        {/* Explanation */}
        {explanationText && (
          <div className="bg-slate-50 rounded-xl px-4 py-3 text-sm text-slate-600 leading-relaxed">
            {explanationText}
          </div>
        )}

        {/* Validation badge */}
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

        {/* Data table with pagination */}
        {dataRows != null &&
          !(Array.isArray(dataRows) && dataRows.length === 0) && (
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="px-4 py-2 bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Sonuçlar
              </div>
              <div className="max-h-[320px] overflow-y-auto">
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