import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowPathIcon, ChatBubbleLeftRightIcon, PaperAirplaneIcon } from "@heroicons/react/24/outline";
import { isAxiosError } from "axios";
import { axiosInstance } from "./api";

type Channel = "whatsapp" | "messenger" | "instagram";
type Summary = {
  id: string;
  channel: Channel;
  name: string;
  phone?: string;
  status: "bot" | "human" | "closed";
  manualHandoff: boolean;
  updatedAt: string;
  replyUntil: string | null;
  channelConnected: boolean;
  lastAgentEmail?: string;
};
type Message = { role: "user" | "assistant" | "agent"; content: string; at?: string; agentEmail?: string };
type Thread = Summary & { messages: Message[] };

const channels = {
  whatsapp: "WhatsApp",
  messenger: "Messenger",
  instagram: "Instagram",
} satisfies Record<Channel, string>;

const channelStyles = {
  whatsapp: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  messenger: "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300",
  instagram: "bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-950 dark:text-fuchsia-300",
};

const panel = "rounded-xl border border-[var(--border)] bg-[var(--surface-1)]";
const button = "rounded-lg border border-[var(--border)] px-3 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50";
const input = "min-w-0 rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm";
const primary = "rounded-lg bg-[var(--primary,#ed6b22)] px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50";

