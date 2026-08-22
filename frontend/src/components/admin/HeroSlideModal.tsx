import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { XMarkIcon, PlusIcon, TrashIcon } from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import { useHeroSlideStore, type HeroSlide, type HeroSlideButton } from "../../stores/heroSlide.store";
import { SLIDE_ICON_KEYS, slideIcon } from "../manus/icons";
import ImageField from "./ImageField";
import LinkPicker from "./LinkPicker";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  slide?: HeroSlide | null;
}

interface FormState {
  eyebrow: string;
  eyebrowAr: string;
  title: string;
  titleAr: string;
  accent: string;
  accentAr: string;
  image: string;
  icon: string;
  buttons: HeroSlideButton[];
  isActive: boolean;
}

const EMPTY: FormState = {
  eyebrow: "",
  eyebrowAr: "",
  title: "",
  titleAr: "",
  accent: "",
  accentAr: "",
  image: "",
  icon: "sparkles",
  // A slide with no way out of it is a picture. New slides open with the one
  // action every slide on the site already has.
  buttons: [
    { label: "Request a free consultation", labelAr: "اطلب استشارة مجانية", href: "/contact", style: "primary" },
  ],
  isActive: true,
};

const HeroSlideModal: React.FC<Props> = ({ isOpen, onClose, slide }) => {
  const { t, i18n } = useTranslation();
  const isArabic = (i18n.language || "en").toLowerCase().startsWith("ar");
  const { createSlide, updateSlide } = useHeroSlideStore();
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    if (slide) {
      setForm({
        eyebrow: slide.eyebrow || "",
        eyebrowAr: slide.eyebrowAr || "",
        title: slide.title || "",
        titleAr: slide.titleAr || "",
        accent: slide.accent || "",
        accentAr: slide.accentAr || "",
        image: slide.image || "",
        icon: slide.icon || "sparkles",
        buttons: (slide.buttons || []).map((button) => ({ ...button })),
        isActive: slide.isActive ?? true,
      });
    } else {
      setForm({ ...EMPTY, buttons: EMPTY.buttons.map((button) => ({ ...button })) });
    }
  }, [isOpen, slide]);

  if (!isOpen) return null;

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const setButton = (index: number, patch: Partial<HeroSlideButton>) =>
    setForm((prev) => ({
      ...prev,
      buttons: prev.buttons.map((button, position) =>
        position === index ? { ...button, ...patch } : button
      ),
    }));

  const addButton = () =>
    setForm((prev) => ({
      ...prev,
      buttons: [...prev.buttons, { label: "", labelAr: "", href: "/products", style: "ghost" }],
    }));

  const removeButton = (index: number) =>
    setForm((prev) => ({
      ...prev,
      buttons: prev.buttons.filter((_, position) => position !== index),
    }));

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!form.title.trim() && !form.titleAr.trim()) {
      toast.error(t("banner.needTitle", "The slide needs a headline, in at least one language."));
      return;
    }
    if (!form.image.trim()) {
      toast.error(t("banner.needImage", "The slide needs a picture."));
      return;
    }
    // A button with a label and no address renders as a link to the page it is
    // already on. Dropping the empty ones is kinder than saving them.
    const buttons = form.buttons.filter(
      (button) => (button.label.trim() || button.labelAr?.trim()) && button.href.trim()
    );

    // English is what the storefront falls back to, so a slide written only in
    // Arabic must still have something in the English field or it renders
    // blank for an English visitor.
    const payload = {
      ...form,
      title: form.title.trim() || form.titleAr.trim(),
      buttons: buttons.map((button) => ({
        ...button,
        label: button.label.trim() || button.labelAr?.trim() || "",
      })),
    };

    setSaving(true);
    const ok = slide ? await updateSlide(slide._id, payload) : await createSlide(payload);
    setSaving(false);

    if (ok) {
      toast.success(slide ? t("banner.saved", "Slide saved") : t("banner.created", "Slide added"));
      onClose();
    } else {
      toast.error(useHeroSlideStore.getState().error || t("banner.saveFailed", "Could not save the slide"));
    }
  };

  const PreviewIcon = slideIcon(form.icon);
  const previewTitle = (isArabic ? form.titleAr : form.title) || form.title || form.titleAr;
  const previewAccent = (isArabic ? form.accentAr : form.accent) || form.accent || form.accentAr;
  const previewEyebrow = (isArabic ? form.eyebrowAr : form.eyebrow) || form.eyebrow || form.eyebrowAr;

  const field = "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00A8E8] focus:border-transparent";
  const labelClass = "block text-sm font-medium text-gray-700 mb-1";

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4">
      <div className="my-8 w-full max-w-3xl rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-bold text-gray-900">
            {slide ? t("banner.editSlide", "Edit slide") : t("banner.newSlide", "New slide")}
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
          {/* What the visitor will see. Not the storefront's own markup — that
              lives behind the manus stylesheet the dashboard does not load —
              but the same arrangement, so the effect of a change is visible
              here rather than only after a save and a trip to the home page. */}
          <div className="overflow-hidden rounded-xl border border-gray-200">
            <div
              className="relative flex min-h-[190px] flex-col justify-center gap-2 bg-[#0B0B10] bg-cover bg-center p-6"
              style={form.image ? { backgroundImage: `url(${form.image})` } : undefined}
              dir={isArabic ? "rtl" : "ltr"}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-[#050508]/95 via-[#050508]/70 to-transparent" />
              <div className="relative">
                {previewEyebrow && (
                  <p className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-[#F5811F]">
                    <PreviewIcon size={14} /> {previewEyebrow}
                  </p>
                )}
                <p className="text-2xl font-extrabold leading-tight text-white">
                  {previewTitle || t("banner.previewTitle", "Your headline")}
                </p>
                {previewAccent && (
                  <p className="text-2xl font-extrabold leading-tight text-[#00A8E8]">{previewAccent}</p>
                )}
                <div className="mt-3 flex flex-wrap gap-2">
                  {form.buttons.map((button, index) => {
                    const text = (isArabic ? button.labelAr : button.label) || button.label || button.labelAr;
                    if (!text) return null;
                    return (
                      <span
                        key={index}
                        className={`rounded px-3 py-1.5 text-xs font-bold ${
                          button.style === "primary"
                            ? "bg-[#00A8E8] text-white"
                            : "border border-white/70 text-white"
                        }`}
                      >
                        {text}
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          <ImageField
            value={form.image}
            onChange={(url) => set("image", url)}
            label={t("banner.image", "Background image")}
            aspect="wide"
          />

          <div>
            <span className={labelClass}>{t("banner.icon", "Icon beside the small label")}</span>
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

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>{t("banner.eyebrow", "Small label")} (EN)</label>
              <input className={field} value={form.eyebrow} onChange={(e) => set("eyebrow", e.target.value)} dir="ltr" />
            </div>
            <div>
              <label className={labelClass}>{t("banner.eyebrow", "Small label")} (AR)</label>
              <input className={field} value={form.eyebrowAr} onChange={(e) => set("eyebrowAr", e.target.value)} dir="rtl" />
            </div>

            <div>
              <label className={labelClass}>{t("banner.title", "Headline")} (EN)</label>
              <input className={field} value={form.title} onChange={(e) => set("title", e.target.value)} dir="ltr" />
            </div>
            <div>
              <label className={labelClass}>{t("banner.title", "Headline")} (AR)</label>
              <input className={field} value={form.titleAr} onChange={(e) => set("titleAr", e.target.value)} dir="rtl" />
            </div>

            <div>
              <label className={labelClass}>{t("banner.accent", "Second line (blue)")} (EN)</label>
              <input className={field} value={form.accent} onChange={(e) => set("accent", e.target.value)} dir="ltr" />
            </div>
            <div>
              <label className={labelClass}>{t("banner.accent", "Second line (blue)")} (AR)</label>
              <input className={field} value={form.accentAr} onChange={(e) => set("accentAr", e.target.value)} dir="rtl" />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-900">
                {t("banner.buttons", "Buttons")}
              </span>
              {form.buttons.length < 3 && (
                <button
                  type="button"
                  onClick={addButton}
                  className="flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                >
                  <PlusIcon className="h-4 w-4" />
                  {t("banner.addButton", "Add a button")}
                </button>
              )}
            </div>

            {form.buttons.length === 0 && (
              <p className="rounded-lg border border-dashed border-gray-300 px-3 py-4 text-center text-xs text-gray-500">
                {t("banner.noButtons", "No buttons — the slide will be a picture with a headline.")}
              </p>
            )}

            {form.buttons.map((button, index) => (
              <div key={index} className="space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wide text-gray-500">
                    {t("banner.button", "Button")} {index + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeButton(index)}
                    className="rounded p-1 text-red-500 hover:bg-red-50"
                    aria-label={t("banner.removeButton", "Remove this button")}
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className={labelClass}>{t("banner.buttonLabel", "Label")} (EN)</label>
                    <input
                      className={field}
                      value={button.label}
                      onChange={(e) => setButton(index, { label: e.target.value })}
                      dir="ltr"
                    />
                  </div>
                  <div>
                    <label className={labelClass}>{t("banner.buttonLabel", "Label")} (AR)</label>
                    <input
                      className={field}
                      value={button.labelAr || ""}
                      onChange={(e) => setButton(index, { labelAr: e.target.value })}
                      dir="rtl"
                    />
                  </div>
                </div>

                <div>
                  <label className={labelClass}>{t("banner.buttonStyle", "Style")}</label>
                  <select
                    className={field}
                    value={button.style}
                    onChange={(e) => setButton(index, { style: e.target.value as "primary" | "ghost" })}
                  >
                    <option value="primary">{t("banner.stylePrimary", "Filled (main action)")}</option>
                    <option value="ghost">{t("banner.styleGhost", "Outlined (alternative)")}</option>
                  </select>
                </div>

                <LinkPicker
                  label={t("banner.buttonTarget", "Where it goes")}
                  value={button.href}
                  onChange={(href) => setButton(index, { href })}
                />
              </div>
            ))}
          </div>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => set("isActive", e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-[#00A8E8] focus:ring-[#00A8E8]"
            />
            <span className="text-sm text-gray-700">
              {t("banner.active", "Show this slide on the home page")}
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
              {/* Not t("Save") — that key carries the shop's other Save, the
                  one in "Save 1,200 EGP", and reads in Arabic as "spend less"
                  rather than "store this". */}
              {saving ? t("Saving…", "Saving…") : t("action.save", "Save")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default HeroSlideModal;
