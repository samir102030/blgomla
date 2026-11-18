import { useEffect, useState } from "react";
import { ArrowPathIcon, ChatBubbleLeftRightIcon, ClockIcon, SparklesIcon, UserGroupIcon } from "@heroicons/react/24/outline";
import { axiosInstance } from "./api";

type ChannelStats = {
  channel: "whatsapp" | "messenger" | "instagram";
  connected: boolean;
  total: number;
  team: number;
  assistant: number;
  recent: number;
};

const names = { whatsapp: "WhatsApp", messenger: "Messenger", instagram: "Instagram" };
const number = new Intl.NumberFormat("ar-EG");
const metrics = [
  { key: "total", title: "المحادثات المسجّلة", icon: ChatBubbleLeftRightIcon },
  { key: "recent", title: "نشِطة آخر ٢٤ ساعة", icon: ClockIcon },
  { key: "assistant", title: "مع المساعد", icon: SparklesIcon },
  { key: "team", title: "مع الفريق", icon: UserGroupIcon },
] as const;

export default function Overview({ openInbox }: { openInbox: () => void }) {
  const [data, setData] = useState<ChannelStats[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setFailed(false);
    axiosInstance.get<{ channels: ChannelStats[] }>("/social-inbox/overview", { signal: controller.signal })
      .then(({ data }) => setData(data.channels))
      .catch(() => { if (!controller.signal.aborted) setFailed(true); });
    return () => controller.abort();
  }, [revision]);

  const max = Math.max(1, ...data?.map((row) => row.total) ?? []);
  return <section className="overview">
    <header className="overview-hero">
      <div>
        <h1>نظرة عامة</h1>
        <p>تابع نشاط محادثات العملاء على قنوات بالجملة.</p>
      </div>
      <button type="button" onClick={openInbox}>افتح المحادثات</button>
    </header>
    {failed && <p role="alert" className="text-sm text-red-800">تعذّر تحميل ملخص المحادثات.</p>}
    <div className="overview-metrics">
      {metrics.map(({ key, title, icon: Icon }) => <article key={key} className="overview-metric">
        <Icon aria-hidden="true" />
        <strong>{data ? number.format(data.reduce((sum, row) => sum + row[key], 0)) : "—"}</strong>
        <span>{title}</span>
      </article>)}
    </div>
    <section className="channel-summary" aria-labelledby="channel-summary-title">
      <header>
        <h2 id="channel-summary-title">المحادثات حسب المنصة</h2>
        <button type="button" onClick={() => setRevision((value) => value + 1)} aria-label="تحديث الملخص"><ArrowPathIcon className="size-4" /></button>
      </header>
      {!data && !failed && <p role="status">جاري تحميل القنوات…</p>}
      {data?.map((row) => <div className="channel-summary-row" key={row.channel}>
        <div><strong><bdi>{names[row.channel]}</bdi></strong><span>{row.connected ? "مهيّأة" : "الربط غير متاح"}</span></div>
        <div className="channel-track" aria-hidden="true"><span data-channel={row.channel} style={{ "--share": row.total / max } as React.CSSProperties} /></div>
        <strong>{number.format(row.total)}</strong>
      </div>)}
    </section>
  </section>;
}
