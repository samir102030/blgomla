import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { XMarkIcon, PlusIcon, TrashIcon } from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import {
  useInstallationServiceStore,
  type InstallationService,
  type InstallationFeature,
} from "../../stores/installationService.store";
import { SLIDE_ICON_KEYS, slideIcon } from "../manus/icons";
import ImageField from "./ImageField";
import LinkPicker from "./LinkPicker";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  service?: InstallationService | null;
}

interface FormState {
  title: string;
  titleAr: string;
  description: string;
  descriptionAr: string;
  image: string;
  icon: string;
  features: InstallationFeature[];
  priceFrom: number;
  priceNote: string;
  priceNoteAr: string;
  badge: string;
  badgeAr: string;
  href: string;
  ctaLabel: string;
  ctaLabelAr: string;
  isActive: boolean;
}

const EMPTY: FormState = {
  title: "",
  titleAr: "",
  description: "",
  descriptionAr: "",
  image: "",
  icon: "wrench",
  features: [],
  priceFrom: 0,
  priceNote: "",
  priceNoteAr: "",
  badge: "",
  badgeAr: "",
  href: "/contact",
  ctaLabel: "",
  ctaLabelAr: "",
  isActive: true,
};

const InstallationServiceModal: React.FC<Props> = ({ isOpen, onClose, service }) => {
  const { t } = useTranslation();
  const { createService, updateService } = useInstallationServiceStore();
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    if (service) {
      setForm({
        title: service.title || "",
        titleAr: service.titleAr || "",
        description: service.description || "",
        descriptionAr: service.descriptionAr || "",
        image: service.image || "",
        icon: service.icon || "wrench",
        features: (service.features || []).map((feature) => ({ ...feature })),
        priceFrom: service.priceFrom || 0,
        priceNote: service.priceNote || "",
        priceNoteAr: service.priceNoteAr || "",
        badge: service.badge || "",
        badgeAr: service.badgeAr || "",
        href: service.href || "/contact",
        ctaLabel: service.ctaLabel || "",
        ctaLabelAr: service.ctaLabelAr || "",
        isActive: service.isActive ?? true,
      });
    } else {
      setForm({ ...EMPTY, features: [] });
    }
  }, [isOpen, service]);

  if (!isOpen) return null;

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const setFeature = (index: number, patch: Partial<InstallationFeature>) =>
    setForm((prev) => ({
      ...prev,
      features: prev.features.map((feature, position) =>
        position === index ? { ...feature, ...patch } : feature
      ),
    }));

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!form.title.trim() && !form.titleAr.trim()) {
      toast.error(t("installAdmin.needTitle", "The service needs a name, in at least one language."));
      return;
    }

    const payload = {
      ...form,
      title: form.title.trim() || form.titleAr.trim(),
      priceFrom: Number.isFinite(form.priceFrom) ? Math.max(0, form.priceFrom) : 0,
      features: form.features.filter((feature) => feature.text.trim() || feature.textAr?.trim()),
    };

    setSaving(true);
    const ok = service ? await updateService(service._id, payload) : await createService(payload);
    setSaving(false);

    if (ok) {
      toast.success(service ? t("installAdmin.saved", "Service saved") : t("installAdmin.created", "Service added"));
      onClose();
    } else {
      toast.error(
        useInstallationServiceStore.getState().error ||
          t("installAdmin.saveFailed", "Could not save the service")
      );
    }
  };

  const field =
    "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00A8E8] focus:border-transparent";
  const labelClass = "block text-sm font-medium text-gray-700 mb-1";

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4">
      <div className="my-8 w-full max-w-3xl rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-bold text-gray-900">
            {service
              ? t("installAdmin.editService", "Edit installation service")
              : t("installAdmin.newService", "New installation service")}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            aria-label={t("Close", "Close")}
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 px-6 py-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>{t("installAdmin.title", "Service name")} (EN)</label>
              <input className={field} value={form.title} onChange={(e) => set("title", e.target.value)} dir="ltr" />
            </div>
            <div>
              <label className={labelClass}>{t("installAdmin.title", "Service name")} (AR)</label>
              <input className={field} value={form.titleAr} onChange={(e) => set("titleAr", e.target.value)} dir="rtl" />
            </div>
            <div>
              <label className={labelClass}>{t("installAdmin.description", "Description")} (EN)</label>
              <textarea
                rows={3}
                className={field}
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                dir="ltr"
              />
            </div>
            <div>
              <label className={labelClass}>{t("installAdmin.description", "Description")} (AR)</label>
              <textarea
                rows={3}
                className={field}
                value={form.descriptionAr}
                onChange={(e) => set("descriptionAr", e.target.value)}
                dir="rtl"
              />
            </div>
          </div>

          <ImageField
            value={form.image}
            onChange={(url) => set("image", url)}
            label={t("installAdmin.image", "Card image")}
            aspect="card"
          />

          <div>
            <span className={labelClass}>{t("installAdmin.icon", "Icon")}</span>
            <div className="flex flex-wrap gap-1.5">
              {SLIDE_ICON_KEYS.map((key) => {
                const Icon = slideIcon(key);
                const active = form.icon === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => set("icon", key)}
                    title={key}
                    aria-pressed={active}
                    className={`flex h-9 w-9 items-center justify-center rounded-lg border transition-colors ${
                      active
                        ? "border-[#00A8E8] bg-[#00A8E8]/10 text-[#0077B6]"
                        : "border-gray-300 bg-white text-gray-500 hover:bg-gray-50"
                    }`}
                  >
                    <Icon size={18} />
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-900">
                {t("installAdmin.features", "What the job includes")}
              </span>
              <button
                type="button"
                onClick={() => set("features", [...form.features, { text: "", textAr: "" }])}
                className="flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
              >
                <PlusIcon className="h-4 w-4" />
                {t("installAdmin.addFeature", "Add a line")}
              </button>
            </div>

            {form.features.map((feature, index) => (
              <div key={index} className="flex items-start gap-2">
                <input
                  className={field}
                  placeholder="EN"
                  value={feature.text}
                  onChange={(e) => setFeature(index, { text: e.target.value })}
                  dir="ltr"
                />
                <input
                  className={field}
                  placeholder="AR"
                  value={feature.textAr || ""}
                  onChange={(e) => setFeature(index, { textAr: e.target.value })}
                  dir="rtl"
                />
                <button
                  type="button"
                  onClick={() =>
                    set(
                      "features",
                      form.features.filter((_, position) => position !== index)
                    )
                  }
                  className="mt-1 rounded p-1.5 text-red-500 hover:bg-red-50"
                  aria-label={t("installAdmin.removeFeature", "Remove this line")}
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className={labelClass}>{t("installAdmin.priceFrom", "Starts at (EGP)")}</label>
              <input
                type="number"
                min={0}
                className={field}
                value={form.priceFrom}
                onChange={(e) => set("priceFrom", Number(e.target.value))}
                dir="ltr"
              />
              <p className="mt-1 text-[11px] text-gray-500">
                {t("installAdmin.priceZero", "Leave it at 0 to say the price follows a site visit.")}
              </p>
            </div>
            <div>
              <label className={labelClass}>{t("installAdmin.priceNote", "Price note")} (EN)</label>
              <input
                className={field}
                placeholder="per camera"
                value={form.priceNote}
                onChange={(e) => set("priceNote", e.target.value)}
                dir="ltr"
              />
            </div>
            <div>
              <label className={labelClass}>{t("installAdmin.priceNote", "Price note")} (AR)</label>
              <input
                className={field}
                placeholder="للكاميرا"
                value={form.priceNoteAr}
                onChange={(e) => set("priceNoteAr", e.target.value)}
                dir="rtl"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>{t("installAdmin.badge", "Corner badge")} (EN)</label>
              <input className={field} value={form.badge} onChange={(e) => set("badge", e.target.value)} dir="ltr" />
            </div>
            <div>
              <label className={labelClass}>{t("installAdmin.badge", "Corner badge")} (AR)</label>
              <input className={field} value={form.badgeAr} onChange={(e) => set("badgeAr", e.target.value)} dir="rtl" />
            </div>
            <div>
              <label className={labelClass}>{t("installAdmin.cta", "Button label")} (EN)</label>
              <input
                className={field}
                placeholder="Browse the gear"
                value={form.ctaLabel}
                onChange={(e) => set("ctaLabel", e.target.value)}
                dir="ltr"
              />
            </div>
            <div>
              <label className={labelClass}>{t("installAdmin.cta", "Button label")} (AR)</label>
              <input
                className={field}
                placeholder="تصفّح الأجهزة"
                value={form.ctaLabelAr}
                onChange={(e) => set("ctaLabelAr", e.target.value)}
                dir="rtl"
              />
            </div>
          </div>

          <LinkPicker
            label={t("installAdmin.href", "Where the button goes")}
            value={form.href}
            onChange={(href) => set("href", href)}
          />

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => set("isActive", e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-[#00A8E8] focus:ring-[#00A8E8]"
            />
            <span className="text-sm text-gray-700">
              {t("installAdmin.active", "Show this service on the installations page")}
            </span>
          </label>

          <div className="flex justify-end gap-3 border-t border-gray-200 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              {t("Cancel", "Cancel")}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-[#002B5B] px-4 py-2 text-sm font-semibold text-white hover:bg-[#003d80] disabled:opacity-60"
            >
              {saving ? t("Saving…", "Saving…") : t("action.save", "Save")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default InstallationServiceModal;
