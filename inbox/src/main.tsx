import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { isAxiosError } from "axios";
import Team from "./Team";
import Overview from "./Overview";
import { ArrowLeftOnRectangleIcon, ChatBubbleLeftRightIcon, Squares2X2Icon, SparklesIcon, UserGroupIcon } from "@heroicons/react/24/outline";
import SocialInboxPage, { channels, type Channel } from "./SocialInboxPage";
import Campaigns from "./Campaigns";
import Training from "./Training";
import { axiosInstance } from "./api";
import "./style.css";

function App() {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [view, setView] = useState<"overview" | Channel | "campaigns" | "team" | "training">("overview");
  const [invite, setInvite] = useState(() => new URLSearchParams(location.hash.slice(1)).get("invite") || "");
  const [loginEmail, setLoginEmail] = useState("");
  const [password, setPassword] = useState("");
  const [checking, setChecking] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const interceptor = axiosInstance.interceptors.response.use(
      (response) => response,
      (error) => {
        if (isAxiosError(error) && error.response?.status === 401) setEmail("");
        return Promise.reject(error);
      }
    );
    const controller = new AbortController();
    axiosInstance.get<{ email: string; role: string }>("/social-inbox/session", { signal: controller.signal })
      .then(({ data }) => { setEmail(data.email); setRole(data.role); })
      .catch((error: unknown) => {
        if (isAxiosError(error) && error.response?.status === 503) {
          setNotice("حساب الدخول الخاص بالصندوق لسه بيتجهّز.");
        }
      })
      .finally(() => { if (!controller.signal.aborted) setChecking(false); });
    return () => {
      controller.abort();
      axiosInstance.interceptors.response.eject(interceptor);
    };
  }, []);

  const [alerts, setAlerts] = useState<Partial<Record<Channel, number>>>({});
  useEffect(() => {
    if (!email) return;
    const controller = new AbortController();
    const refresh = async () => {
      try {
        const { data } = await axiosInstance.get<{ channels: { channel: Channel; waiting: number }[] }>("/social-inbox/overview", { signal: controller.signal });
        if (!controller.signal.aborted) setAlerts(Object.fromEntries(data.channels.map(({ channel, waiting }) => [channel, waiting])));
      } catch { /* The next refresh will retry. */ }
    };
    void refresh();
    const timer = window.setInterval(() => { if (!document.hidden) void refresh(); }, 15000);
    return () => { controller.abort(); window.clearInterval(timer); };
  }, [email, view]);

  const logIn = async () => {
    setBusy(true);
    setNotice("");
    try {
      const { data } = await axiosInstance.post<{ email: string; role: string }>(invite ? "/social-inbox/activate" : "/social-inbox/login", invite ? { token: invite, password } : { email: loginEmail, password });
      setRole(data.role);
      setView("overview");
      if (invite) { history.replaceState(null, "", location.pathname + location.search); setInvite(""); }
      setEmail(data.email);
      setPassword("");
    } catch (error) {
      const status = isAxiosError(error) ? error.response?.status : undefined;
      setNotice(status === 400 && invite ? "رابط التفعيل غير صالح أو كلمة السر غير مقبولة." : status === 401 ? "الإيميل أو كلمة السر غير صحيحين." :
        status === 429 ? "محاولات كتير. جرّب بعد شوية." : "تعذّر تسجيل الدخول دلوقتي.");
    } finally {
      setBusy(false);
    }
  };

  const logOut = async () => {
    setNotice("");
    try {
      await axiosInstance.post("/social-inbox/logout");
      setEmail("");
    } catch {
      setNotice("تعذّر تسجيل الخروج. جرّب مرة تانية.");
    }
  };

  if (checking) return <main className="mx-auto max-w-lg p-8" role="status">جاري التحميل…</main>;
  if (!email || invite) return (
    <main className="mx-auto max-w-md px-4 py-16 sm:py-24">
      <form className="space-y-4 rounded-2xl border border-[var(--border)] bg-white p-6 shadow-sm"
        onSubmit={(event) => { event.preventDefault(); void logIn(); }}>
        <h1 className="text-2xl font-semibold">صندوق رسائل بالجملة</h1>
        {notice && <p role="alert" className="text-sm text-red-800">{notice}</p>}
        {!invite && <label className="block text-sm font-medium">إيميل الصندوق
          <input className="mt-1 block w-full rounded-lg border border-[var(--border)] p-3" dir="ltr"
            type="email" autoComplete="username" value={loginEmail} onChange={(event) => setLoginEmail(event.target.value)} required />
        </label>}
        <label className="block text-sm font-medium">كلمة السر
          <input className="mt-1 block w-full rounded-lg border border-[var(--border)] p-3" dir="ltr"
            type="password" autoComplete={invite ? "new-password" : "current-password"} minLength={invite ? 12 : undefined} maxLength={72} value={password} onChange={(event) => setPassword(event.target.value)} required />
        </label>
        <button className="w-full rounded-lg bg-[var(--primary)] p-3 font-semibold text-white disabled:opacity-50" disabled={busy}>{invite ? "تفعيل الحساب" : "دخول"}</button>
      </form>
    </main>
  );

  const nav = [
    { id: "overview", label: "نظرة عامة", icon: Squares2X2Icon },
    ...(Object.keys(channels) as Channel[]).map((channel) => ({ id: channel, label: channels[channel], icon: ChatBubbleLeftRightIcon })),
    { id: "campaigns", label: "إرسال جماعي", icon: ChatBubbleLeftRightIcon },
    ...(role === "owner" ? [{ id: "training", label: "تدريب المساعد", icon: SparklesIcon }, { id: "team", label: "إدارة الفريق", icon: UserGroupIcon }] as const : []),
  ] as const;

  return (
    <div className="workspace" dir="rtl">
      <aside className="workspace-sidebar">
        <div className="workspace-brand">
          <span aria-hidden="true">B</span>
          <div><strong>بالجملة</strong><small>صندوق الرسائل</small></div>
        </div>
        <nav aria-label="لوحة صندوق الرسائل">
          {nav.map(({ id, label, icon: Icon }) => <button
            key={id} type="button" aria-current={view === id ? "page" : undefined} onClick={() => setView(id)}
          ><Icon aria-hidden="true" /><span>{label}</span>{id in channels && Boolean(alerts[id as Channel]) && <bdi className="ms-auto rounded-full bg-[#51d4f2] px-2 text-xs font-semibold text-[#102432]" aria-label={alerts[id as Channel] + " محادثة في انتظار الرد"} title="محادثات في انتظار الرد">{alerts[id as Channel]}</bdi>}</button>)}
        </nav>
        <div className="workspace-account">
          <bdi title={email}>{email}</bdi>
          <button type="button" onClick={() => void logOut()} aria-label="تسجيل الخروج"><ArrowLeftOnRectangleIcon aria-hidden="true" /></button>
        </div>
      </aside>
      <main className="workspace-content">
        {notice && <p role="alert" className="mb-4 text-sm text-red-800">{notice}</p>}
        {view === "overview" && <Overview openInbox={() => setView("whatsapp")} />}
        {view in channels && <SocialInboxPage key={view} channel={view as Channel} />}
        <div hidden={view !== "campaigns"}><Campaigns /></div>
        {view === "team" && role === "owner" && <Team />}
        {view === "training" && role === "owner" && <Training />}
      </main>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
