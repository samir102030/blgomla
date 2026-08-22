import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  ArrowTopRightOnSquareIcon,
  EyeIcon,
  EyeSlashIcon,
} from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import { useHeroSlideStore, type HeroSlide } from "../../stores/heroSlide.store";
import {
  useInstallationServiceStore,
  type InstallationService,
} from "../../stores/installationService.store";
import { slideIcon } from "../../components/manus/icons";
import HeroSlideModal from "../../components/admin/HeroSlideModal";
import InstallationServiceModal from "../../components/admin/InstallationServiceModal";

/**
 * Dashboard → Banner.
 *
 * Two surfaces that were written into the code and are now edited here: the
 * home-page carousel, and the cards on the installations page. They share a
 * screen because they are the same job — a picture, a headline, and a button
 * that goes somewhere — and splitting them across two dashboard entries would
 * have made the second one hard to find.
 *
 * Order is edited with arrows rather than by dragging. A drag needs a pointer;
 * the shop is run from a phone as often as from a desk, and two buttons work
 * on both.
 */

type Tab = "slides" | "services";

const BannerPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const isArabic = (i18n.language || "en").toLowerCase().startsWith("ar");
  const [tab, setTab] = useState<Tab>("slides");

  const {
    slides,
    loading: slidesLoading,
    fetchAllSlides,
    deleteSlide,
    updateSlide,
    reorderSlides,
    seedDefaults: seedSlides,
  } = useHeroSlideStore();

  const {
    services,
    loading: servicesLoading,
    fetchAllServices,
    deleteService,
    updateService,
    reorderServices,
    seedDefaults: seedServices,
  } = useInstallationServiceStore();

  const [editingSlide, setEditingSlide] = useState<HeroSlide | null>(null);
  const [slideModalOpen, setSlideModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<InstallationService | null>(null);
  const [serviceModalOpen, setServiceModalOpen] = useState(false);

  useEffect(() => {
    fetchAllSlides();
    fetchAllServices();
  }, [fetchAllSlides, fetchAllServices]);

  const move = async (kind: Tab, index: number, direction: -1 | 1) => {
    const list = kind === "slides" ? slides : services;
    const target = index + direction;
    if (target < 0 || target >= list.length) return;
    const order = list.map((item) => item._id);
    [order[index], order[target]] = [order[target], order[index]];
    const ok =
      kind === "slides" ? await reorderSlides(order) : await reorderServices(order);
    if (!ok) toast.error(t("banner.reorderFailed", "Could not save the new order"));
  };

  const restoreDefaults = async (kind: Tab) => {
    const ok = kind === "slides" ? await seedSlides() : await seedServices();
    if (ok) toast.success(t("banner.defaultsRestored", "The built-in six are back, and editable."));
    else
      toast.error(
        (kind === "slides"
          ? useHeroSlideStore.getState().error
          : useInstallationServiceStore.getState().error) ||
          t("banner.defaultsFailed", "Could not restore the built-in set")
      );
  };

  const removeSlide = async (slide: HeroSlide) => {
    if (!window.confirm(t("banner.confirmDeleteSlide", "Delete this slide?"))) return;
    if (await deleteSlide(slide._id)) toast.success(t("banner.slideDeleted", "Slide deleted"));
    else toast.error(t("banner.deleteFailed", "Could not delete it"));
  };

  const removeService = async (service: InstallationService) => {
    if (!window.confirm(t("banner.confirmDeleteService", "Delete this service?"))) return;
    if (await deleteService(service._id)) toast.success(t("banner.serviceDeleted", "Service deleted"));
    else toast.error(t("banner.deleteFailed", "Could not delete it"));
  };

  const tabClass = (active: boolean) =>
    `px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${
      active
        ? "border-[#00A8E8] text-[#002B5B]"
        : "border-transparent text-gray-500 hover:text-gray-700"
    }`;

  const orderButtons = (kind: Tab, index: number, total: number) => (
    <div className="flex flex-col">
      <button
        type="button"
        onClick={() => move(kind, index, -1)}
        disabled={index === 0}
        className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-30 disabled:hover:bg-transparent"
        aria-label={t("banner.moveUp", "Move up")}
      >
        <ChevronUpIcon className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => move(kind, index, 1)}
        disabled={index === total - 1}
        className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-30 disabled:hover:bg-transparent"
        aria-label={t("banner.moveDown", "Move down")}
      >
        <ChevronDownIcon className="h-4 w-4" />
      </button>
    </div>
  );

  const emptyState = (kind: Tab) => (
    <div className="rounded-xl border border-dashed border-gray-300 bg-white px-6 py-12 text-center">
      <p className="text-gray-600">
        {kind === "slides"
          ? t(
              "banner.slidesEmpty",
              "No slides here yet — the home page is showing the six built-in ones."
            )
          : t(
              "banner.servicesEmpty",
              "No services here yet — the installations page is showing the six built-in ones."
            )}
      </p>
      <div className="mt-4 flex flex-wrap justify-center gap-3">
        <button
          type="button"
          onClick={() => restoreDefaults(kind)}
          className="rounded-lg bg-[#002B5B] px-4 py-2 text-sm font-semibold text-white hover:bg-[#003d80]"
        >
          {t("banner.importDefaults", "Bring the built-in six in so I can edit them")}
        </button>
        <button
          type="button"
          onClick={() =>
            kind === "slides"
              ? (setEditingSlide(null), setSlideModalOpen(true))
              : (setEditingService(null), setServiceModalOpen(true))
          }
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
        >
          {t("banner.startBlank", "Start from a blank one")}
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">
            {t("banner.pageTitle", "Banner & installation cards")}
          </h1>
          <p className="text-gray-600">
            {t(
              "banner.pageBlurb",
              "The pictures, headlines and buttons on the home-page banner and the installations page."
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <a
            href={tab === "slides" ? "/" : "/installations"}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <ArrowTopRightOnSquareIcon className="h-4 w-4" />
            {t("banner.viewLive", "See it live")}
          </a>
          <button
            type="button"
            onClick={() =>
              tab === "slides"
                ? (setEditingSlide(null), setSlideModalOpen(true))
                : (setEditingService(null), setServiceModalOpen(true))
            }
            className="flex items-center gap-1.5 rounded-lg bg-[#FFD600] px-4 py-2 text-sm font-semibold text-[#333333] hover:bg-[#e6c100]"
          >
            <PlusIcon className="h-5 w-5" />
            {tab === "slides" ? t("banner.addSlide", "Add a slide") : t("banner.addService", "Add a service")}
          </button>
        </div>
      </div>

      <div className="flex gap-2 border-b border-gray-200">
        <button type="button" className={tabClass(tab === "slides")} onClick={() => setTab("slides")}>
          {t("banner.tabSlides", "Home banner")} ({slides.length})
        </button>
        <button type="button" className={tabClass(tab === "services")} onClick={() => setTab("services")}>
          {t("banner.tabServices", "Installations page")} ({services.length})
        </button>
      </div>

      {tab === "slides" && (
        <>
          {slidesLoading && slides.length === 0 ? (
            <div className="py-12 text-center text-gray-500">{t("Loading…", "Loading…")}</div>
          ) : slides.length === 0 ? (
            emptyState("slides")
          ) : (
            <div className="space-y-3">
              {slides.map((slide, index) => {
                const Icon = slideIcon(slide.icon);
                return (
                  <div
                    key={slide._id}
                    className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-3 sm:flex-row sm:items-center"
                  >
                    {orderButtons("slides", index, slides.length)}

                    <div className="h-20 w-full shrink-0 overflow-hidden rounded-lg bg-gray-100 sm:w-40">
                      {slide.image && (
                        <img src={slide.image} alt="" className="h-full w-full object-cover" loading="lazy" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-gray-500">
                        <Icon size={13} />
                        <span className="truncate">
                          {(isArabic ? slide.eyebrowAr : slide.eyebrow) || slide.eyebrow || "—"}
                        </span>
                      </div>
                      <p className="truncate font-semibold text-gray-900">
                        {(isArabic ? slide.titleAr : slide.title) || slide.title}
                      </p>
                      <p className="truncate text-sm text-gray-500">
                        {(isArabic ? slide.accentAr : slide.accent) || slide.accent}
                      </p>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {(slide.buttons || []).map((button, position) => (
                          <span
                            key={position}
                            className="rounded border border-gray-200 bg-gray-50 px-2 py-0.5 text-[11px] text-gray-600"
                            title={button.href}
                          >
                            {(isArabic ? button.labelAr : button.label) || button.label} →{" "}
                            <span className="font-mono" dir="ltr">
                              {button.href}
                            </span>
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => updateSlide(slide._id, { isActive: !slide.isActive })}
                        className={`rounded-lg p-2 ${
                          slide.isActive
                            ? "text-green-600 hover:bg-green-50"
                            : "text-gray-400 hover:bg-gray-100"
                        }`}
                        title={
                          slide.isActive
                            ? t("banner.hideSlide", "Showing — click to hide")
                            : t("banner.showSlide", "Hidden — click to show")
                        }
                      >
                        {slide.isActive ? <EyeIcon className="h-5 w-5" /> : <EyeSlashIcon className="h-5 w-5" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingSlide(slide);
                          setSlideModalOpen(true);
                        }}
                        className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
                        aria-label={t("Edit", "Edit")}
                      >
                        <PencilIcon className="h-5 w-5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeSlide(slide)}
                        className="rounded-lg p-2 text-red-500 hover:bg-red-50"
                        aria-label={t("Delete", "Delete")}
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {tab === "services" && (
        <>
          <p className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
            {t(
              "banner.offersNote",
              "The offers further down that page are your bundles — any bundle with fitting switched on appears there automatically."
            )}{" "}
            <Link to="/dashboard/collections" className="font-semibold underline">
              {t("banner.openBundles", "Open bundles")}
            </Link>
          </p>

          {servicesLoading && services.length === 0 ? (
            <div className="py-12 text-center text-gray-500">{t("Loading…", "Loading…")}</div>
          ) : services.length === 0 ? (
            emptyState("services")
          ) : (
            <div className="space-y-3">
              {services.map((service, index) => {
                const Icon = slideIcon(service.icon);
                return (
                  <div
                    key={service._id}
                    className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-3 sm:flex-row sm:items-center"
                  >
                    {orderButtons("services", index, services.length)}

                    <div className="h-20 w-full shrink-0 overflow-hidden rounded-lg bg-gray-100 sm:w-28">
                      {service.image ? (
                        <img src={service.image} alt="" className="h-full w-full object-cover" loading="lazy" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-gray-400">
                          <Icon size={22} />
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-gray-900">
                        {(isArabic ? service.titleAr : service.title) || service.title}
                      </p>
                      <p className="line-clamp-2 text-sm text-gray-500">
                        {(isArabic ? service.descriptionAr : service.description) || service.description}
                      </p>
                      <p className="mt-1 text-xs text-gray-500">
                        {service.priceFrom > 0
                          ? `${t("banner.from", "from")} ${service.priceFrom.toLocaleString()} ${t("EGP", "EGP")}`
                          : t("banner.priceOnSurvey", "priced after a site visit")}
                        {" · "}
                        <span className="font-mono" dir="ltr">
                          {service.href}
                        </span>
                      </p>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => updateService(service._id, { isActive: !service.isActive })}
                        className={`rounded-lg p-2 ${
                          service.isActive
                            ? "text-green-600 hover:bg-green-50"
                            : "text-gray-400 hover:bg-gray-100"
                        }`}
                        title={
                          service.isActive
                            ? t("banner.hideService", "Showing — click to hide")
                            : t("banner.showService", "Hidden — click to show")
                        }
                      >
                        {service.isActive ? <EyeIcon className="h-5 w-5" /> : <EyeSlashIcon className="h-5 w-5" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingService(service);
                          setServiceModalOpen(true);
                        }}
                        className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
                        aria-label={t("Edit", "Edit")}
                      >
                        <PencilIcon className="h-5 w-5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeService(service)}
                        className="rounded-lg p-2 text-red-500 hover:bg-red-50"
                        aria-label={t("Delete", "Delete")}
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      <HeroSlideModal
        isOpen={slideModalOpen}
        slide={editingSlide}
        onClose={() => {
          setSlideModalOpen(false);
          setEditingSlide(null);
        }}
      />
      <InstallationServiceModal
        isOpen={serviceModalOpen}
        service={editingService}
        onClose={() => {
          setServiceModalOpen(false);
          setEditingService(null);
        }}
      />
    </div>
  );
};

export default BannerPage;
