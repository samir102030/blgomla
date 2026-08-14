import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import { axiosInstance } from "../../lib/axios";

interface Channel {
  _id: string;
  label: string;
  method: "card" | "installment";
  integrationId: string;
  iframeId: string;
  hasOwnApiKey: boolean;
  apiKeyHint: string | null;
  isActive: boolean;
  notes: string;
}

const BLANK = {
  label: "",
  method: "card" as "card" | "installment",
  integrationId: "",
  iframeId: "",
  apiKey: "",
  notes: "",
};

const PaymobChannelsPage: React.FC = () => {
  const { t } = useTranslation();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [encryptionReady, setEncryptionReady] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...BLANK });
  const [showForm, setShowForm] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await axiosInstance.get("/paymob-channels");
      setChannels(data.channels);
      setEncryptionReady(data.encryptionReady);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || t("paymob.loadFailed", "تعذّر تحميل القنوات"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openNew = () => {
    setEditingId(null);
    setForm({ ...BLANK });
    setShowForm(true);
  };

  const openEdit = (c: Channel) => {
    setEditingId(c._id);
    // The stored key can't be read back, so the field starts empty and is only
    // sent when the admin actually types a replacement.
    setForm({
      label: c.label,
      method: c.method,
      integrationId: c.integrationId,
      iframeId: c.iframeId,
      apiKey: "",
      notes: c.notes || "",
    });
    setShowForm(true);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        label: form.label,
        method: form.method,
        integrationId: form.integrationId.trim(),
        iframeId: form.iframeId.trim(),
        notes: form.notes,
      };
      // Omitted entirely when untouched, so editing a label never wipes a key.
      if (form.apiKey.trim()) body.apiKey = form.apiKey.trim();

      if (editingId) {
        await axiosInstance.put(`/paymob-channels/${editingId}`, body);
        toast.success(t("paymob.updated", "اتحدثت"));
      } else {
        await axiosInstance.post("/paymob-channels", body);
        toast.success(t("paymob.created", "اتضافت"));
      }
      setShowForm(false);
      await load();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || t("paymob.saveFailed", "تعذّر الحفظ"));
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (c: Channel) => {
    try {
      await axiosInstance.patch(`/paymob-channels/${c._id}/active`, {
        isActive: !c.isActive,
      });
      await load();
      toast.success(
        c.isActive
          ? t("paymob.deactivated", "اتعطّلت")
          : t("paymob.activated", "بقت هي المستخدمة في الشيك أوت")
      );
    } catch (err: any) {
      toast.error(err?.response?.data?.message || t("paymob.toggleFailed", "تعذّر التغيير"));
    }
  };

  const remove = async (c: Channel) => {
    if (!window.confirm(t("paymob.confirmDelete", `تمسح "${c.label}"؟`))) return;
    try {
      await axiosInstance.delete(`/paymob-channels/${c._id}`);
      await load();
      toast.success(t("paymob.deleted", "اتمسحت"));
    } catch (err: any) {
      toast.error(err?.response?.data?.message || t("paymob.deleteFailed", "تعذّر المسح"));
    }
  };

  const methodLabel = (m: string) =>
    m === "installment" ? t("paymob.installment", "تقسيط") : t("paymob.card", "بطاقات (فيزا/ماستر)");

  const byMethod = (m: "card" | "installment") => channels.filter((c) => c.method === m);

  if (loading) {
    return <p className="p-6 text-sm text-[var(--text-muted)]">{t("common.loading", "بيحمّل…")}</p>;
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text)]">
            {t("paymob.title", "قنوات الدفع — Paymob")}
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-[var(--text-muted)]">
            {t(
              "paymob.subtitle",
              "القناة بتحدد الجهة اللي بتنفّذ الدفع والصفحة اللي العميل بيشوفها. المبلغ ورقم الأوردر بيتحسبوا من الأوردر نفسه في كل عملية، فمفيش قناة تقدر تغيّرهم."
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={openNew}
          className="rounded-lg bg-[#002B5B] px-4 py-2 text-sm font-semibold text-white hover:bg-[#001a3d]"
        >
          + {t("paymob.add", "قناة جديدة")}
        </button>
      </header>

      {!encryptionReady && (
        <div className="rounded-lg border border-amber-500 bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
          {t(
            "paymob.noKey",
            "متغير SECRET_ENCRYPTION_KEY مش متظبط على السيرفر. تقدر تضيف قنوات عادي، بس مش هتقدر تحفظ مفتاح Paymob خاص بقناة لحد ما يتظبط."
          )}
        </div>
      )}

      {showForm && (
        <form
          onSubmit={submit}
          className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 space-y-3"
        >
          <h2 className="text-sm font-bold text-[var(--text)]">
            {editingId ? t("paymob.editing", "تعديل قناة") : t("paymob.adding", "قناة جديدة")}
          </h2>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs font-medium text-[var(--text-muted)]">
              {t("paymob.label", "الاسم")}
              <input
                required
                value={form.label}
                onChange={(e) => setForm({ ...form, label: e.target.value })}
                placeholder={t("paymob.labelHint", "مثلاً: بنك مصر — بطاقات")}
                className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm text-[var(--text)]"
              />
            </label>

            <label className="text-xs font-medium text-[var(--text-muted)]">
              {t("paymob.method", "بتخدم أنهي طريقة دفع")}
              <select
                value={form.method}
                disabled={Boolean(editingId)}
                onChange={(e) =>
                  setForm({ ...form, method: e.target.value as "card" | "installment" })
                }
                className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm text-[var(--text)] disabled:opacity-60"
              >
                <option value="card">{methodLabel("card")}</option>
                <option value="installment">{methodLabel("installment")}</option>
              </select>
            </label>

            <label className="text-xs font-medium text-[var(--text-muted)]">
              Integration ID
              <input
                required
                dir="ltr"
                value={form.integrationId}
                onChange={(e) => setForm({ ...form, integrationId: e.target.value })}
                className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm font-mono text-[var(--text)]"
              />
            </label>

            <label className="text-xs font-medium text-[var(--text-muted)]">
              Iframe ID
              <input
                required
                dir="ltr"
                value={form.iframeId}
                onChange={(e) => setForm({ ...form, iframeId: e.target.value })}
                className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm font-mono text-[var(--text)]"
              />
            </label>
          </div>

          <label className="block text-xs font-medium text-[var(--text-muted)]">
            {t("paymob.apiKey", "مفتاح Paymob خاص بالقناة دي (اختياري)")}
            <input
              type="password"
              dir="ltr"
              autoComplete="new-password"
              value={form.apiKey}
              onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
              placeholder={
                editingId
                  ? t("paymob.keyUnchanged", "سيبه فاضي عشان تسيب المفتاح المحفوظ زي ما هو")
                  : t("paymob.keyOptional", "سيبه فاضي عشان يستخدم مفتاح السيرفر")
              }
              className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm font-mono text-[var(--text)]"
            />
            <span className="mt-1 block text-[11px] text-[var(--text-subtle)]">
              {t(
                "paymob.apiKeyHint",
                "لو عندك أكتر من حساب تاجر على Paymob. بيتخزن مشفّر، ومش بيترجع للواجهة تاني."
              )}
            </span>
          </label>

          <label className="block text-xs font-medium text-[var(--text-muted)]">
            {t("paymob.notes", "ملاحظات")}
            <input
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="mt-1 w-full rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm text-[var(--text)]"
            />
          </label>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-[#002B5B] px-4 py-2 text-sm font-semibold text-white hover:bg-[#001a3d] disabled:opacity-50"
            >
              {saving ? t("paymob.saving", "بيحفظ…") : t("paymob.save", "احفظ")}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm text-[var(--text-muted)] hover:bg-[var(--surface-2)]"
            >
              {t("common.cancel", "إلغاء")}
            </button>
          </div>
        </form>
      )}

      {(["card", "installment"] as const).map((method) => {
        const rows = byMethod(method);
        const live = rows.find((c) => c.isActive);
        return (
          <section key={method} className="space-y-2">
            <div className="flex flex-wrap items-baseline gap-2">
              <h2 className="text-sm font-bold text-[var(--text)]">{methodLabel(method)}</h2>
              {rows.length > 0 && !live && (
                <span className="text-xs text-amber-600 dark:text-amber-400">
                  {t("paymob.noneActive", "مفيش قناة مفعّلة — الشيك أوت بيستخدم إعدادات السيرفر")}
                </span>
              )}
            </div>

            {rows.length === 0 ? (
              <p className="rounded-lg border border-dashed border-[var(--border)] px-4 py-5 text-center text-xs text-[var(--text-subtle)]">
                {t("paymob.none", "مفيش قنوات — الشيك أوت بيستخدم إعدادات السيرفر")}
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {rows.map((c) => (
                  <li
                    key={c._id}
                    className={`flex flex-wrap items-center gap-3 rounded-lg border bg-[var(--surface)] px-3 py-3 ${
                      c.isActive
                        ? "border-emerald-500/60"
                        : "border-[var(--border)] opacity-75"
                    }`}
                  >
                    <span
                      className={`shrink-0 rounded px-2 py-1 text-xs font-semibold ${
                        c.isActive
                          ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                          : "bg-[var(--surface-2)] text-[var(--text-muted)]"
                      }`}
                    >
                      {c.isActive ? t("paymob.live", "شغّالة") : t("paymob.off", "متوقفة")}
                    </span>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-[var(--text)]">{c.label}</p>
                      <p className="truncate font-mono text-[11px] text-[var(--text-subtle)]" dir="ltr">
                        integration {c.integrationId} · iframe {c.iframeId}
                        {c.hasOwnApiKey ? ` · key ${c.apiKeyHint}` : ""}
                      </p>
                      {c.notes && (
                        <p className="truncate text-xs text-[var(--text-muted)]">{c.notes}</p>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => toggle(c)}
                      className="shrink-0 rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--text)] hover:bg-[var(--surface-2)]"
                    >
                      {c.isActive ? t("paymob.turnOff", "أوقفها") : t("paymob.turnOn", "فعّلها")}
                    </button>
                    <button
                      type="button"
                      onClick={() => openEdit(c)}
                      className="shrink-0 rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs text-[var(--text-muted)] hover:bg-[var(--surface-2)]"
                    >
                      {t("common.edit", "تعديل")}
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(c)}
                      disabled={c.isActive}
                      title={c.isActive ? t("paymob.stopFirst", "أوقفها الأول") : ""}
                      className="shrink-0 rounded-lg px-2 py-1.5 text-xs text-[var(--text-subtle)] hover:bg-red-500/10 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-30"
                    >
                      {t("common.delete", "حذف")}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
};

export default PaymobChannelsPage;