export default function SocialInboxPage() {
  const arabic = true;
  const say = (ar: string, en: string) => arabic ? ar : en;
  const [channel, setChannel] = useState<Channel | "">("");
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<Summary[]>([]);
  const [hasNext, setHasNext] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [selectedId, setSelectedId] = useState("");
  const [thread, setThread] = useState<Thread | null>(null);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const draftRequest = useRef<string | null>(null);
  const tail = useRef<HTMLLIElement>(null);
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
        params: { channel: channel || undefined, q: query || undefined, page },
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
  }, [loadList]);

  useEffect(() => {
    if (!selectedId) return;
    const controller = new AbortController();
    void loadThread(selectedId, controller.signal);
    const timer = window.setInterval(() => {
      if (!document.hidden) void loadThread(selectedId, controller.signal);
    }, 10000);
    return () => { controller.abort(); window.clearInterval(timer); };
  }, [loadThread, selectedId]);

  const lastMessageAt = selected?.messages.at(-1)?.at;
  useEffect(() => {
    tail.current?.scrollIntoView({ block: "nearest" });
  }, [selectedId, lastMessageAt]);

  const chooseThread = (id: string) => {
    setSelectedId(id);
    setThread(null);
    setDraft("");
    draftRequest.current = null;
    setError("");
  };

  const refresh = () => {
    void loadList();
    void loadThread(selectedId);
  };

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
    if (!selected || busy || !draft.trim() || !canReply) return;
    setBusy(true);
    setError("");
    draftRequest.current ??= crypto.randomUUID();
    try {
      await axiosInstance.post("/social-inbox/" + selected.id + "/replies", {
        text: draft.trim(),
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
    <section className="space-y-4 text-[var(--text)]" dir={arabic ? "rtl" : "ltr"}>
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">{say("صندوق الرسائل", "Social inbox")}</h1>
        <button className={button + " inline-flex items-center gap-2"} onClick={refresh} disabled={busy}>
          <ArrowPathIcon className="size-4" />
          {say("تحديث", "Refresh")}
        </button>
      </header>

      {error && <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800 dark:bg-red-950 dark:text-red-200">
        {errorText[error] || say("حصل خطأ أثناء العملية.", "Something went wrong.")}
      </p>}

      <div className="grid gap-3 lg:grid-cols-[minmax(260px,1fr)_minmax(0,2fr)]">
        <aside className={panel + (selectedId ? " hidden lg:block" : "")}>
          <div className="grid gap-2 border-b border-[var(--border)] p-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            <input className={input} aria-label={say("بحث المحادثات", "Search conversations")} placeholder={say("الاسم أو الرقم", "Name or phone")} value={search} onChange={(event) => setSearch(event.target.value)} />
            <select className={input} aria-label={say("فلتر القناة", "Filter channel")} value={channel} onChange={(event) => { setChannel(event.target.value as Channel | ""); setPage(1); }}>
              <option value="">{say("كل القنوات", "All channels")}</option>
              {Object.entries(channels).map(([id, label]) => <option value={id} key={id}>{label}</option>)}
            </select>
          </div>
          <div className="max-h-[64vh] overflow-y-auto divide-y divide-[var(--border)]">
            {!loaded && <p className="p-4 text-sm">{say("جاري التحميل…", "Loading…")}</p>}
            {loaded && !items.length && <p className="p-4 text-sm text-[var(--text-subtle)]">{say("مفيش محادثات مطابقة.", "No matching conversations.")}</p>}
            {items.map((item) => (
              <button type="button" key={item.id} onClick={() => chooseThread(item.id)} disabled={busy}
                aria-pressed={item.id === selectedId}
                className={"block w-full p-3 text-start hover:bg-[var(--surface-2)] " + (item.id === selectedId ? "bg-[var(--surface-2)]" : "")}>
                <span className="flex items-center justify-between gap-2">
                  <span className="truncate font-medium">{item.name}</span>
                  <span className={"shrink-0 rounded-full px-2 py-0.5 text-xs " + channelStyles[item.channel]}>{channels[item.channel]}</span>
                </span>
                <span className="mt-1 flex flex-wrap justify-between gap-1 text-xs text-[var(--text-subtle)]">
                  <time dateTime={item.updatedAt}>{when(item.updatedAt)}</time>
                  <span>{statusText(item)}</span>
                </span>
                {item.lastAgentEmail && <span className="mt-1 block truncate text-xs text-[var(--text-subtle)]">آخر رد من الفريق <bdi>{item.lastAgentEmail}</bdi></span>}
              </button>
            ))}
          </div>
          {(page > 1 || hasNext) && <div className="flex justify-between gap-2 border-t border-[var(--border)] p-3">
            <button className={button} disabled={page === 1} onClick={() => setPage(page - 1)}>{say("السابق", "Previous")}</button>
            <button className={button} disabled={!hasNext} onClick={() => setPage(page + 1)}>{say("التالي", "Next")}</button>
          </div>}
        </aside>

        <div className={panel + " min-h-[60vh] min-w-0 flex-col " + (selectedId ? "flex" : "hidden lg:flex")}>
          {!selected && (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center text-sm text-[var(--text-subtle)]">
              <ChatBubbleLeftRightIcon className="size-8" />
              {selectedId ? say("جاري تحميل الرسائل…", "Loading messages…") : say("اختار محادثة من القائمة.", "Choose a conversation.")}
              {selectedId && <button className={button + " lg:hidden"} onClick={() => chooseThread("")}>{say("المحادثات", "Conversations")}</button>}
            </div>
          )}
          {selected && <>
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border)] p-3 sm:p-4">
              <div className="min-w-0">
                <button className={button + " mb-2 lg:hidden"} onClick={() => chooseThread("")} disabled={busy}>{say("كل المحادثات", "All conversations")}</button>
                <h2 className="truncate font-semibold">{selected.name}</h2>
                <div className="mt-1 flex items-center gap-2 text-xs">
                  <span className={"rounded-full px-2 py-0.5 " + channelStyles[selected.channel]}>{channels[selected.channel]}</span>
                  <span className="text-[var(--text-subtle)]">{say("الرد مع", "Assigned to")} {statusText(selected)}</span>
                </div>
              </div>
              <button className={button} disabled={busy} onClick={() => void changeAssignment(selected.status === "human" ? "bot" : "team")}>
                {selected.status === "human" ? say("رجّع الرد للمساعد", "Resume assistant") : say("استلم المحادثة", "Take over")}
              </button>
            </div>
            <ol className="grid max-h-[55vh] flex-1 content-start gap-3 overflow-y-auto p-3 sm:p-4" aria-label={say("الرسائل", "Messages")}>
              {selected.messages.map((message, index) => (
                <li key={index} className={"max-w-[88%] rounded-xl px-3 py-2 " + (message.role === "user" ? "justify-self-start bg-[var(--surface-2)]" : "justify-self-end border border-[var(--border)] bg-[var(--surface-1)]")}>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--text-subtle)]">
                    <span>{message.role === "user" ? say("العميل", "Customer") : message.role === "agent" ? (message.agentEmail ? <bdi>{message.agentEmail}</bdi> : say("الفريق", "Team")) : say("المساعد", "Assistant")}</span>
                    {message.at && <time dateTime={message.at}>{when(message.at)}</time>}
                  </div>
                  <p className="mt-1 whitespace-pre-wrap break-words text-sm" dir="auto">{message.content}</p>
                </li>
              ))}
              {!selected.messages.length && <li className="text-sm text-[var(--text-subtle)]">{say("مفيش رسائل محفوظة.", "No saved messages.")}</li>}
              <li ref={tail} aria-hidden />
            </ol>
            <form className="border-t border-[var(--border)] p-3 sm:p-4" onSubmit={(event) => { event.preventDefault(); void sendReply(); }}>
              {!canReply && <p className="mb-2 text-sm text-[var(--text-subtle)]">
                {!selected.channelConnected ? say("حساب الإرسال غير متوصل.", "This sending account is not connected.") : say("نافذة الرد اتقفلت. لازم العميل يبعت رسالة جديدة.", "The reply window has closed. The customer needs to send a new message.")}
              </p>}
              <div className="flex items-end gap-2">
                <textarea className={input + " flex-1 resize-y"} rows={2} maxLength={1000} dir="auto"
                  aria-label={say("اكتب رد", "Write a reply")} placeholder={say("اكتب رد…", "Write a reply…")} disabled={!canReply || busy}
                  value={draft} onChange={(event) => { setDraft(event.target.value); draftRequest.current = null; }} />
                <button type="submit" className={primary + " inline-flex items-center gap-2"} disabled={!canReply || busy || !draft.trim()}>
                  <PaperAirplaneIcon className="size-4" />
                  {say("إرسال", "Send")}
                </button>
              </div>
            </form>
          </>}
        </div>
      </div>
    </section>
  );
}
