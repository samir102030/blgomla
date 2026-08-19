import React, { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { ChatBubbleLeftRightIcon, XMarkIcon, PaperAirplaneIcon } from "@heroicons/react/24/outline";
import { axiosInstance } from "../lib/axios";

/**
 * The shop's support assistant.
 *
 * This used to be a message box that reached a person, which meant it only
 * worked while somebody was awake and only for customers who had already
 * signed in — so the question a visitor actually has at 1am, "do you have this
 * and what does delivery cost", had nowhere to go but the WhatsApp button.
 *
 * Now the assistant answers, from the shop's own orders, catalogue and
 * shipping settings, and a person is where the conversation *ends* rather than
 * where it starts: when the assistant runs out of road it hands over to
 * WhatsApp with everything already said attached, so nobody types their
 * problem twice.
 */

type Turn = { role: "user" | "assistant"; content: string };
type Suggestion = { label: string; action: string; to?: string };

const GeneralSupportChat: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  const [open, setOpen] = useState(false);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState("");
  const [thinking, setThinking] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [canHandOff, setCanHandOff] = useState(false);
  const [handingOff, setHandingOff] = useState(false);

  const lang = i18n.language === "ar" ? "ar" : "en";
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Follow the conversation down as it grows, and land the caret in the box
  // when the panel opens so the first thing anyone can do is type.
  useEffect(() => {
    if (open) endRef.current?.scrollIntoView({ block: "end" });
  }, [turns, thinking, open]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const send = useCallback(
    async (text: string) => {
      const message = text.trim();
      if (!message || thinking) return;

      // The history goes with the message rather than being kept on the
      // server: the assistant is open to visitors, and a conversation with
      // somebody who has no account has nowhere on the server to live.
      const history = turns.slice(-8);

      setTurns((prev) => [...prev, { role: "user", content: message }]);
      setDraft("");
      setSuggestions([]);
      setThinking(true);

      try {
        const { data } = await axiosInstance.post("/support/ask", { message, history, lang });
        setTurns((prev) => [...prev, { role: "assistant", content: data.reply }]);
        setSuggestions(data.suggestions || []);
        if (data.handoff) setCanHandOff(true);
      } catch {
        setTurns((prev) => [
          ...prev,
          {
            role: "assistant",
            content: t(
              "support.unreachable",
              "I could not reach the shop just now. Try again in a moment, or talk to the team on WhatsApp."
            ),
          },
        ]);
        setCanHandOff(true);
      } finally {
        setThinking(false);
      }
    },
    [turns, thinking, lang, t]
  );

  /**
   * Hand the conversation to a person.
   *
   * The transcript is built on the server, where the customer's name is known,
   * and comes back as a WhatsApp draft. Opened in a new tab rather than
   * navigating: the customer may well want to come back to the page they were
   * on, which is usually the product they were asking about.
   */
  const handOff = async () => {
    setHandingOff(true);
    try {
      const { data } = await axiosInstance.post("/support/handoff", {
        history: turns.slice(-8),
        lang,
      });
      window.open(data.whatsappUrl, "_blank", "noopener,noreferrer");
    } catch {
      setTurns((prev) => [
        ...prev,
        {
          role: "assistant",
          content: t("support.handoffFailed", "I could not open WhatsApp. Please try again."),
        },
      ]);
    } finally {
      setHandingOff(false);
    }
  };

  const starters = [
    t("support.starterOrder", "Where is my order?"),
    t("support.starterShipping", "How much is delivery?"),
    t("support.starterReturn", "How do I return something?"),
  ];

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={t("support.title", "Ask Belgomla")}
        className="fixed bottom-4 right-4 z-50 w-14 h-14 rounded-full bg-[var(--brand-primary)] text-white shadow-lg shadow-[var(--brand-primary)]/30 flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
      >
        <ChatBubbleLeftRightIcon className="w-6 h-6" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 inset-x-4 sm:inset-x-auto sm:right-4 z-50 sm:w-[22rem] h-[30rem] max-h-[80vh] bg-[var(--surface)] border border-[var(--border)] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
      <header className="flex items-center justify-between gap-3 px-4 py-3 bg-[var(--brand-primary)] text-white">
        <div className="min-w-0">
          <h2 className="font-bold text-sm truncate">{t("support.title", "Ask Belgomla")}</h2>
          <p className="text-[11px] text-white/80 truncate">
            {t("support.subtitle", "Orders, products, delivery and returns")}
          </p>
        </div>
        {/* Always here, not only once the assistant gives up. Somebody who
            wants a person wants one now, and hunting for the way to reach one
            is the thing that makes a bot feel like a wall. */}
        <div className="shrink-0 flex items-center gap-1">
          <button
            type="button"
            onClick={handOff}
            disabled={handingOff}
            aria-label={t("support.handoff", "Talk to the team on WhatsApp")}
            title={t("support.handoff", "Talk to the team on WhatsApp")}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/15 disabled:opacity-50 transition-colors"
          >
            <svg viewBox="0 0 32 32" fill="currentColor" className="w-[18px] h-[18px]" aria-hidden="true">
              <path d="M16.003 3C9.376 3 4 8.376 4 15.003c0 2.643.86 5.084 2.314 7.066L4.062 29l7.106-2.226A11.954 11.954 0 0 0 16.003 27C22.63 27 28 21.624 28 14.997 28 8.37 22.63 3 16.003 3zm6.946 17.16c-.296.832-1.745 1.594-2.428 1.69-.62.088-1.4.124-2.262-.142-.522-.165-1.193-.387-2.052-.756-3.612-1.559-5.97-5.185-6.15-5.425-.18-.24-1.471-1.955-1.471-3.73 0-1.774.931-2.647 1.262-3.01.331-.363.722-.454.962-.454.24 0 .482.002.692.012.222.011.519-.084.811.618.296.71 1.005 2.452 1.094 2.63.09.18.149.39.03.63-.12.24-.18.39-.36.6-.179.21-.378.469-.539.629-.18.18-.367.375-.158.733.21.359.93 1.535 1.998 2.486 1.371 1.223 2.527 1.602 2.886 1.781.359.18.567.15.778-.09.21-.24.898-1.048 1.137-1.408.24-.359.479-.299.808-.18.33.12 2.093.988 2.452 1.168.359.18.598.27.687.42.09.149.09.869-.207 1.7z" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label={t("support.close", "Close")}
            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/15 transition-colors"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {turns.length === 0 && (
          <>
            <p className="text-sm text-[var(--text-muted)] leading-relaxed">
              {t("support.greeting", "Hello. Ask me about your order, a product, or delivery and returns.")}
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              {starters.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => send(s)}
                  className="px-3 py-1.5 rounded-full border border-[var(--border)] text-xs text-[var(--text-muted)] hover:border-[var(--brand-primary)] hover:text-[var(--brand-primary)] transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
          </>
        )}

        {turns.map((turn, i) => (
          <div key={i} className={`flex ${turn.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[85%] px-3 py-2 rounded-2xl text-sm leading-relaxed whitespace-pre-line ${
                turn.role === "user"
                  ? "bg-[var(--brand-primary)] text-white rounded-ee-sm"
                  : "bg-[var(--surface-2)] text-[var(--text)] rounded-es-sm"
              }`}
            >
              {turn.content}
            </div>
          </div>
        ))}

        {thinking && (
          <div className="flex justify-start">
            <div className="px-3 py-2 rounded-2xl bg-[var(--surface-2)] flex gap-1">
              {[0, 150, 300].map((delay) => (
                <span
                  key={delay}
                  className="w-1.5 h-1.5 rounded-full bg-[var(--text-subtle)] animate-bounce"
                  style={{ animationDelay: `${delay}ms` }}
                />
              ))}
            </div>
          </div>
        )}

        {suggestions.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {suggestions.map((s, i) => (
              <button
                key={i}
                type="button"
                onClick={() => {
                  if (s.action === "navigate" && s.to) {
                    navigate(s.to);
                    setOpen(false);
                  }
                }}
                className="px-3 py-1.5 rounded-full bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] text-xs font-medium hover:bg-[var(--brand-primary)]/20 transition-colors max-w-full truncate"
              >
                {s.label}
              </button>
            ))}
          </div>
        )}

        <div ref={endRef} />
      </div>

      {canHandOff && (
        <button
          type="button"
          onClick={handOff}
          disabled={handingOff}
          className="mx-4 mb-2 py-2.5 rounded-xl bg-[#25D366] text-white text-sm font-semibold hover:brightness-95 disabled:opacity-60 transition-all"
        >
          {handingOff
            ? t("support.handoffOpening", "Opening WhatsApp…")
            : t("support.handoff", "Talk to the team on WhatsApp")}
        </button>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(draft);
        }}
        className="flex items-center gap-2 p-3 border-t border-[var(--border)]"
      >
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={t("support.placeholder", "Type your question…")}
          maxLength={2000}
          className="flex-1 min-w-0 px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--bg)] text-[var(--text)] text-sm placeholder:text-[var(--text-subtle)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/40 focus:border-[var(--brand-primary)] transition-all"
        />
        <button
          type="submit"
          disabled={!draft.trim() || thinking}
          aria-label={t("support.send", "Send")}
          className="shrink-0 w-10 h-10 rounded-xl bg-[var(--brand-primary)] text-white flex items-center justify-center disabled:opacity-40 hover:brightness-110 transition-all"
        >
          <PaperAirplaneIcon className="w-4 h-4 rtl:-scale-x-100" />
        </button>
      </form>
    </div>
  );
};

export default GeneralSupportChat;
