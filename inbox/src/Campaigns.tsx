import ImageUpload from "./ImageUpload";
import { useEffect, useState } from "react";
import { axiosInstance } from "./api";
import { channels, type Channel } from "./SocialInboxPage";

type Recipient = { id: string; name: string; channel: Channel; phone?: string };
type Lists = Partial<Record<Channel, { items: Recipient[]; page: number; hasNext: boolean }>>;
const platformIds = Object.keys(channels) as Channel[];

export default function Campaigns() {
  const [lists, setLists] = useState<Lists>({});
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [draft, setDraft] = useState("");
  const [image, setImage] = useState(false);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState<Partial<Record<Channel, boolean>>>({});
  const [failure, setFailure] = useState<Partial<Record<Channel, boolean>>>({});
  const [result, setResult] = useState("");
  const [confirming, setConfirming] = useState(false);

  const load = async (channel: Channel, page = 1) => {
    setLoading((current) => ({ ...current, [channel]: true }));
    setFailure((current) => ({ ...current, [channel]: false }));
    try {
      const { data } = await axiosInstance.get<{ items: Recipient[]; hasNext: boolean }>("/social-inbox", {
        params: { channel, eligible: true, page },
      });
      setLists((current) => {
        const merged = new Map((page === 1 ? [] : current[channel]?.items ?? []).map((item) => [item.id, item]));
        for (const item of data.items) merged.set(item.id, item);
        return { ...current, [channel]: { items: [...merged.values()], page, hasNext: data.hasNext } };
      });
    } catch {
      setFailure((current) => ({ ...current, [channel]: true }));
    } finally {
      setLoading((current) => ({ ...current, [channel]: false }));
    }
  };

  useEffect(() => { for (const channel of platformIds) void load(channel); }, []);
  const recipients = platformIds.flatMap((channel) => lists[channel]?.items ?? []);
  const targets = recipients.filter((recipient) => selected.has(recipient.id));
  const toggle = (recipients: Recipient[], checked: boolean) => {
    setSelected((current) => {
      const next = new Set(current);
      for (const { id } of recipients) checked ? next.add(id) : next.delete(id);
      return next;
    });
    setConfirming(false);
  };

  const send = async () => {
    if (busy || uploading || !targets.length) return;
    setBusy(true);
    setConfirming(false);
    const unconfirmed: Recipient[] = [];
    const payload = image ? { imageUrl: draft.trim() } : { text: draft.trim() };
    for (const [index, recipient] of targets.entries()) {
      try {
        await axiosInstance.post("/social-inbox/" + recipient.id + "/replies", {
          ...payload, campaign: true, requestId: crypto.randomUUID(),
        });
      } catch {
        unconfirmed.push(recipient);
      }
      setResult("تمت معالجة " + (index + 1) + " من " + targets.length + " محادثة.");
    }
    setSelected(new Set());
    setResult("تم قبول " + (targets.length - unconfirmed.length) + " رسالة من المنصات. القبول لا يؤكد التسليم." +
      (unconfirmed.length ? " لم يتأكد الإرسال لـ " + unconfirmed.map(({ name, channel }) => name + " (" + channels[channel] + ")").join("، ") + ". راجع المحادثات قبل إعادة المحاولة." : ""));
    setBusy(false);
  };

  return <section className="overview">
    <header><h1 className="text-2xl font-bold">إرسال جماعي</h1>
      <p className="mt-2 text-sm text-[var(--text-subtle)]">اختار المحادثات من القنوات اللي فيها نافذة رد مفتوحة. العروض للعملاء اللي وافقوا على استقبالها.</p></header>
    <div className="grid gap-3 xl:grid-cols-3">
      {platformIds.map((channel) => {
        const list = lists[channel];
        const items = list?.items ?? [];
        const all = Boolean(items.length && items.every(({ id }) => selected.has(id)));
        return <section className="rounded-xl border bg-white p-4" key={channel}>
          <h2 className="font-bold"><bdi>{channels[channel]}</bdi></h2>
          {loading[channel] && <p role="status">جاري التحميل…</p>}
          {failure[channel] && <button type="button" className="underline" onClick={() => void load(channel, list ? list.page + 1 : 1)}>تعذّر التحميل. حاول تاني</button>}
          {list && !items.length && <p className="mt-2 text-sm">مفيش محادثات متاحة للإرسال حاليًا.</p>}
          {!!items.length && <label className="my-2 flex items-center gap-2 text-sm font-medium">
            <input type="checkbox" checked={all} disabled={busy} onChange={(event) => toggle(items, event.target.checked)} />اختيار كل الظاهر
          </label>}
          <ul className="max-h-48 overflow-auto">
            {items.map((item) => <li key={item.id}><label className="flex gap-2 py-1 text-sm">
              <input type="checkbox" checked={selected.has(item.id)} disabled={busy} onChange={(event) => toggle([item], event.target.checked)} />
              <bdi>{item.name}</bdi>
            </label></li>)}
          </ul>
          {list?.hasNext && <button type="button" className="mt-2 underline" disabled={busy || loading[channel]} onClick={() => void load(channel, list.page + 1)}>عرض محادثات أكتر</button>}
        </section>;
      })}
    </div>
    <form className="space-y-3 rounded-xl border bg-white p-4" onSubmit={(event) => {
      event.preventDefault();
      if (confirming) void send();
      else setConfirming(true);
    }}>
      <label className="flex gap-2 text-sm"><input type="checkbox" checked={image} disabled={busy} onChange={(event) => { setImage(event.target.checked); setDraft(""); setConfirming(false); }} />إرفاق صورة</label>
      {image && <ImageUpload disabled={busy || uploading} onBusy={setUploading} onUploaded={(url) => { setDraft(url); setConfirming(false); }} />}
      {image && draft && <img className="max-h-52 rounded-lg border object-contain" src={draft} alt="معاينة الصورة" />}
      {!image && <label className="block text-sm">نص الرسالة أو رابط البوست
        <textarea dir="auto" className="mt-1 block w-full rounded-lg border p-2" rows={3} maxLength={image ? 2000 : 950} value={draft} disabled={busy} onChange={(event) => { setDraft(event.target.value); setConfirming(false); }} required />
      </label>}
      {confirming && <p role="status">الرسالة هتتبعت لـ {targets.length} محادثة مختارة. راجع الرسالة والمستلمين قبل التأكيد.</p>}
      <div className="flex flex-wrap gap-2">
        <button className="rounded-lg bg-[var(--primary)] px-3 py-2 text-white disabled:opacity-50" disabled={busy || uploading || !targets.length || !draft.trim()}>
          {confirming ? "تأكيد الإرسال" : "مراجعة الإرسال"} ({targets.length})
        </button>
        {confirming && <button type="button" className="px-3" onClick={() => setConfirming(false)}>إلغاء</button>}
      </div>
      {result && <p className="text-sm" role="status">{result}</p>}
    </form>
  </section>;
}
