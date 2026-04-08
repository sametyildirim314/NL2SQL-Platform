import { createContext, useCallback, useContext, useMemo, useState } from "react";

/**
 * Conversation/query state, lifted out of QueryInterface so that
 * navigating to other workspace pages (databases, history) does not
 * unmount-then-remount the chat and lose all messages.
 *
 * Lives only in memory: a full browser refresh resets the conversation
 * deliberately, so users do not see stale data after auth/db changes.
 */
const QueryContext = createContext(null);

export function QueryProvider({ children }) {
  const [messages, setMessages] = useState([]);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);

  const appendMessage = useCallback((message) => {
    setMessages((prev) => [...prev, message]);
  }, []);

  const clearConversation = useCallback(() => {
    setMessages([]);
    setQuestion("");
    setLoading(false);
  }, []);

  const value = useMemo(
    () => ({
      messages,
      question,
      loading,
      setQuestion,
      setLoading,
      appendMessage,
      clearConversation,
    }),
    [messages, question, loading, appendMessage, clearConversation]
  );

  return <QueryContext.Provider value={value}>{children}</QueryContext.Provider>;
}

export function useQuery() {
  const ctx = useContext(QueryContext);
  if (!ctx) {
    throw new Error("useQuery must be used inside <QueryProvider>");
  }
  return ctx;
}
