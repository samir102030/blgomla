import { useEffect, useState } from "react";
import { isAxiosError } from "axios";
import { axiosInstance } from "./api";

type Example = { question: string; answer: string };
type TrainingSettings = { instructions: string; examples: Example[] };
const endpoint = "/social-inbox/training";

export default function Training() {
  const [settings, setSettings] = useState<TrainingSettings | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setError("");
    axiosInstance.get<TrainingSettings>(endpoint, { signal: controller.signal })
      .then(({ data }) => setSettings(data))
      .catch(() => { if (!controller.signal.aborted) setError("تعذّر تحميل تدريب المساعد."); });
    return () => controller.abort();
  }, [revision]);

  const save = async () => {
    if (!settings || busy) return;
    setBusy(true);
    setNotice("");
    setError("");
    try {
      const { data } = await axiosInstance.put<TrainingSettings>(endpoint, settings);
      setSettings(data);
      setNotice("اتحفظ التدريب. المساعد هيستخدمه في الرسائل الجديدة.");
    } catch (failure) {
      setError(isAxiosError(failure) && failure.response?.data?.code === "DUPLICATE_QUESTION"
        ? "في سؤال متكرر. احذف النسخة الزيادة وحاول تاني."
        : "تعذّر حفظ التدريب. راجع الأسئلة والإجابات وحاول تاني.");
    } finally {
      setBusy(false);
    }
  };

  const editExample = (index: number, patch: Partial<Example>) => {
    setNotice("");
    setSettings((current) => current && {
      ...current, examples: current.examples.map((example, position) =>
        position === index ? { ...example, ...patch } : example),
    });
  };

  return <section className="overview">
    <header className="overview-hero">
      <div><h1>تدريب المساعد</h1><p>إعدادات الردود على واتساب وماسنجر وإنستجرام.</p></div>
    </header>
    {error && <p role="alert" className="text-sm text-red-800">{error}</p>}
    {!settings && (error
      ? <button type="button" className="w-fit underline" onClick={() => setRevision((value) => value + 1)}>إعادة التحميل</button>
      : <p role="status">جاري تحميل الإعدادات…</p>)}
    {settings && <form className="grid gap-4" onSubmit={(event) => { event.preventDefault(); void save(); }}>
      <label className="channel-summary grid gap-2">
        <strong>تعليمات للمساعد</strong>
        <span className="text-sm text-[var(--text-subtle)]">اكتب طريقة الكلام، معلومات الشغل الثابتة، وإمتى تطلب تدخل الفريق.</span>
        <textarea rows={5} maxLength={2500} value={settings.instructions} disabled={busy} dir="auto"
          placeholder="مثال: رد بالمصري باختصار، واسأل عن موديل الجهاز لو السؤال عن التوافق."
          className="rounded-lg border p-3 text-sm" onChange={(event) => {
            setNotice("");
            setSettings({ ...settings, instructions: event.target.value });
          }} />
      </label>
      <section className="channel-summary">
        <header><h2>أسئلة وإجابات محفوظة</h2>
          <button type="button" disabled={busy || settings.examples.length >= 20} onClick={() => {
            setNotice("");
            setSettings({ ...settings, examples: [...settings.examples, { question: "", answer: "" }] });
          }}>إضافة سؤال</button>
        </header>
        <p className="mb-3 text-sm text-[var(--text-subtle)]">السؤال المطابق بياخد الرد المحفوظ مباشرة. استخدمها للمعلومات الثابتة.</p>
        <div className="grid gap-3">
          {settings.examples.map((example, index) => <fieldset className="grid gap-2 rounded-lg border p-3" key={index} disabled={busy}>
            <label className="grid gap-1 text-sm">السؤال
              <input dir="auto" required maxLength={250} className="rounded-lg border p-2" value={example.question} onChange={(event) => editExample(index, { question: event.target.value })} />
            </label>
            <label className="grid gap-1 text-sm">الإجابة
              <textarea dir="auto" required rows={2} maxLength={900} className="rounded-lg border p-2" value={example.answer} onChange={(event) => editExample(index, { answer: event.target.value })} />
            </label>
            <button type="button" className="w-fit text-sm text-red-800" onClick={() => {
              setNotice("");
              setSettings({ ...settings, examples: settings.examples.filter((_, position) => position !== index) });
            }}>حذف السؤال</button>
          </fieldset>)}
        </div>
      </section>
      <div className="flex flex-wrap items-center gap-3">
        <button className="rounded-lg bg-[var(--primary)] px-4 py-2 text-white disabled:opacity-50" disabled={busy}>{busy ? "جاري الحفظ…" : "حفظ التدريب"}</button>
        {notice && <p role="status" className="text-sm">{notice}</p>}
      </div>
    </form>}
  </section>;
}
