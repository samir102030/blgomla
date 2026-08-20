/**
 * Emptying a section of the site from the dashboard.
 *
 * Super admins only, and only the sections named below. The key the client
 * sends is looked up in this table — it is never turned into a collection
 * name, so no request can reach `users`, `roles` or anything else that is not
 * listed here, however it is spelled.
 *
 * Several sections carry a `cascade`. Those are not tidiness: a wiped product
 * that is still sitting in somebody's cart, or a stock alert pointing at a
 * product that no longer exists, renders as a blank row or throws on the page
 * that loads it. The cascade removes the references along with the thing they
 * referenced.
 */
import Product from "../models/product.model.js";
import Category from "../models/category.model.js";
import Brand from "../models/brand.model.js";
import Collection from "../models/collection.model.js";
import Coupon from "../models/coupon.model.js";
import Advertisement from "../models/advertisement.model.js";
import MosaicCard from "../models/mosaicCard.model.js";
import Order from "../models/order.model.js";
import Quotation from "../models/quotation.model.js";
import ProductQuestion from "../models/productQuestion.model.js";
import ReturnRequest from "../models/return.model.js";
import Store from "../models/store.model.js";
import StorePayout from "../models/storePayout.model.js";
import StockAlert from "../models/stockAlert.model.js";
import StudentCategory from "../models/studentCategory.model.js";
import StudentProgram from "../models/studentProgram.model.js";
import StudentProfile from "../models/studentProfile.model.js";
import Visitor from "../models/visitor.model.js";
import Event from "../models/event.model.js";
import Notification from "../models/notification.model.js";
import Subscriber from "../models/subscriber.model.js";
import Address from "../models/address.model.js";
import Conversation from "../models/conversation.model.js";
import Message from "../models/message.model.js";
import EmailLog from "../models/emailLog.model.js";
import Image from "../models/image.model.js";
import BrandRequest from "../models/brandRequest.model.js";
import CategoryRequest from "../models/categoryRequest.model.js";
import PageLayout from "../models/pageLayout.model.js";
import User from "../models/user.model.js";
import { AuditLog } from "../modules/ops/index.js";
import { logAudit } from "../utils/audit.js";

const STAFF_ROLES = ["admin", "super_admin"];

/**
 * @type {Record<string, {
 *   label: string, labelAr: string, group: string,
 *   count: (ctx: {userId: any}) => Promise<number>,
 *   run: (ctx: {userId: any}) => Promise<Record<string, number>>,
 *   warn?: string, warnAr?: string,
 * }>}
 */
