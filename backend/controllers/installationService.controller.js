import InstallationService from "../models/installationService.model.js";
import Category from "../models/category.model.js";
import { controllerWrapper } from "../utils/wrappers.js";
import { logAudit } from "../utils/audit.js";

/**
 * The six services the page opens with, seeded on request rather than kept as
 * a permanent fallback — same arrangement as the hero slides, and for the same
 * reason: a page that renders defaults it cannot edit is a page that looks
 * finished and is not.
 *
 * The prices are deliberately 0. A fitting job is quoted after a site visit
 * and the storefront says exactly that; inventing a starting figure here would
 * put a number on the page that nobody in the shop had agreed to.
 */
const DEFAULT_SERVICES = [
  {
    icon: "camera",
    title: "Surveillance camera installation",
    titleAr: "تركيب كاميرات المراقبة",
    description:
      "Site survey, camera placement, cabling and recorder setup — indoor and outdoor, with remote viewing configured on your phone before we leave.",
    descriptionAr:
      "معاينة الموقع، تحديد أماكن الكاميرات، التأسيس والتوصيل وضبط جهاز التسجيل — داخلي وخارجي، مع ضبط المشاهدة من الموبايل قبل ما نمشي.",
    image: "/manus/banner-surveillance.webp",
    features: [
      { text: "Site survey and coverage plan", textAr: "معاينة الموقع وخطة التغطية" },
      { text: "Cabling, mounting and configuration", textAr: "التأسيس والتركيب والضبط" },
      { text: "Remote viewing set up on your phone", textAr: "ضبط المشاهدة عن بُعد على موبايلك" },
    ],
    category: ["surveillance-security", "surveillance", "Surveillance & Security", "أنظمة المراقبة والأمن"],
  },
  {
    icon: "flame",
    title: "Fire alarm installation",
    titleAr: "تركيب أنظمة إنذار الحريق",
    description:
      "Detector layout planned around the site and its evacuation routes, panel wiring, and a commissioning test on every zone.",
    descriptionAr:
      "توزيع نقاط الكشف حسب طبيعة المكان ومسارات الإخلاء، توصيل لوحة التحكم، واختبار تشغيل لكل منطقة.",
    image: "/manus/banner-fire.webp",
    features: [
      { text: "Detector layout and zoning", textAr: "توزيع نقاط الكشف والمناطق" },
      { text: "Panel wiring and commissioning", textAr: "توصيل اللوحة واختبار التشغيل" },
      { text: "Handover test on every zone", textAr: "اختبار تسليم لكل منطقة" },
    ],
    category: ["alarm-systems", "Alarm Systems", "أنظمة الإنذار"],
  },
  {
    icon: "audio",
    title: "Sound system installation",
    titleAr: "تركيب أنظمة الصوت",
    description:
      "Speakers, amplifiers and paging laid out for the room they are in — offices, halls and retail floors, balanced on site.",
    descriptionAr:
      "سماعات ومكبرات ونظام نداء متوزّعة على حسب المكان — مكاتب وقاعات ومحلات، مع ضبط الصوت في الموقع.",
    image: "/manus/banner-audio.webp",
    features: [
      { text: "Speaker layout for the space", textAr: "توزيع السماعات على حسب المساحة" },
      { text: "Amplifier and zone wiring", textAr: "توصيل المكبرات والمناطق" },
      { text: "Balanced and tested on site", textAr: "ضبط واختبار في الموقع" },
    ],
    category: ["tvs-audio", "tv-audio", "TVs & Audio", "التلفزيونات والصوتيات"],
  },
  {
    icon: "network",
    title: "Network installation",
    titleAr: "تأسيس الشبكات",
    description:
      "Structured cabling, racks, switches and access points — an orderly business network, labelled and documented at handover.",
    descriptionAr:
      "تأسيس كابلات منظم، رفوف وسويتشات ونقاط وصول — شبكة شغل مرتبة، مترقّمة وموثّقة عند التسليم.",
    image: "/manus/banner-network.webp",
    features: [
      { text: "Structured cabling and racks", textAr: "تأسيس منظم ورفوف" },
      { text: "Switch and access point setup", textAr: "ضبط السويتشات ونقاط الوصول" },
      { text: "Labelled and documented", textAr: "ترقيم وتوثيق كامل" },
    ],
    category: ["networking", "Networking", "الشبكات"],
  },
  {
    icon: "fingerprint",
    title: "Attendance and access control",
    titleAr: "تركيب أجهزة الحضور والتحكم في الدخول",
    description:
      "Fingerprint terminals and door control wired to the entry points that matter, with the attendance software set up on your machine.",
    descriptionAr:
      "أجهزة بصمة وتحكم في الأبواب متوصّلة على مداخل المكان، مع تثبيت برنامج الحضور على جهازك.",
    image: "/manus/banner-attendance.webp",
    features: [
      { text: "Terminal mounting and wiring", textAr: "تركيب وتوصيل الأجهزة" },
      { text: "Door lock and exit button", textAr: "كالون الباب وزر الخروج" },
      { text: "Attendance software configured", textAr: "ضبط برنامج الحضور" },
    ],
    category: ["time-attendance-fingerprint", "time-attendance", "Time Attendance & Fingerprint", "أجهزة الحضور والبصمة"],
  },
  {
    icon: "phone",
    title: "Intercom and PBX installation",
    titleAr: "تركيب الإنتركم والسنترالات",
    description:
      "Video intercom at the entrance, IP phones at the desks, and a PBX that connects reception to the offices behind it.",
    descriptionAr:
      "إنتركم فيديو على المدخل، تليفونات IP على المكاتب، وسنترال بيربط الاستقبال بالمكاتب اللي وراه.",
    image: "/manus/banner-intercom.webp",
    features: [
      { text: "Entrance panel and indoor units", textAr: "وحدة المدخل والوحدات الداخلية" },
      { text: "IP phones and extensions", textAr: "تليفونات IP والتحويلات" },
      { text: "PBX programmed and tested", textAr: "برمجة واختبار السنترال" },
    ],
    category: ["video-intercom", "Video Intercom", "إنتركم فيديو"],
  },
];

