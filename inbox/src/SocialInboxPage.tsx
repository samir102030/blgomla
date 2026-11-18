import ImageUpload from "./ImageUpload";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowPathIcon, ChatBubbleLeftRightIcon, PaperAirplaneIcon } from "@heroicons/react/24/outline";
import { isAxiosError } from "axios";
import { axiosInstance } from "./api";

export type Channel = "whatsapp" | "messenger" | "instagram";
type Summary = {
  id: string;
  channel: Channel;
  name: string;
  phone?: string;
  status: "bot" | "human" | "closed";
  manualHandoff: boolean;
  handoffReason?: string;
  updatedAt: string;
  replyUntil: string | null;
  channelConnected: boolean;
  lastAgentEmail?: string;
};
type Message = { role: "user" | "assistant" | "agent"; content: string; at?: string; agentEmail?: string; imageUrl?: string; delivery?: string; deliveryError?: number };
type Thread = Summary & { messages: Message[] };

export const channels = {
  whatsapp: "WhatsApp",
  messenger: "Messenger",
  instagram: "Instagram",
} satisfies Record<Channel, string>;

const channelStyles = {
  whatsapp: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  messenger: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
  instagram: "bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-950 dark:text-fuchsia-300",
};

const deliveryLabel: Record<string, string> = {
  accepted: "قبلتها المنصة", sent: "أرسلتها المنصة", delivered: "وصلت",
  read: "اتقرت", failed: "فشل التسليم",
};

const panel = "rounded-xl border border-[var(--border)] bg-[var(--surface-1)]";
const button = "rounded-lg border border-[var(--border)] px-3 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50";
const input = "min-w-0 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm";
const primary = "rounded-lg bg-[var(--primary,#ed6b22)] px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50";

export default function SocialInboxPage({ channel }: { channel: Channel }) {
  const [refreshVersion, setRefreshVersion] = useState(0);
  return (
    <section className="space-y-4 text-[var(--text)]" dir="rtl">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">صندوق الرسائل</h1>
        <button className={button + " inline-flex items-center gap-2"} onClick={() => setRefreshVersion((version) => version + 1)}>
          <ArrowPathIcon className="size-4" />
          تحديث
        </button>
      </header>
      <div className="overflow-x-auto pb-3">
        <div className="grid items-stretch gap-3">
          <ChannelColumn key={channel} channel={channel} refreshVersion={refreshVersion} />
        </div>
      </div>
    </section>
  );
}

