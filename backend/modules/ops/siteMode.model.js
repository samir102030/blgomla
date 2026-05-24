import mongoose from "mongoose";

// Singleton document — there is exactly one SiteMode row identified by
// `key: "default"`. We keep this as a model (rather than env vars) so an
// admin can flip it from the dashboard without a redeploy.
const siteModeSchema = new mongoose.Schema(
  {
    key: { type: String, default: "default", unique: true, index: true },
    comingSoon: { type: Boolean, default: false },
    title: {
      en: { type: String, default: "Something big is coming." },
      ar: { type: String, default: "شيء كبير قادم." },
    },
    message: {
      en: {
        type: String,
        default:
          "Our new store is almost ready. Leave your email and we'll let you know the moment we launch.",
      },
      ar: {
        type: String,
        default:
          "متجرنا الجديد على وشك الإطلاق. اترك بريدك الإلكتروني وسنخبرك فور انطلاقنا.",
      },
    },
    launchAt: { type: Date, default: null },
    // Stakeholder/QA bypass — anyone hitting `/?previewKey=<this>` skips the splash
    // and the bypass is sticky for the session via a cookie.
    previewKey: { type: String, default: "" },
    // Admins (and super_admins) always bypass by default; flip off only if you
    // want to preview the splash as an admin.
    allowAdminBypass: { type: Boolean, default: true },
    // Whether the public REST API should also return 503 while the splash is
    // active. Keep this off if you want headless integrations to keep working
    // during the coming-soon period.
    blockPublicApi: { type: Boolean, default: false },
    socialLinks: {
      facebook: { type: String, default: "" },
      instagram: { type: String, default: "" },
      twitter: { type: String, default: "" },
      youtube: { type: String, default: "" },
    },
  },
  { timestamps: true }
);

const SiteMode = mongoose.model("SiteMode", siteModeSchema);

export const getSiteMode = async () => {
  let doc = await SiteMode.findOne({ key: "default" });
  if (!doc) doc = await SiteMode.create({ key: "default" });
  return doc;
};

export default SiteMode;