const normalise = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

/** Same slug-then-name resolution the hero seeder uses. */
const resolveCategoryHref = (categories, candidates) => {
  const wanted = candidates.map(normalise);
  const hit =
    categories.find((c) => wanted.includes(normalise(c.slug))) ||
    categories.find((c) => wanted.includes(normalise(c.name))) ||
    categories.find((c) => wanted.includes(normalise(c.nameAr)));
  return hit ? `/products?category=${encodeURIComponent(String(hit._id))}` : "/products";
};

/** Public — what the /installations page renders. */
export const getActiveInstallationServices = controllerWrapper(
  "getActiveInstallationServices",
  async (req, res) => {
    const services = await InstallationService.find({
      isActive: true,
      deleted: { $ne: true },
    })
      .sort({ sortOrder: 1, createdAt: 1 })
      .lean();
    res.status(200).json({ success: true, services });
  }
);

/** Admin — every service, including the switched-off ones. */
export const getAllInstallationServices = controllerWrapper(
  "getAllInstallationServices",
  async (req, res) => {
    const services = await InstallationService.find({ deleted: { $ne: true } })
      .sort({ sortOrder: 1, createdAt: 1 })
      .lean();
    res.status(200).json({ success: true, services });
  }
);

export const createInstallationService = controllerWrapper(
  "createInstallationService",
  async (req, res) => {
    const last = await InstallationService.findOne({ deleted: { $ne: true } })
      .sort({ sortOrder: -1 })
      .select("sortOrder")
      .lean();

    const service = await InstallationService.create({
      ...req.body,
      sortOrder: req.body.sortOrder ?? (last ? (last.sortOrder || 0) + 1 : 0),
      updatedBy: req.user?._id,
    });

    logAudit(req, "installationService.create", "installationService", service._id, {
      title: service.title,
    });
    res.status(201).json({ success: true, service });
  }
);

export const updateInstallationService = controllerWrapper(
  "updateInstallationService",
  async (req, res) => {
    const service = await InstallationService.findByIdAndUpdate(
      req.params.serviceId,
      { ...req.body, updatedBy: req.user?._id },
      { new: true, runValidators: true }
    );
    if (!service || service.deleted) {
      return res.status(404).json({ success: false, message: "Service not found" });
    }
    logAudit(req, "installationService.update", "installationService", service._id, {
      title: service.title,
    });
    res.status(200).json({ success: true, service });
  }
);

export const deleteInstallationService = controllerWrapper(
  "deleteInstallationService",
  async (req, res) => {
    const service = await InstallationService.findByIdAndUpdate(
      req.params.serviceId,
      { deleted: true, isActive: false },
      { new: true }
    );
    if (!service) {
      return res.status(404).json({ success: false, message: "Service not found" });
    }
    logAudit(req, "installationService.delete", "installationService", service._id, {
      title: service.title,
    });
    res.status(200).json({ success: true, message: "Service deleted" });
  }
);

export const reorderInstallationServices = controllerWrapper(
  "reorderInstallationServices",
  async (req, res) => {
    const { order } = req.body;
    if (!Array.isArray(order) || !order.length) {
      return res
        .status(400)
        .json({ success: false, message: "Send the new order as a list of service ids." });
    }

    await InstallationService.bulkWrite(
      order.map((id, index) => ({
        updateOne: { filter: { _id: id }, update: { $set: { sortOrder: index } } },
      }))
    );

    logAudit(req, "installationService.reorder", "installationService", undefined, {
      count: order.length,
    });
    const services = await InstallationService.find({ deleted: { $ne: true } })
      .sort({ sortOrder: 1, createdAt: 1 })
      .lean();
    res.status(200).json({ success: true, services });
  }
);

export const seedDefaultInstallationServices = controllerWrapper(
  "seedDefaultInstallationServices",
  async (req, res) => {
    const existing = await InstallationService.countDocuments({ deleted: { $ne: true } });
    if (existing > 0) {
      return res.status(409).json({
        success: false,
        message:
          "There are already services here. Delete them first if you want the built-in six back.",
      });
    }

    const categories = await Category.find({ deleted: { $ne: true } })
      .select("_id name nameAr slug")
      .lean();

    const docs = DEFAULT_SERVICES.map((service, index) => ({
      title: service.title,
      titleAr: service.titleAr,
      description: service.description,
      descriptionAr: service.descriptionAr,
      image: service.image,
      icon: service.icon,
      features: service.features,
      priceFrom: 0,
      href: resolveCategoryHref(categories, service.category),
      ctaLabel: "Browse the gear",
      ctaLabelAr: "تصفّح الأجهزة",
      isActive: true,
      sortOrder: index,
      updatedBy: req.user?._id,
    }));

    const services = await InstallationService.insertMany(docs);
    logAudit(req, "installationService.seedDefaults", "installationService", undefined, {
      count: services.length,
    });
    res.status(201).json({ success: true, services });
  }
);