const SECTIONS = {
  products: {
    label: "Products",
    labelAr: "المنتجات",
    group: "catalogue",
    warn: "Also clears every cart and wishlist, and any stock alerts or product questions.",
    warnAr: "بيمسح كمان كل السلات وقوايم المفضلة، وأي تنبيهات مخزون أو أسئلة على المنتجات.",
    count: () => Product.countDocuments(),
    run: async () => {
      const products = await Product.deleteMany({});
      const alerts = await StockAlert.deleteMany({});
      const questions = await ProductQuestion.deleteMany({});
      // Carts and wishlists hold product ids directly. Left behind, they are
      // rows the cart page cannot render.
      await User.updateMany({}, { $set: { cart: [], love: [], cartUpdatedAt: null } });
      return {
        products: products.deletedCount,
        stockAlerts: alerts.deletedCount,
        questions: questions.deletedCount,
      };
    },
  },
  categories: {
    label: "Categories",
    labelAr: "الأقسام",
    group: "catalogue",
    warn: "Products keep pointing at categories that no longer exist until they are re-assigned or removed.",
    warnAr: "المنتجات هتفضل مربوطة بأقسام مش موجودة لحد ما تتنقل لأقسام جديدة أو تتمسح.",
    count: () => Category.countDocuments(),
    run: async () => {
      const r = await Category.deleteMany({});
      const req = await CategoryRequest.deleteMany({});
      return { categories: r.deletedCount, categoryRequests: req.deletedCount };
    },
  },
  brands: {
    label: "Brands",
    labelAr: "الماركات",
    group: "catalogue",
    warn: "Products keep pointing at brands that no longer exist until they are re-assigned or removed.",
    warnAr: "المنتجات هتفضل مربوطة بماركات مش موجودة لحد ما تتغيّر أو تتمسح.",
    count: () => Brand.countDocuments(),
    run: async () => {
      const r = await Brand.deleteMany({});
      const req = await BrandRequest.deleteMany({});
      return { brands: r.deletedCount, brandRequests: req.deletedCount };
    },
  },
  collections: {
    label: "Collections",
    labelAr: "الباقات",
    group: "catalogue",
    count: () => Collection.countDocuments(),
    run: async () => ({ collections: (await Collection.deleteMany({})).deletedCount }),
  },
  coupons: {
    label: "Coupons",
    labelAr: "الكوبونات",
    group: "marketing",
    count: () => Coupon.countDocuments(),
    run: async () => ({ coupons: (await Coupon.deleteMany({})).deletedCount }),
  },
  advertisements: {
    label: "Advertisements",
    labelAr: "الإعلانات",
    group: "marketing",
    count: () => Advertisement.countDocuments(),
    run: async () => ({ advertisements: (await Advertisement.deleteMany({})).deletedCount }),
  },
  mosaicCards: {
    label: "Mosaic cards",
    labelAr: "كروت الموزاييك",
    group: "marketing",
    count: () => MosaicCard.countDocuments(),
    run: async () => ({ mosaicCards: (await MosaicCard.deleteMany({})).deletedCount }),
  },
  homeLayout: {
    label: "Home page layout",
    labelAr: "تنسيق الصفحة الرئيسية",
    group: "marketing",
    warn: "The home page falls back to its default arrangement.",
    warnAr: "الصفحة الرئيسية هترجع لترتيبها الافتراضي.",
    count: () => PageLayout.countDocuments(),
    run: async () => ({ layouts: (await PageLayout.deleteMany({})).deletedCount }),
  },
  orders: {
    label: "Orders",
    labelAr: "الطلبات",
    group: "sales",
    warn: "Returns and vendor payouts go with them.",
    warnAr: "المرتجعات وتحويلات الموردين بتتمسح معاهم.",
    count: () => Order.countDocuments(),
    run: async () => {
      const orders = await Order.deleteMany({});
      const returns = await ReturnRequest.deleteMany({});
      const payouts = await StorePayout.deleteMany({});
      return {
        orders: orders.deletedCount,
        returns: returns.deletedCount,
        payouts: payouts.deletedCount,
      };
    },
  },
  quotations: {
    label: "Quotation requests",
    labelAr: "طلبات عروض الأسعار",
    group: "sales",
    count: () => Quotation.countDocuments(),
    run: async () => ({ quotations: (await Quotation.deleteMany({})).deletedCount }),
  },
  stores: {
    label: "Vendor stores",
    labelAr: "متاجر الموردين",
    group: "people",
    warn: "The vendor accounts themselves stay; only their stores go.",
    warnAr: "حسابات الموردين نفسها بتفضل؛ اللي بيتمسح هو متاجرهم بس.",
    count: () => Store.countDocuments(),
    run: async () => {
      const stores = await Store.deleteMany({});
      const payouts = await StorePayout.deleteMany({});
      return { stores: stores.deletedCount, payouts: payouts.deletedCount };
    },
  },
  customers: {
    label: "Customer accounts",
    labelAr: "حسابات العملاء",
    group: "people",
    warn: "Admins are never touched, and neither is the account running this. Addresses, notifications and conversations go with each customer.",
    warnAr: "حسابات الإدارة مش بتتمس، ولا الحساب اللي بيعمل المسح. العناوين والإشعارات والمحادثات بتتمسح مع كل عميل.",
    count: ({ userId }) => User.countDocuments({ role: { $nin: STAFF_ROLES }, _id: { $ne: userId } }),
    run: async ({ userId }) => {
      // Collect the ids first: the cascade needs to know whose rows to remove,
      // and after deleteMany there is nothing left to ask.
      const victims = await User.find({ role: { $nin: STAFF_ROLES }, _id: { $ne: userId } })
        .select("_id")
        .lean();
      const ids = victims.map((v) => v._id);
      if (!ids.length) return { customers: 0 };
      const addresses = await Address.deleteMany({ user: { $in: ids } });
      const notifications = await Notification.deleteMany({ user: { $in: ids } });
      // participants is an array of subdocuments, so the id lives one level in.
      const conversations = await Conversation.deleteMany({ "participants.user": { $in: ids } });
      const messages = await Message.deleteMany({ sender: { $in: ids } });
      const users = await User.deleteMany({ _id: { $in: ids } });
      return {
        customers: users.deletedCount,
        addresses: addresses.deletedCount,
        notifications: notifications.deletedCount,
        conversations: conversations.deletedCount,
        messages: messages.deletedCount,
      };
    },
  },
  students: {
    label: "Student programme",
    labelAr: "برنامج الطلبة",
    group: "people",
    count: async () =>
      (await StudentCategory.countDocuments()) +
      (await StudentProgram.countDocuments()) +
      (await StudentProfile.countDocuments()),
    run: async () => {
      const cats = await StudentCategory.deleteMany({});
      const programmes = await StudentProgram.deleteMany({});
      const profiles = await StudentProfile.deleteMany({});
      return {
        categories: cats.deletedCount,
        programmes: programmes.deletedCount,
        profiles: profiles.deletedCount,
      };
    },
  },
  messages: {
    label: "Support conversations",
    labelAr: "محادثات الدعم",
    group: "operations",
    count: async () => (await Conversation.countDocuments()) + (await Message.countDocuments()),
    run: async () => {
      const conversations = await Conversation.deleteMany({});
      const messages = await Message.deleteMany({});
      return { conversations: conversations.deletedCount, messages: messages.deletedCount };
    },
  },
  notifications: {
    label: "Notifications",
    labelAr: "الإشعارات",
    group: "operations",
    count: () => Notification.countDocuments(),
    run: async () => ({ notifications: (await Notification.deleteMany({})).deletedCount }),
  },
  subscribers: {
    label: "Newsletter subscribers",
    labelAr: "المشتركين في النشرة",
    group: "operations",
    count: () => Subscriber.countDocuments(),
    run: async () => ({ subscribers: (await Subscriber.deleteMany({})).deletedCount }),
  },
  analytics: {
    label: "Visitor analytics",
    labelAr: "إحصائيات الزوار",
    group: "operations",
    count: async () => (await Visitor.countDocuments()) + (await Event.countDocuments()),
    run: async () => {
      const visitors = await Visitor.deleteMany({});
      const events = await Event.deleteMany({});
      return { visitors: visitors.deletedCount, events: events.deletedCount };
    },
  },
  emailLogs: {
    label: "Email log",
    labelAr: "سجل الإيميلات",
    group: "operations",
    count: () => EmailLog.countDocuments(),
    run: async () => ({ emailLogs: (await EmailLog.deleteMany({})).deletedCount }),
  },
  images: {
    label: "Image library",
    labelAr: "مكتبة الصور",
    group: "operations",
    warn: "Removes the records only. The files stay on Cloudinary.",
    warnAr: "بيمسح السجلات بس. الملفات نفسها بتفضل على Cloudinary.",
    count: () => Image.countDocuments(),
    run: async () => ({ images: (await Image.deleteMany({})).deletedCount }),
  },
  auditLogs: {
    label: "Audit log",
    labelAr: "سجل العمليات",
    group: "operations",
    warn: "This wipe is itself recorded, so the log will not be empty afterwards.",
    warnAr: "عملية المسح دي نفسها بتتسجّل، فالسجل مش هيبقى فاضي بعدها.",
    count: () => AuditLog.countDocuments(),
    run: async () => ({ auditLogs: (await AuditLog.deleteMany({})).deletedCount }),
  },
};

