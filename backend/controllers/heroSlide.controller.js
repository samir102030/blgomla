import HeroSlide from "../models/heroSlide.model.js";
import Category from "../models/category.model.js";
import { controllerWrapper } from "../utils/wrappers.js";
import { logAudit } from "../utils/audit.js";

/**
 * The six slides the hero shipped with, kept here as the seed for the
 * "restore the built-in slides" button rather than as a permanent fallback.
 *
 * The storefront still falls back to its own copy of these when the API has
 * nothing to give, so the banner is never blank; this list exists so that one
 * click turns those read-only defaults into editable documents.
 */
const DEFAULT_SLIDES = [
  {
    icon: "camera",
    eyebrow: "Integrated smart solutions",
    eyebrowAr: "حلول ذكية متكاملة",
    title: "We secure your facility.",
    titleAr: "بنأمّن منشأتك.",
    accent: "And we connect your business.",
    accentAr: "وبنوصّل شغلك.",
    image: "/manus/banner-surveillance.webp",
    action: "Explore solutions",
    actionAr: "اكتشف الحلول",
    category: ["surveillance-security", "surveillance", "Surveillance & Security", "أنظمة المراقبة والأمن"],
  },
  {
    icon: "flame",
    eyebrow: "Fire alarm & suppression",
    eyebrowAr: "إنذار وإطفاء الحريق",
    title: "A faster response.",
    titleAr: "استجابة أسرع.",
    accent: "And higher safety.",
    accentAr: "وأمان أعلى.",
    image: "/manus/banner-fire.webp",
    action: "Explore fire safety",
    actionAr: "اكتشف أنظمة الحريق",
    category: ["alarm-systems", "Alarm Systems", "أنظمة الإنذار"],
  },
  {
    icon: "audio",
    eyebrow: "Audio & sound systems",
    eyebrowAr: "الصوتيات وأنظمة الصوت",
    title: "Clear sound.",
    titleAr: "صوت واضح.",
    accent: "In every space.",
    accentAr: "في كل مكان.",
    image: "/manus/banner-audio.webp",
    action: "Explore audio solutions",
    actionAr: "اكتشف حلول الصوت",
    category: ["tvs-audio", "tv-audio", "TVs & Audio", "التلفزيونات والصوتيات"],
  },
  {
    icon: "network",
    eyebrow: "Networks & infrastructure",
    eyebrowAr: "الشبكات والبنية التحتية",
    title: "A network that holds steady.",
    titleAr: "شبكة ثابتة.",
    accent: "Behind everything you run.",
    accentAr: "ورا كل اللي بتشغّله.",
    image: "/manus/banner-network.webp",
    action: "Explore networking",
    actionAr: "اكتشف الشبكات",
    category: ["networking", "Networking", "الشبكات"],
  },
  {
    icon: "fingerprint",
    eyebrow: "Attendance & access control",
    eyebrowAr: "الحضور والتحكم في الدخول",
    title: "Orderly entry.",
    titleAr: "دخول منظّم.",
    accent: "And clearer records.",
    accentAr: "وسجلات أوضح.",
    image: "/manus/banner-attendance.webp",
    action: "Explore attendance systems",
    actionAr: "اكتشف أجهزة الحضور",
    category: ["time-attendance-fingerprint", "time-attendance", "Time Attendance & Fingerprint", "أجهزة الحضور والبصمة"],
  },
  {
    icon: "phone",
    eyebrow: "Intercom & PBX",
    eyebrowAr: "الإنتركم والسنترالات",
    title: "Secure communication.",
    titleAr: "تواصل آمن.",
    accent: "From the entrance to the back office.",
    accentAr: "من المدخل لحد المكتب.",
    image: "/manus/banner-intercom.webp",
    action: "Explore communication solutions",
    actionAr: "اكتشف حلول الاتصال",
    category: ["video-intercom", "Video Intercom", "إنتركم فيديو"],
  },
];

const normalise = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

/**
 * Turn the names a default slide uses into the link the catalogue understands.
 *
 * ProductsContent filters on ?category=<_id> and expands that id to its
 * descendants, so a readable slug in the URL matches no category at all. Same
 * resolution order as lib/categoryLink on the frontend: slug first because it
 * is the stable one, display names after, Arabic last because it is the one
 * most likely to be retitled.
 */
const resolveCategoryHref = (categories, candidates) => {
  const wanted = candidates.map(normalise);
  const hit =
    categories.find((c) => wanted.includes(normalise(c.slug))) ||
    categories.find((c) => wanted.includes(normalise(c.name))) ||
    categories.find((c) => wanted.includes(normalise(c.nameAr)));
  return hit ? `/products?category=${encodeURIComponent(String(hit._id))}` : "/products";
};

/** Public — what the storefront hero renders. */
export const getActiveHeroSlides = controllerWrapper(
  "getActiveHeroSlides",
  async (req, res) => {
    const slides = await HeroSlide.find({ isActive: true, deleted: { $ne: true } })
      .sort({ sortOrder: 1, createdAt: 1 })
      .lean();
    res.status(200).json({ success: true, slides });
  }
);

