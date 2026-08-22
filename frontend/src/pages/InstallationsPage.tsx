import React, { useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  CheckIcon,
  PhoneIcon,
  ClipboardDocumentCheckIcon,
  WrenchScrewdriverIcon,
  ShieldCheckIcon,
} from "@heroicons/react/24/outline";
import Header from "../components/Header";
import Footer from "../components/Footer";
import PageHero from "../components/PageHero";
import SEO from "../components/SEO";
import { useInstallationServiceStore } from "../stores/installationService.store";
import { useCollectionStore } from "../stores/collection.store";
import { useCategoryStore } from "../stores/category.store";
import { categoryHref } from "../lib/categoryLink";
import { slideIcon } from "../components/manus/icons";
import { cldImg } from "../lib/cldImage";

/**
 * The fitting side of the shop, on a page of its own.
 *
 * Everything here already existed and was only reachable sideways: the work is
 * sold as a checkbox at the bottom of a bundle, and the gear that work applies
 * to is spread across six departments of the catalogue. This puts the two on
 * one page — what we install, and the bundles that already come with fitting
 * priced in.
 *
 * The offers are read live from the bundles rather than re-typed here. A price
 * copied into a second place is a price that goes stale, and this one would go
 * stale in the direction that matters: advertising a figure the checkout does
 * not honour.
 */

/**
 * What the page shows before anyone has opened Dashboard → Banner.
 *
 * Deliberately thinner than the set that button seeds — a name, a line and a
 * way into the catalogue, no feature lists and no prices. A price shown here
 * would be one nobody in the shop had agreed to, and the richer copy belongs
 * in the database where it can be corrected, not in the bundle where it
 * cannot.
 */
const FALLBACK_SERVICES = [
  {
    key: "surveillance",
    icon: "camera",
    title: "Surveillance camera installation",
    titleAr: "تركيب كاميرات المراقبة",
    text: "Survey, placement, cabling and recorder setup — with remote viewing working before we leave.",
    textAr: "معاينة وتحديد الأماكن وتأسيس وضبط جهاز التسجيل — والمشاهدة من الموبايل شغالة قبل ما نمشي.",
    image: "/manus/banner-surveillance.webp",
    category: ["surveillance-security", "surveillance", "Surveillance & Security", "أنظمة المراقبة والأمن"],
  },
  {
    key: "fire",
    icon: "flame",
    title: "Fire alarm installation",
    titleAr: "تركيب أنظمة إنذار الحريق",
    text: "Detector layout planned around the site and its evacuation routes, then tested zone by zone.",
    textAr: "توزيع نقاط الكشف حسب المكان ومسارات الإخلاء، واختبار كل منطقة على حدة.",
    image: "/manus/banner-fire.webp",
    category: ["alarm-systems", "Alarm Systems", "أنظمة الإنذار"],
  },
  {
    key: "audio",
    icon: "audio",
    title: "Sound system installation",
    titleAr: "تركيب أنظمة الصوت",
    text: "Speakers, amplifiers and paging laid out for the room they are in, and balanced on site.",
    textAr: "سماعات ومكبرات ونظام نداء متوزّعة على حسب المكان، ومضبوطة في الموقع.",
    image: "/manus/banner-audio.webp",
    category: ["tvs-audio", "tv-audio", "TVs & Audio", "التلفزيونات والصوتيات"],
  },
  {
    key: "network",
    icon: "network",
    title: "Network installation",
    titleAr: "تأسيس الشبكات",
    text: "Structured cabling, racks, switches and access points — labelled and documented at handover.",
    textAr: "تأسيس منظم ورفوف وسويتشات ونقاط وصول — مترقّمة وموثّقة عند التسليم.",
    image: "/manus/banner-network.webp",
    category: ["networking", "Networking", "الشبكات"],
  },
  {
    key: "attendance",
    icon: "fingerprint",
    title: "Attendance and access control",
    titleAr: "تركيب أجهزة الحضور والتحكم في الدخول",
    text: "Fingerprint terminals and door control, with the attendance software set up on your machine.",
    textAr: "أجهزة بصمة وتحكم في الأبواب، مع تثبيت برنامج الحضور على جهازك.",
    image: "/manus/banner-attendance.webp",
    category: ["time-attendance-fingerprint", "time-attendance", "Time Attendance & Fingerprint", "أجهزة الحضور والبصمة"],
  },
  {
    key: "intercom",
    icon: "phone",
    title: "Intercom and PBX installation",
    titleAr: "تركيب الإنتركم والسنترالات",
    text: "Video intercom at the entrance, IP phones at the desks, and a PBX that ties them together.",
    textAr: "إنتركم فيديو على المدخل، وتليفونات IP على المكاتب، وسنترال بيربطهم.",
    image: "/manus/banner-intercom.webp",
    category: ["video-intercom", "Video Intercom", "إنتركم فيديو"],
  },
] as const;

