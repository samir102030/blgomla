import { useEffect, useState } from "react";
import { isAxiosError } from "axios";
import { axiosInstance } from "./api";

type Member = { email: string; status: "active" | "pending" | "expired" };
const statuses = { active: "مفعّل", pending: "في انتظار التفعيل", expired: "الدعوة انتهت" };

export default function Team() {
  const [members, setMembers] = useState<Member[]>([]);
  const [email, setEmail] = useState("");
  const [link, setLink] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  const refresh = async () => {
    const { data } = await axiosInstance.get<{ items: Member[] }>("/social-inbox/members");
    setMembers(data.items);
  };
  useEffect(() => { void refresh().catch(() => setNotice("تعذّر تحميل أعضاء الفريق.")); }, []);

  const invite = async () => {
    setBusy(true);
    setNotice("");
    setLink("");
    try {
      const { data } = await axiosInstance.post<{ url: string }>("/social-inbox/members", { email });
      setLink(data.url);
      setEmail("");
      await refresh();
    } catch (error) {
      const code = isAxiosError(error) ? error.response?.data?.code : undefined;
      setNotice(code === "MEMBER_EXISTS" ? "الحساب متفعّل بالفعل." : "تعذّر إنشاء الدعوة.");
    } finally {
      setBusy(false);
    }
  };

  return <section className="mb-5 space-y-4 rounded-xl border border-[var(--border)] bg-white p-4">
    <h2 className="font-semibold">فريق صندوق الرسائل</h2>
    <form className="flex flex-wrap gap-2" onSubmit={(event) => { event.preventDefault(); void invite(); }}>
      <input aria-label="إيميل العضو" className="rounded border p-2" dir="ltr" placeholder="name@example.com" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
      <button disabled={busy} className="rounded bg-[var(--primary)] px-3 py-2 text-white">إنشاء دعوة</button>
    </form>
    {notice && <p role="status">{notice}</p>}
    {link && <div className="space-y-2">
      <p>ابعت رابط التفعيل للعضو. الرابط صالح لمدة ٢٤ ساعة ويُستخدم مرة واحدة.</p>
      <input aria-label="رابط التفعيل" className="w-full rounded border p-2" readOnly dir="ltr" value={link} onFocus={(event) => event.target.select()} />
    </div>}
    <ul className="divide-y divide-[var(--border)]">
      {members.map((member) => <li key={member.email} className="flex flex-wrap justify-between gap-2 py-2 text-sm">
        <bdi>{member.email}</bdi><span>{statuses[member.status]}</span>
      </li>)}
    </ul>
  </section>;
}