/** Admin — every slide, including the switched-off ones. */
export const getAllHeroSlides = controllerWrapper(
  "getAllHeroSlides",
  async (req, res) => {
    const slides = await HeroSlide.find({ deleted: { $ne: true } })
      .sort({ sortOrder: 1, createdAt: 1 })
      .lean();
    res.status(200).json({ success: true, slides });
  }
);

export const createHeroSlide = controllerWrapper(
  "createHeroSlide",
  async (req, res) => {
    // A new slide lands at the end of the carousel unless told otherwise,
    // rather than at sortOrder 0 where it would silently displace slide one.
    const last = await HeroSlide.findOne({ deleted: { $ne: true } })
      .sort({ sortOrder: -1 })
      .select("sortOrder")
      .lean();

    const slide = await HeroSlide.create({
      ...req.body,
      sortOrder: req.body.sortOrder ?? (last ? (last.sortOrder || 0) + 1 : 0),
      updatedBy: req.user?._id,
    });

    logAudit(req, "heroSlide.create", "heroSlide", slide._id, { title: slide.title });
    res.status(201).json({ success: true, slide });
  }
);

export const updateHeroSlide = controllerWrapper(
  "updateHeroSlide",
  async (req, res) => {
    const slide = await HeroSlide.findByIdAndUpdate(
      req.params.slideId,
      { ...req.body, updatedBy: req.user?._id },
      { new: true, runValidators: true }
    );
    if (!slide || slide.deleted) {
      return res.status(404).json({ success: false, message: "Slide not found" });
    }
    logAudit(req, "heroSlide.update", "heroSlide", slide._id, { title: slide.title });
    res.status(200).json({ success: true, slide });
  }
);

export const deleteHeroSlide = controllerWrapper(
  "deleteHeroSlide",
  async (req, res) => {
    const slide = await HeroSlide.findByIdAndUpdate(
      req.params.slideId,
      { deleted: true, isActive: false },
      { new: true }
    );
    if (!slide) {
      return res.status(404).json({ success: false, message: "Slide not found" });
    }
    logAudit(req, "heroSlide.delete", "heroSlide", slide._id, { title: slide.title });
    res.status(200).json({ success: true, message: "Slide deleted" });
  }
);

/**
 * Write the whole running order in one request.
 *
 * Moving a slide up swaps two rows, and sending those as two independent
 * updates leaves a window where both hold the same sortOrder — on a list the
 * storefront sorts by, that window is a visibly wrong carousel. One request,
 * one order.
 */
export const reorderHeroSlides = controllerWrapper(
  "reorderHeroSlides",
  async (req, res) => {
    const { order } = req.body;
    if (!Array.isArray(order) || !order.length) {
      return res
        .status(400)
        .json({ success: false, message: "Send the new order as a list of slide ids." });
    }

    await HeroSlide.bulkWrite(
      order.map((id, index) => ({
        updateOne: { filter: { _id: id }, update: { $set: { sortOrder: index } } },
      }))
    );

    logAudit(req, "heroSlide.reorder", "heroSlide", undefined, { count: order.length });
    const slides = await HeroSlide.find({ deleted: { $ne: true } })
      .sort({ sortOrder: 1, createdAt: 1 })
      .lean();
    res.status(200).json({ success: true, slides });
  }
);

/**
 * Turn the shipped defaults into editable documents.
 *
 * Refuses when slides already exist rather than adding a second copy of all
 * six — the button that calls this is meant to fill an empty banner, and an
 * accidental second press should do nothing.
 */
export const seedDefaultHeroSlides = controllerWrapper(
  "seedDefaultHeroSlides",
  async (req, res) => {
    const existing = await HeroSlide.countDocuments({ deleted: { $ne: true } });
    if (existing > 0) {
      return res.status(409).json({
        success: false,
        message:
          "There are already slides here. Delete them first if you want the built-in six back.",
      });
    }

    const categories = await Category.find({ deleted: { $ne: true } })
      .select("_id name nameAr slug")
      .lean();

    const docs = DEFAULT_SLIDES.map((slide, index) => ({
      eyebrow: slide.eyebrow,
      eyebrowAr: slide.eyebrowAr,
      title: slide.title,
      titleAr: slide.titleAr,
      accent: slide.accent,
      accentAr: slide.accentAr,
      image: slide.image,
      icon: slide.icon,
      buttons: [
        {
          label: "Request a free consultation",
          labelAr: "اطلب استشارة مجانية",
          href: "/contact",
          style: "primary",
        },
        {
          label: slide.action,
          labelAr: slide.actionAr,
          href: resolveCategoryHref(categories, slide.category),
          style: "ghost",
        },
      ],
      isActive: true,
      sortOrder: index,
      updatedBy: req.user?._id,
    }));

    const slides = await HeroSlide.insertMany(docs);
    logAudit(req, "heroSlide.seedDefaults", "heroSlide", undefined, { count: slides.length });
    res.status(201).json({ success: true, slides });
  }
);
