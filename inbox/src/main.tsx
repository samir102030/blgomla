import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { isAxiosError } from "axios";
import Team from "./Team";
import SocialInboxPage from "./SocialInboxPage";
import { axiosInstance } from "./api";
import "./style.css";

function App() {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("");
  const [showTeam, setShowTeam] = useState(false);
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

  const logIn = async () => {
    setBusy(true);
    setNotice("");
    try {
      const { data } = await axiosInstance.post<{ email: string; role: string }>(invite ? "/social-inbox/activate" : "/social-inbox/login", invite ? { token: invite, password } : { email: loginEmail, password });
      setRole(data.role);
      setShowTeam(false);
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

  return (
    <main className="mx-auto max-w-[1920px] p-3 sm:p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <span className="truncate text-sm text-[var(--text-subtle)]" dir="ltr">{email}</span>
        {role === "owner" && <button type="button" className="ms-auto rounded-lg border bg-white px-3 py-2 text-sm" onClick={() => setShowTeam(!showTeam)}>{showTeam ? "المحادثات" : "إدارة الفريق"}</button>}
        <button type="button" className="rounded-lg border border-[var(--border)] bg-white px-3 py-2 text-sm" onClick={() => void logOut()}>خروج</button>
      </div>
      {notice && <p role="alert" className="mb-4 text-sm text-red-800">{notice}</p>}
      {showTeam && role === "owner" ? <Team /> : <SocialInboxPage />}
    </main>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