/** How a job runs, start to finish. The one thing customers ask before booking. */
const STEPS = [
  {
    Icon: PhoneIcon,
    title: "Tell us about the site",
    titleAr: "احكيلنا عن المكان",
    text: "A call or a message with the address, the size and what you want covered.",
    textAr: "مكالمة أو رسالة فيها العنوان والمساحة وإيه اللي عايز تغطيه.",
  },
  {
    Icon: ClipboardDocumentCheckIcon,
    title: "We survey and quote",
    titleAr: "نعاين ونطلع عرض السعر",
    text: "A visit, a layout, and a written price covering the gear and the work.",
    textAr: "زيارة، وتوزيع، وسعر مكتوب شامل الأجهزة والشغل.",
  },
  {
    Icon: WrenchScrewdriverIcon,
    title: "We install and test",
    titleAr: "نركّب ونختبر",
    text: "Fitting, wiring and configuration — tested with you before the team leaves.",
    textAr: "تركيب وتأسيس وضبط — واختبار قدامك قبل ما الفريق يمشي.",
  },
  {
    Icon: ShieldCheckIcon,
    title: "Warranty and support",
    titleAr: "ضمان ودعم",
    text: "Manufacturer warranty on the gear, and us on the phone for the work.",
    textAr: "ضمان المصنّع على الأجهزة، وإحنا على التليفون في الشغل.",
  },
] as const;

const InstallationsPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const isArabic = (i18n.language || "en").toLowerCase().startsWith("ar");

  const { services, loading, loaded, fetchActiveServices } = useInstallationServiceStore();
  const { collections, fetchCollections } = useCollectionStore();
  const categories = useCategoryStore((state) => state.categories);

  useEffect(() => {
    fetchActiveServices();
    fetchCollections({ activeOnly: true });
  }, [fetchActiveServices, fetchCollections]);

  const pick = (ar: string | undefined, en: string | undefined) =>
    (isArabic && ar?.trim() ? ar : en) || "";

  const cards = useMemo(() => {
    if (services.length) {
      return services.map((service) => ({
        key: service._id,
        icon: service.icon || "wrench",
        title: pick(service.titleAr, service.title),
        text: pick(service.descriptionAr, service.description),
        image: service.image || "",
        features: (service.features || []).map((feature) => pick(feature.textAr, feature.text)),
        priceFrom: service.priceFrom,
        priceNote: pick(service.priceNoteAr, service.priceNote),
        badge: pick(service.badgeAr, service.badge),
        href: service.href || "/contact",
        cta: pick(service.ctaLabelAr, service.ctaLabel) || t("Browse the gear"),
      }));
    }

    return FALLBACK_SERVICES.map((service) => ({
      key: service.key,
      icon: service.icon,
      title: isArabic ? service.titleAr : t(service.title),
      text: isArabic ? service.textAr : t(service.text),
      image: service.image,
      features: [] as string[],
      priceFrom: 0,
      priceNote: "",
      badge: "",
      href: categoryHref(categories, service.category),
      cta: t("Browse the gear"),
    }));
  }, [services, categories, isArabic, t]);

  /** Bundles that already include fitting — the offers half of the page. */
  const offers = useMemo(
    () => collections.filter((collection) => collection.installation?.offered),
    [collections]
  );

  const money = (value: number) =>
    `${value.toLocaleString(isArabic ? "ar-EG" : "en-US")} ${t("EGP")}`;

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <SEO
        title={t("Installation services")}
        description={t(
          "Surveillance, fire alarm, sound, networking, attendance and intercom systems — supplied and installed across Egypt by Belgomla."
        )}
      />
      <Header />

      <PageHero
        eyebrow={t("Supplied and installed")}
        title={t("Installation services")}
        subtitle={t(
          "We do not only sell the equipment — we survey the site, fit it, wire it, configure it and test it with you."
        )}
        breadcrumb={[{ label: t("Home"), to: "/" }, { label: t("Installation services") }]}
        actions={
          <Link
            to="/contact"
            className="inline-flex items-center gap-2 rounded-lg bg-[var(--brand-primary)] px-5 py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90"
          >
            {t("Request a free site survey")}
          </Link>
        }
      />

      <main className="shell space-y-14 py-12 sm:py-16">
        {/* ═══ What we install ═══ */}
        <section>
          <h2 className="text-2xl font-bold text-[var(--text)] sm:text-3xl">{t("What we install")}</h2>
          <p className="mt-1 text-[var(--text-muted)]">
            {t("Every system below is supplied from our own catalogue and fitted by our team.")}
          </p>

          {loading && !loaded ? (
            <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map((index) => (
                <div
                  key={index}
                  className="h-72 animate-pulse rounded-2xl border border-[var(--border)] bg-[var(--surface)]"
                />
              ))}
            </div>
          ) : (
            <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {cards.map((card) => {
                const Icon = slideIcon(card.icon);
                return (
                  <article
                    key={card.key}
                    className="group flex flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-sm)] transition-shadow hover:shadow-lg"
                  >
                    <div className="relative h-40 shrink-0 overflow-hidden bg-[var(--surface-2)]">
                      {card.image && (
                        <img
                          // cldImg passes a non-Cloudinary address straight
                          // through, so the shipped /manus/*.webp files need no
                          // guard here.
                          src={cldImg(card.image, { w: 640 })}
                          alt=""
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                          loading="lazy"
                          decoding="async"
                        />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                      <span className="absolute bottom-3 start-3 flex h-9 w-9 items-center justify-center rounded-lg bg-white/95 text-[#0077B6]">
                        <Icon size={18} />
                      </span>
                      {card.badge && (
                        <span className="absolute top-3 end-3 rounded-full bg-[var(--brand-accent)] px-2.5 py-1 text-[11px] font-bold text-white">
                          {card.badge}
                        </span>
                      )}
                    </div>

                    <div className="flex flex-1 flex-col p-5">
                      <h3 className="text-base font-bold text-[var(--text)]">{card.title}</h3>
                      {card.text && (
                        <p className="mt-1.5 text-sm leading-relaxed text-[var(--text-muted)]">{card.text}</p>
                      )}

                      {card.features.length > 0 && (
                        <ul className="mt-3 space-y-1.5">
                          {card.features.map((feature, index) => (
                            <li key={index} className="flex items-start gap-2 text-sm text-[var(--text-muted)]">
                              <CheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-[var(--brand-primary)]" />
                              <span>{feature}</span>
                            </li>
                          ))}
                        </ul>
                      )}

                      <div className="mt-4 flex items-end justify-between gap-3 pt-3">
                        <div>
                          {card.priceFrom > 0 ? (
                            <>
                              <p className="text-[11px] uppercase tracking-wide text-[var(--text-subtle)]">
                                {t("Starts at")}
                              </p>
                              <p className="text-lg font-bold text-[var(--brand-primary)]">
                                {money(card.priceFrom)}
                              </p>
                              {card.priceNote && (
                                <p className="text-[11px] text-[var(--text-subtle)]">{card.priceNote}</p>
                              )}
                            </>
                          ) : (
                            <p className="text-xs text-[var(--text-subtle)]">
                              {t("Priced after a site visit")}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="mt-3 flex gap-2">
                        <Link
                          to={card.href}
                          className="flex-1 rounded-lg border border-[var(--border)] px-3 py-2 text-center text-sm font-semibold text-[var(--text)] transition-colors hover:bg-[var(--surface-2)]"
                        >
                          {card.cta}
                        </Link>
                        <Link
                          to="/contact"
                          className="rounded-lg bg-[var(--brand-primary)] px-3 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                        >
                          {t("Ask for a quote")}
                        </Link>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {/* ═══ Fitting offers — live from the bundles ═══ */}
        <section>
          <h2 className="text-2xl font-bold text-[var(--text)] sm:text-3xl">{t("Installation offers")}</h2>
          <p className="mt-1 text-[var(--text-muted)]">
            {t("Complete packages — the equipment and the fitting, priced together.")}
          </p>

          {offers.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)] px-6 py-10 text-center">
              <p className="text-[var(--text-muted)]">
                {t("No packages with fitting are running right now.")}
              </p>
              {/* Padded to a thumb-sized target rather than left as a bare
                  line of text: at 20px tall it was the one control on the page
                  a finger could miss. */}
              <Link
                to="/collections"
                className="mt-3 inline-block rounded-lg px-4 py-2.5 text-sm font-semibold text-[var(--brand-primary)] underline transition-colors hover:bg-[var(--surface-2)]"
              >
                {t("See all bundles")}
              </Link>
            </div>
          ) : (
            <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
              {offers.map((offer) => {
                const fitting = offer.installation!;
                const note = pick(fitting.noteAr, fitting.note);
                return (
                  <article
                    key={offer._id}
                    className="flex flex-col rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-sm)]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="text-lg font-bold text-[var(--text)]">
                          {pick(offer.nameAr, offer.name)}
                        </h3>
                        <p className="mt-1 text-sm text-[var(--text-muted)]">
                          {pick(offer.descriptionAr, offer.description)}
                        </p>
                      </div>
                      <span className="shrink-0 rounded-full bg-[var(--brand-primary)]/10 px-3 py-1 text-[11px] font-bold text-[var(--brand-primary)]">
                        {t("Fitting included")}
                      </span>
                    </div>

                    <p className="mt-3 text-sm text-[var(--text-muted)]">
                      {t("{{count}} items in this package", { count: offer.items?.length || 0 })}
                    </p>

                    <div className="mt-4 flex flex-wrap items-end justify-between gap-3 border-t border-[var(--border)] pt-4">
                      <div>
                        <p className="text-[11px] uppercase tracking-wide text-[var(--text-subtle)]">
                          {t("Package price")}
                        </p>
                        <p className="text-xl font-bold text-[var(--text)]">{money(offer.bundlePrice)}</p>
                        <p className="mt-0.5 text-xs text-[var(--text-muted)]">
                          {/* Zero with fitting offered is the shop saying the work
                              is in the price, which is a different promise from a
                              free checkbox — so it is spelled out. */}
                          {fitting.price > 0
                            ? `${t("Fitting")}: +${money(fitting.price)}`
                            : `${t("Fitting")}: ${t("included in the price")}`}
                        </p>
                        {note && <p className="mt-0.5 text-xs text-[var(--text-subtle)]">{note}</p>}
                      </div>
                      <Link
                        to={`/collections/${offer._id}`}
                        className="rounded-lg bg-[var(--brand-primary)] px-4 py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90"
                      >
                        {t("See the package")}
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {/* ═══ How a job runs ═══ */}
        <section>
          <h2 className="text-2xl font-bold text-[var(--text)] sm:text-3xl">{t("How it works")}</h2>
          <div className="mt-6 grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--border)] sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((step, index) => (
              <div key={index} className="bg-[var(--surface)] p-5">
                {/* Numbered because the steps genuinely happen in this order —
                    you cannot be quoted before the survey. */}
                <div className="flex items-center gap-2 text-[var(--brand-primary)]">
                  <step.Icon className="h-5 w-5" />
                  <span className="text-xs font-bold tabular-nums">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                </div>
                <h3 className="mt-3 text-sm font-bold text-[var(--text)]">
                  {isArabic ? step.titleAr : t(step.title)}
                </h3>
                <p className="mt-1 text-sm leading-relaxed text-[var(--text-muted)]">
                  {isArabic ? step.textAr : t(step.text)}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ═══ Closing call ═══ */}
        <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-6 py-10 text-center">
          <h2 className="text-xl font-bold text-[var(--text)] sm:text-2xl">
            {t("Tell us about your site and we will quote it")}
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-[var(--text-muted)]">
            {t("A survey costs nothing and the quote covers the equipment and the work together.")}
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <Link
              to="/contact"
              className="rounded-lg bg-[var(--brand-primary)] px-6 py-3 text-sm font-bold text-white transition-opacity hover:opacity-90"
            >
              {t("Request a free site survey")}
            </Link>
            <Link
              to="/products"
              className="rounded-lg border border-[var(--border)] px-6 py-3 text-sm font-bold text-[var(--text)] transition-colors hover:bg-[var(--surface-2)]"
            >
              {t("Browse the catalogue")}
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default InstallationsPage;