function ChannelColumn({ channel, refreshVersion }: { channel: Channel; refreshVersion: number }) {
  const arabic = true;
  const say = (ar: string, en: string) => arabic ? ar : en;
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<Summary[]>([]);
  const [hasNext, setHasNext] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [selectedId, setSelectedId] = useState("");
  const [thread, setThread] = useState<Thread | null>(null);
  const [draft, setDraft] = useState("");
  const [imageMode, setImageMode] = useState(false);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const draftRequest = useRef<string | null>(null);
  const messageList = useRef<HTMLOListElement>(null);
  const initialSelection = useRef(false);
  const selected = thread?.id === selectedId ? thread : null;

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setQuery(search.trim());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [search]);

  const loadList = useCallback(async (signal?: AbortSignal) => {
    try {
      const { data } = await axiosInstance.get<{ items: Summary[]; hasNext: boolean }>("/social-inbox", {
        params: { channel, q: query || undefined, page },
        signal,
      });
      if (!signal?.aborted) {
        setItems(data.items);
        setHasNext(data.hasNext);
        setLoaded(true);
        setError((previous) => previous === "LOAD_LIST" ? "" : previous);
      }
    } catch {
      if (!signal?.aborted) {
        setLoaded(true);
        setError("LOAD_LIST");
      }
    }
  }, [channel, page, query]);

  const loadThread = useCallback(async (id: string, signal?: AbortSignal) => {
    if (!id) return;
    try {
      const { data } = await axiosInstance.get<Thread>("/social-inbox/" + id, { signal });
      if (!signal?.aborted) {
        setThread(data);
        setError((previous) => previous === "LOAD_THREAD" ? "" : previous);
      }
    } catch {
      if (!signal?.aborted) setError("LOAD_THREAD");
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void loadList(controller.signal);
    const timer = window.setInterval(() => {
      if (!document.hidden) void loadList(controller.signal);
    }, 12000);
    return () => { controller.abort(); window.clearInterval(timer); };
  }, [loadList, refreshVersion]);

  useEffect(() => {
    if (!selectedId) return;
    const controller = new AbortController();
    void loadThread(selectedId, controller.signal);
    const timer = window.setInterval(() => {
      if (!document.hidden) void loadThread(selectedId, controller.signal);
    }, 10000);
    return () => { controller.abort(); window.clearInterval(timer); };
  }, [loadThread, selectedId, refreshVersion]);

  const lastMessageAt = selected?.messages.at(-1)?.at;
  useEffect(() => {
    const list = messageList.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [selectedId, lastMessageAt]);

  const chooseThread = (id: string) => {
    setSelectedId(id);
    setThread(null);
    setDraft("");
    draftRequest.current = null;
    setError("");
  };

  useEffect(() => {
    if (initialSelection.current || !items.length) return;
    initialSelection.current = true;
    setSelectedId(items[0].id);
  }, [items]);

  const changeAssignment = async (assignment: "team" | "bot") => {
    if (!selected || busy) return;
    setBusy(true);
    setError("");
    try {
      await axiosInstance.patch("/social-inbox/" + selected.id + "/assignment", { assignment });
      await Promise.all([loadThread(selected.id), loadList()]);
    } catch {
      setError("ASSIGNMENT");
    } finally {
      setBusy(false);
    }
  };

  const sendReply = async () => {
    if (!selected || busy || uploading || !draft.trim() || !canReply) return;
    setBusy(true);
    setError("");
    draftRequest.current ??= crypto.randomUUID();
    try {
      await axiosInstance.post("/social-inbox/" + selected.id + "/replies", {
        ...(imageMode ? { imageUrl: draft.trim() } : { text: draft.trim() }),
        requestId: draftRequest.current,
      });
      setDraft("");
      draftRequest.current = null;
      await Promise.all([loadThread(selected.id), loadList()]);
    } catch (err) {
      const code = isAxiosError<{ code?: string }>(err) ? err.response?.data?.code : undefined;
      setError(code || "REPLY_NOT_CONFIRMED");
      await loadThread(selected.id);
    } finally {
      setBusy(false);
    }
  };

  const windowOpen = Boolean(selected?.replyUntil && new Date(selected.replyUntil).getTime() > Date.now());
  const canReply = Boolean(selected?.channelConnected && windowOpen);
  const errorText: Record<string, string> = {
    INVALID_REPLY: "تأكد من النص أو ارفع الصورة من الجهاز مرة تانية.",
    LOAD_LIST: say("تعذر تحميل المحادثات.", "Could not load conversations."),
    LOAD_THREAD: say("تعذر تحميل الرسائل.", "Could not load messages."),
    ASSIGNMENT: say("تعذر تغيير المسؤول عن الرد.", "Could not update the assignment."),
    REPLY_NOT_CONFIRMED: say("تعذر تأكيد الإرسال. حدّث المحادثة قبل المحاولة مرة تانية.", "Delivery was not confirmed. Refresh the conversation before retrying."),
    CHANNEL_UNAVAILABLE: say("حساب الإرسال ده لسه غير متوصل.", "This sending account is not connected."),
    REPLY_WINDOW_CLOSED: say("نافذة الرد اتقفلت. لازم العميل يبعت رسالة جديدة.", "The reply window has closed. The customer needs to send a new message."),
    THREAD_UNAVAILABLE: say("في تحديث أو رد تاني بيتبعت على المحادثة دي.", "Another update or reply is in progress."),
  };
  const when = (value?: string) => value
    ? new Intl.DateTimeFormat(arabic ? "ar-EG" : "en-GB", { dateStyle: "short", timeStyle: "short" }).format(new Date(value))
    : "";
  const statusText = (row: Summary) => row.status === "human"
    ? say("الفريق", "Team")
    : row.status === "closed" ? say("مغلقة", "Closed") : say("المساعد", "Assistant");

  return (
    <section className={panel + " flex min-w-0 flex-col overflow-hidden"} aria-labelledby={channel + "-title"}>
      <header className={"px-4 py-3 " + channelStyles[channel]}>
        <h2 id={channel + "-title"} className="text-lg font-semibold"><bdi>{channels[channel]}</bdi></h2>
      </header>

      {error && <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">
        {errorText[error] || say("حصل خطأ أثناء العملية.", "Something went wrong.")}
      </p>}

      <aside className="border-b border-[var(--border)]">
        <div className="grid border-b border-[var(--border)] p-3">
          <input className={input} aria-label={"بحث محادثات " + channels[channel]} placeholder={say("الاسم أو الرقم", "Name or phone")} value={search} onChange={(event) => setSearch(event.target.value)} />
        </div>
        <div className="max-h-44 overflow-y-auto divide-y divide-[var(--border)]">
          {!loaded && <p className="p-4 text-sm">{say("جاري التحميل…", "Loading…")}</p>}
          {loaded && !items.length && <p className="p-4 text-sm text-[var(--text-subtle)]">{say("مفيش محادثات مطابقة.", "No matching conversations.")}</p>}
          {items.map((item) => (
            <button type="button" key={item.id} onClick={() => chooseThread(item.id)} disabled={busy}
              aria-pressed={item.id === selectedId}
              className={"block w-full p-3 text-start hover:bg-[var(--surface-2)] " + (item.id === selectedId ? "bg-[var(--surface-2)]" : "")}>
              <span className="flex items-center justify-between gap-2">
                <span className="truncate font-medium">{item.name}</span>
              </span>
              <span className="mt-1 flex flex-wrap justify-between gap-1 text-xs text-[var(--text-subtle)]">
                <time dateTime={item.updatedAt}>{when(item.updatedAt)}</time>
                <span>{statusText(item)}</span>
              </span>
              {item.handoffReason && <span className="mt-1 block truncate text-xs font-medium text-[var(--text-subtle)]">محتاج متابعة من الفريق</span>}
              {item.lastAgentEmail && <span className="mt-1 block truncate text-xs text-[var(--text-subtle)]">آخر رد من الفريق <bdi>{item.lastAgentEmail}</bdi></span>}
            </button>
          ))}
        </div>
        {(page > 1 || hasNext) && <div className="flex justify-between gap-2 border-t border-[var(--border)] p-3">
          <button className={button} disabled={page === 1} onClick={() => setPage(page - 1)}>{say("السابق", "Previous")}</button>
          <button className={button} disabled={!hasNext} onClick={() => setPage(page + 1)}>{say("التالي", "Next")}</button>
        </div>}
      </aside>

      <div className="flex min-h-80 min-w-0 flex-1 flex-col">
        {!selected && (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center text-sm text-[var(--text-subtle)]">
            <ChatBubbleLeftRightIcon className="size-8" />
            {selectedId ? say("جاري تحميل الرسائل…", "Loading messages…") : say("اختار محادثة من القائمة.", "Choose a conversation.")}
          </div>
        )}
        {selected && <>
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border)] p-3 sm:p-4">
            <div className="min-w-0">
              <h3 className="truncate font-semibold">{selected.name}</h3>
              <div className="mt-1 flex items-center gap-2 text-xs">
                <span className="text-[var(--text-subtle)]">{say("الرد مع", "Assigned to")} {statusText(selected)}</span>
              </div>
            </div>
            <button className={button} disabled={busy} onClick={() => void changeAssignment(selected.status === "human" ? "bot" : "team")}>
              {selected.status === "human" ? say("رجّع الرد للمساعد", "Resume assistant") : say("استلم المحادثة", "Take over")}
            </button>
          </div>
          {selected.handoffReason && <p className="border-b border-[var(--border)] px-3 py-2 text-xs text-[var(--text-subtle)]">سبب التحويل: <bdi>{selected.handoffReason}</bdi></p>}
          <ol ref={messageList} className="grid h-[38vh] min-h-48 content-start gap-3 overflow-y-auto p-3 sm:p-4" aria-label={"رسائل " + channels[channel]}>
            {selected.messages.map((message, index) => (
              <li key={index} className={"max-w-[88%] rounded-xl px-3 py-2 " + (message.role === "user" ? "justify-self-start bg-[var(--surface-2)]" : "justify-self-end border border-[var(--border)] bg-[var(--surface-1)]")}>
                <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--text-subtle)]">
                  <span>{message.role === "user" ? say("العميل", "Customer") : message.role === "agent" ? (message.agentEmail ? <bdi>{message.agentEmail}</bdi> : say("الفريق", "Team")) : say("المساعد", "Assistant")}</span>
                  {message.at && <time dateTime={message.at}>{when(message.at)}</time>}
                </div>
                {message.imageUrl ? <img src={message.imageUrl} alt="صورة مرفقة" className="mt-1 max-h-56 rounded-lg object-contain" /> : <p className="mt-1 whitespace-pre-wrap [overflow-wrap:anywhere] text-sm" dir="auto">{message.content}</p>}
                {message.delivery && <p className="mt-1 text-xs text-[var(--text-subtle)]">{deliveryLabel[message.delivery] || message.delivery}{message.deliveryError ? " (" + message.deliveryError + ")" : ""}</p>}
              </li>
            ))}
            {!selected.messages.length && <li className="text-sm text-[var(--text-subtle)]">{say("مفيش رسائل محفوظة.", "No saved messages.")}</li>}
          </ol>
          <form className="border-t border-[var(--border)] p-3 sm:p-4" onSubmit={(event) => { event.preventDefault(); void sendReply(); }}>
            {!canReply && <p className="mb-2 text-sm text-[var(--text-subtle)]">
              {!selected.channelConnected ? say("حساب الإرسال غير متوصل.", "This sending account is not connected.") : say("نافذة الرد اتقفلت. لازم العميل يبعت رسالة جديدة.", "The reply window has closed. The customer needs to send a new message.")}
            </p>}
            <label className="mb-2 flex items-center gap-2 text-sm"><input type="checkbox" checked={imageMode} disabled={busy} onChange={(event) => { setImageMode(event.target.checked); setDraft(""); draftRequest.current = null; }} />إرفاق صورة</label>
            {imageMode && <ImageUpload disabled={!canReply || busy || uploading} onBusy={setUploading} onUploaded={(url) => { setDraft(url); draftRequest.current = null; }} />}
            {imageMode && draft && <img className="my-2 max-h-44 rounded-lg border object-contain" src={draft} alt="معاينة الصورة" />}
            <div className="flex items-end gap-2">
              {!imageMode && <textarea className={input + " flex-1 resize-y"} rows={2} maxLength={950} dir="auto"
                aria-label={say("اكتب رد", "Write a reply")} placeholder="اكتب رد… أو الصق رابط بوست" disabled={!canReply || busy}
                value={draft} onChange={(event) => { setDraft(event.target.value); draftRequest.current = null; }} />}
              <button type="submit" className={primary + " inline-flex items-center gap-2"} disabled={!canReply || busy || uploading || !draft.trim()}>
                <PaperAirplaneIcon className="size-4" />
                {say("إرسال", "Send")}
              </button>
            </div>
          </form>
        </>}
      </div>
    </section>
  );
}
