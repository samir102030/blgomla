import React, { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import { ArrowPathIcon, EnvelopeIcon } from "@heroicons/react/24/outline";
import { axiosInstance } from "../../lib/axios";

/**
 * The messages people send from the contact page.
 *
 * There was nowhere to read them because there was nothing to read: the form
 * wrote its fields to the browser console and threw them away. Now they are
 * stored and the shop is emailed, and this is where they are worked through —
 * because an inbox nobody opens is only a slower way of losing a message.
 *
 * Ordered newest first and filtered by state rather than searched. An enquiry
 * matters most on the day it arrives, and the useful question is "what have we
 * not answered", not "find me the one from March".
 */

type Status = "new" | "read" | "replied" | "closed";

interface Message {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  subject?: string;
  message: string;
  source?: string;
  status: Status;
  adminNotes?: string;
  handledBy?: { name?: string } | null;
  createdAt: string;
}

const STATUSES: { key: Status | "all"; ar: string; en: string }[] = [
  { key: "new", ar: "جديدة", en: "New" },
  { key: "read", ar: "مقروءة", en: "Read" },
  { key: "replied", ar: "تم الرد", en: "Replied" },
  { key: "closed", ar: "مقفولة", en: "Closed" },
  { key: "all", ar: "الكل", en: "All" },
];

const TONE: Record<Status, string> = {
  new: "bg-blue-50 text-blue-700 border-blue-200",
  read: "bg-gray-50 text-gray-600 border-gray-200",
  replied: "bg-emerald-50 text-emerald-700 border-emerald-200",
  closed: "bg-gray-100 text-gray-500 border-gray-200",
};

const ContactMessagesPage: React.FC = () => {
  const { i18n } = useTranslation();
  const ar = i18n.language === "ar";

  const [messages, setMessages] = useState<Message[]>([]);
  const [filter, setFilter] = useState<Status | "all">("new");
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const query = filter === "all" ? "" : `?status=${filter}`;
      const { data } = await axiosInstance.get(`/contact${query}`);
      setMessages(data.messages || []);
      setUnread(data.unread || 0);
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message ||
          (ar ? "مش قادر أقرا الرسايل" : "Could not load the messages")
      );
    } finally {
      setLoading(false);
    }
  }, [filter, ar]);

  useEffect(() => {
    load();
  }, [load]);

  const setStatus = async (id: string, status: Status) => {
    setBusy(id);
    try {
      await axiosInstance.patch(`/contact/${id}`, { status });
      // Refetched rather than patched in place: the unread count and the
      // current filter both change, and guessing at either shows a number that
      // is wrong until the next reload.
      await load();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || (ar ? "مش اتحفظ" : "Could not save that"));
    } finally {
      setBusy(null);
    }
  };

  const when = (iso: string) =>
    new Date(iso).toLocaleString(ar ? "ar-EG" : "en-GB", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <div className="p-4 sm:p-6 max-w-4xl">
      <header className="mb-5">
        <h1 className="text-2xl font-bold text-[var(--text)] flex items-center gap-2">
          <EnvelopeIcon className="w-6 h-6" aria-hidden="true" />
          {ar ? "رسايل العملاء" : "Customer messages"}
          {unread > 0 && (
            <span className="text-sm font-semibold bg-blue-600 text-white rounded-full px-2.5 py-0.5 tabular-nums">
              {unread}
            </span>
          )}
        </h1>
        <p className="text-sm text-[var(--text-muted)] mt-1">
          {ar
            ? "اللي بيتبعت من صفحة تواصل معنا، ومن المنتجات اللي سعرها عند الطلب."
            : "Sent from the contact page, and from products priced on request."}
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        {STATUSES.map((s) => (
          <button
            key={s.key}
            type="button"
            onClick={() => setFilter(s.key)}
            className={`rounded-xl border px-3.5 py-1.5 text-sm font-medium transition-colors ${
              filter === s.key
                ? "border-[var(--brand-primary,#00A8E8)] bg-[var(--brand-primary,#00A8E8)]/5 text-[var(--brand-primary,#00A8E8)]"
                : "border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}
          >
            {ar ? s.ar : s.en}
          </button>
        ))}
        <button
          type="button"
          onClick={load}
          className="ms-auto inline-flex items-center gap-2 rounded-xl border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
        >
          <ArrowPathIcon className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} aria-hidden="true" />
          {ar ? "تحديث" : "Refresh"}
        </button>
      </div>

      {loading && !messages.length && (
        <div className="h-24 rounded-2xl bg-gray-100 animate-pulse" />
      )}

      {!loading && !messages.length && (
        <p className="text-sm text-[var(--text-muted)] py-10 text-center">
          {ar ? "مفيش رسايل هنا." : "Nothing here."}
        </p>
      )}

      <ul className="space-y-3">
        {messages.map((m) => (
          <li key={m._id} className="bg-white rounded-2xl border border-gray-200 p-5">
            <div className="flex flex-wrap items-start gap-2 mb-2">
              <span className={`text-xs font-semibold rounded-full border px-2.5 py-0.5 ${TONE[m.status]}`}>
                {ar
                  ? STATUSES.find((s) => s.key === m.status)?.ar
                  : STATUSES.find((s) => s.key === m.status)?.en}
              </span>
              {m.source === "product-quote" && (
                <span className="text-xs font-semibold rounded-full border border-amber-200 bg-amber-50 text-amber-700 px-2.5 py-0.5">
                  {ar ? "طلب سعر" : "Price request"}
                </span>
              )}
              <span className="text-xs text-gray-400 ms-auto tabular-nums">{when(m.createdAt)}</span>
            </div>

            <h2 className="text-base font-semibold text-gray-900">
              {m.subject || (ar ? "بدون موضوع" : "No subject")}
            </h2>

            <p className="text-sm text-gray-500 mt-0.5">
              {m.name}
              {" · "}
              <a href={`mailto:${m.email}`} className="text-[var(--brand-primary,#00A8E8)] hover:underline">
                {m.email}
              </a>
              {m.phone && (
                <>
                  {" · "}
                  <a href={`tel:${m.phone}`} className="text-[var(--brand-primary,#00A8E8)] hover:underline" dir="ltr">
                    {m.phone}
                  </a>
                </>
              )}
              {m.company && ` · ${m.company}`}
            </p>

            <p className="mt-3 text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{m.message}</p>

            {m.handledBy?.name && (
              <p className="mt-2 text-xs text-gray-400">
                {ar ? "اتعامل معاها: " : "Handled by "}
                {m.handledBy.name}
              </p>
            )}

            <div className="mt-4 flex flex-wrap gap-2">
              <a
                href={`mailto:${m.email}?subject=${encodeURIComponent(
                  `Re: ${m.subject || "your message"}`
                )}`}
                className="rounded-xl bg-[var(--brand-primary,#00A8E8)] px-3.5 py-2 text-sm font-semibold text-white hover:shadow-md transition-all"
              >
                {ar ? "رد بالإيميل" : "Reply by email"}
              </a>
              {(["read", "replied", "closed"] as Status[])
                .filter((s) => s !== m.status)
                .map((s) => (
                  <button
                    key={s}
                    type="button"
                    disabled={busy === m._id}
                    onClick={() => setStatus(m._id, s)}
                    className="rounded-xl border border-gray-200 px-3.5 py-2 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors"
                  >
                    {ar
                      ? `علّمها ${STATUSES.find((x) => x.key === s)?.ar}`
                      : `Mark ${STATUSES.find((x) => x.key === s)?.en?.toLowerCase()}`}
                  </button>
                ))}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ContactMessagesPage;
