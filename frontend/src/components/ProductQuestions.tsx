import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import { useQuestionStore } from "../stores/question.store";
import { useUserStore } from "../stores/user.store";

interface ProductQuestionsProps {
  productId: string;
}

const ProductQuestions: React.FC<ProductQuestionsProps> = ({ productId }) => {
  const { t } = useTranslation();
  const user = useUserStore((s) => s.user);
  const { questions, loading, fetchByProduct, ask, answer, remove } =
    useQuestionStore();

  const [questionText, setQuestionText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [answerFor, setAnswerFor] = useState<string | null>(null);
  const [answerText, setAnswerText] = useState("");

  useEffect(() => {
    if (productId) fetchByProduct(productId);
  }, [productId, fetchByProduct]);

  const isStaff = user?.role === "admin" || user?.role === "super_admin" || user?.role === "store";

  const handleAsk = async () => {
    if (!questionText.trim()) return;
    setSubmitting(true);
    const ok = await ask(productId, questionText.trim());
    setSubmitting(false);
    if (ok) {
      setQuestionText("");
      toast.success(t("Question posted"));
    } else {
      toast.error(t("Couldn't post your question"));
    }
  };

  const handleAnswer = async (questionId: string) => {
    if (!answerText.trim()) return;
    setSubmitting(true);
    const ok = await answer(questionId, answerText.trim());
    setSubmitting(false);
    if (ok) {
      setAnswerText("");
      setAnswerFor(null);
      toast.success(t("Answer posted"));
    } else {
      toast.error(t("Couldn't post your answer"));
    }
  };

  const handleDelete = async (questionId: string) => {
    const ok = await remove(questionId);
    if (ok) toast.success(t("Question removed"));
  };

  return (
    <div className="space-y-6">
      {/* Ask */}
      {user ? (
        <div className="bg-[var(--surface-2)]/40 border border-[var(--border)] rounded-xl p-4">
          <label className="block text-sm font-semibold text-[var(--text)] mb-2">
            {t("Have a question about this product?")}
          </label>
          <textarea
            value={questionText}
            onChange={(e) => setQuestionText(e.target.value)}
            rows={3}
            maxLength={2000}
            placeholder={t("Ask anything — sizing, compatibility, warranty…")}
            className="w-full border border-[var(--border)] rounded-lg px-3 py-2 text-sm bg-[var(--surface)] text-[var(--text)] focus:ring-2 focus:ring-[var(--brand-primary)]/30 focus:border-[var(--brand-primary)]"
          />
          <div className="mt-2 flex justify-end">
            <button
              type="button"
              onClick={handleAsk}
              disabled={submitting || !questionText.trim()}
              className="px-4 py-2 rounded-lg bg-[var(--brand-primary)] text-white text-sm font-medium hover:opacity-90 disabled:opacity-50"
            >
              {t("Post question")}
            </button>
          </div>
        </div>
      ) : (
        <p className="text-sm text-[var(--text-muted)]">
          {t("Please sign in to ask a question.")}
        </p>
      )}

      {/* List */}
      {loading ? (
        <p className="text-sm text-[var(--text-muted)]">{t("Loading…")}</p>
      ) : questions.length === 0 ? (
        <p className="text-sm text-[var(--text-muted)]">
          {t("No questions yet. Be the first to ask!")}
        </p>
      ) : (
        <ul className="space-y-5">
          {questions.map((q) => {
            const canDelete =
              isStaff || (!!user && q.user?._id === user._id);
            return (
              <li
                key={q._id}
                className="border border-[var(--border)] rounded-xl p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm font-medium text-[var(--text)]">
                    <span className="text-[var(--text-subtle)] mr-1">Q:</span>
                    {q.text}
                  </p>
                  {canDelete && (
                    <button
                      type="button"
                      onClick={() => handleDelete(q._id)}
                      className="text-xs text-red-500 hover:text-red-600 shrink-0"
                      aria-label={t("Delete question")}
                    >
                      {t("Delete")}
                    </button>
                  )}
                </div>
                <p className="mt-1 text-[11px] text-[var(--text-subtle)]">
                  {q.user?.name || t("Customer")}
                </p>

                {/* Answers */}
                {q.answers.length > 0 && (
                  <ul className="mt-3 space-y-2 pl-3 border-l-2 border-[var(--border)]">
                    {q.answers.map((a, i) => (
                      <li key={a._id || i} className="text-sm">
                        <span className="text-[var(--text-subtle)] mr-1">A:</span>
                        <span className="text-[var(--text-muted)]">{a.text}</span>
                        {a.isOfficial && (
                          <span className="ml-2 inline-flex items-center rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-semibold px-2 py-0.5">
 {t("Official")}
                          </span>
                        )}
                        <span className="block text-[11px] text-[var(--text-subtle)]">
                          {a.user?.name || t("User")}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}

                {/* Answer form */}
                {user && (
                  <div className="mt-3">
                    {answerFor === q._id ? (
                      <div className="flex flex-col gap-2">
                        <textarea
                          value={answerText}
                          onChange={(e) => setAnswerText(e.target.value)}
                          rows={2}
                          maxLength={2000}
                          placeholder={t("Write an answer…")}
                          className="w-full border border-[var(--border)] rounded-lg px-3 py-2 text-sm bg-[var(--surface)] text-[var(--text)] focus:ring-2 focus:ring-[var(--brand-primary)]/30"
                        />
                        <div className="flex gap-2 justify-end">
                          <button
                            type="button"
                            onClick={() => { setAnswerFor(null); setAnswerText(""); }}
                            className="px-3 py-1.5 rounded-lg border border-[var(--border)] text-[var(--text-muted)] text-xs"
                          >
                            {t("Cancel")}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleAnswer(q._id)}
                            disabled={submitting || !answerText.trim()}
                            className="px-3 py-1.5 rounded-lg bg-[var(--brand-primary)] text-white text-xs font-medium disabled:opacity-50"
                          >
                            {t("Post answer")}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => { setAnswerFor(q._id); setAnswerText(""); }}
                        className="text-xs font-medium text-[var(--brand-primary)] hover:underline"
                      >
                        {t("Answer this question")}
                      </button>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default ProductQuestions;