export const listSections = async (req, res, next) => {
  try {
    const ctx = { userId: req.user._id };
    const sections = await Promise.all(
      Object.entries(SECTIONS).map(async ([key, s]) => ({
        key,
        label: s.label,
        labelAr: s.labelAr,
        group: s.group,
        warn: s.warn || null,
        warnAr: s.warnAr || null,
        count: await s.count(ctx),
      })),
    );
    res.json({ success: true, sections });
  } catch (err) {
    next(err);
  }
};

export const resetSection = async (req, res, next) => {
  try {
    const { key } = req.params;
    const section = Object.prototype.hasOwnProperty.call(SECTIONS, key) ? SECTIONS[key] : null;
    if (!section) {
      return res.status(404).json({ success: false, message: `Unknown section "${key}"` });
    }

    // The client has to send the key back. A mis-aimed click cannot satisfy
    // this; only something that read which section it was about can.
    if (req.body?.confirm !== key) {
      return res.status(400).json({
        success: false,
        message: `Confirmation does not match. Send { "confirm": "${key}" } to empty this section.`,
      });
    }

    const ctx = { userId: req.user._id };
    const before = await section.count(ctx);
    const deleted = await section.run(ctx);

    logAudit(req, "data.section_cleared", "database", undefined, { section: key, before, deleted }, {
      severity: "critical",
      category: "admin",
    });

    res.json({ success: true, section: key, before, deleted });
  } catch (err) {
    next(err);
  }
};

export const __sectionsForTest = SECTIONS;
