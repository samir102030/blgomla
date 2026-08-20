import React, { useState } from "react";
import type { ComponentType, SVGProps } from "react";
import { ArrowTrendingUpIcon, BanknotesIcon, BoltIcon, BuildingOffice2Icon, BuildingStorefrontIcon, CameraIcon, ChartBarIcon, CheckCircleIcon, ClipboardDocumentListIcon, CreditCardIcon, CubeIcon, DevicePhoneMobileIcon, DocumentTextIcon, EnvelopeIcon, FlagIcon, LockClosedIcon, PencilSquareIcon, PhoneIcon, ShieldCheckIcon, TagIcon } from "@heroicons/react/24/outline";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { useVendorStore } from "../stores/vendor.store";
import type { VendorRegistrationData } from "../types/vendor.type";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { useTranslation } from "react-i18next";

/* ─── Step Metadata ─── */
const STEPS = [
  { num: 1, icon: ClipboardDocumentListIcon, label: "License" },
  { num: 2, icon: BuildingOffice2Icon, label: "Business" },
  { num: 3, icon: BuildingStorefrontIcon, label: "Store" },
  { num: 4, icon: DocumentTextIcon, label: "Documents" },
  { num: 5, icon: LockClosedIcon, label: "Account" },
];

const egyptianGovernorates = [
  "Cairo",
  "Alexandria",
  "Giza",
  "Qalyubia",
  "Port Said",
  "Suez",
  "Luxor",
  "Aswan",
  "Dakahlia",
  "Sharqia",
  "Gharbia",
  "Menofia",
  "Beheira",
  "Ismailia",
  "Damietta",
  "Kafr El Sheikh",
  "Matrouh",
  "North Sinai",
  "South Sinai",
  "Beni Suef",
  "Fayoum",
  "Minya",
  "Asyut",
  "Sohag",
  "Qena",
  "Red Sea",
  "New Valley",
];

const VendorRegistrationPage: React.FC = () => {
  const navigate = useNavigate();
  const { registerVendor, loading } = useVendorStore();
  const { t } = useTranslation();

  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<VendorRegistrationData>({
    businessType: "company",
    commercialRegistrationNumber: "",
    taxNumber: "",
    legalEntityType: "egyptian_tax_authority",
    licenseNumber: "",
    companyName: "",
    companyAddress: "",
    issueDate: "",
    expiryDate: "",
    allowedActivities: "",
    contactPersonName: "",
    email: "",
    phone: "",
    alternativePhone: "",
    address: "",
    city: "",
    governorate: "",
    postalCode: "",
    businessDescription: "",
    productCategories: [],
    expectedMonthlyVolume: 0,
    storeName: "",
    storeDescription: "",
    termsAccepted: false,
    privacyPolicyAccepted: false,
  });

  const [accountData, setAccountData] = useState({
    accountEmail: "",
    password: "",
    confirmPassword: "",
  });

  const [documents, setDocuments] = useState<{
    commercialRegistration?: File;
    taxCard?: File;
    nationalId?: File;
    bankStatement?: File;
    storeLogo?: File;
  }>({});

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value, type } = e.target;

    if (type === "checkbox") {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData((prev) => ({ ...prev, [name]: checked }));
    } else if (name === "productCategories") {
      // Handle multi-select for categories
      const selectedOptions = Array.from(
        (e.target as HTMLSelectElement).selectedOptions,
        (option) => option.value,
      );
      setFormData((prev) => ({ ...prev, [name]: selectedOptions }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleAccountInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setAccountData((prev) => ({ ...prev, [name]: value }));
  };

  const validateStep1 = (): boolean => {
    const requiredFields = [
      "legalEntityType",
      "licenseNumber",
      "companyName",
      "companyAddress",
      "issueDate",
      "expiryDate",
    ];

    const missingFields = requiredFields.filter(
      (field) => !formData[field as keyof VendorRegistrationData],
    );

    if (missingFields.length > 0) {
      toast.error(
        t("vendorRegistration.validation.requiredFields", {
          fields: missingFields.join(", "),
        }),
      );
      return false;
    }

    // Check if expiry date is after issue date
    if (formData.issueDate && formData.expiryDate) {
      if (new Date(formData.expiryDate) <= new Date(formData.issueDate)) {
        toast.error(t("vendorRegistration.validation.expiryAfterIssue"));
        return false;
      }
    }

    return true;
  };

  const validateStep2 = (): boolean => {
    const requiredFields = [
      "businessType",
      "contactPersonName",
      "email",
      "phone",
      "businessDescription",
      "city",
      "governorate",
      "address",
    ];

    const missingFields = requiredFields.filter(
      (field) => !formData[field as keyof VendorRegistrationData],
    );

    if (missingFields.length > 0) {
      toast.error(
        t("vendorRegistration.validation.requiredFields", {
          fields: missingFields.join(", "),
        }),
      );
      return false;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast.error(t("vendorRegistration.validation.invalidEmail"));
      return false;
    }

    // Validate phone format (basic validation)
    const phoneRegex = /^\+?[\d\s\-()]{10,}$/;
    if (!phoneRegex.test(formData.phone)) {
      toast.error(t("vendorRegistration.validation.invalidPhone"));
      return false;
    }

    return true;
  };

  const validateStep3 = (): boolean => {
    if (!formData.storeName) {
      toast.error(t("vendorRegistration.validation.storeNameRequired"));
      return false;
    }

    if (formData.productCategories.length === 0) {
      toast.error(t("vendorRegistration.validation.selectCategory"));
      return false;
    }

    return true;
  };

  const validateStep4 = (): boolean => {
    if (!formData.termsAccepted) {
      toast.error(t("vendorRegistration.validation.acceptTerms"));
      return false;
    }

    if (!formData.privacyPolicyAccepted) {
      toast.error(t("vendorRegistration.validation.acceptPrivacy"));
      return false;
    }

    return true;
  };

  const validateStep5 = (): boolean => {
    if (!accountData.accountEmail) {
      toast.error(t("vendorRegistration.validation.accountEmailRequired"));
      return false;
    }

    if (!accountData.password) {
      toast.error(t("vendorRegistration.validation.passwordRequired"));
      return false;
    }

    if (!accountData.confirmPassword) {
      toast.error(t("vendorRegistration.validation.confirmPasswordRequired"));
      return false;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(accountData.accountEmail)) {
      toast.error(t("vendorRegistration.validation.invalidEmail"));
      return false;
    }

    if (accountData.password !== accountData.confirmPassword) {
      toast.error(t("vendorRegistration.validation.passwordMismatch"));
      return false;
    }

    if (accountData.password.length < 8) {
      toast.error(t("vendorRegistration.validation.passwordTooShort"));
      return false;
    }

    return true;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, files } = e.target;
    if (files && files[0]) {
      setDocuments((prev) => ({ ...prev, [name]: files[0] }));
      setFormData((prev) => ({ ...prev, [`${name}Document`]: files[0] }));
    }
  };

  const fillDummyData = () => {
    // Generate random data for testing
    const randomId = Math.floor(Math.random() * 10000);
    const tomorrow = new Date();
    const nextYear = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);

    // Random company names
    const companyNames = [
      "ABC Corporation",
      "XYZ Enterprises",
      "Global Industries",
      "Metro Solutions",
      "City Commerce Ltd",
      "Urban Traders",
      "Prime Industries",
      "Smart Solutions Inc",
      "Future Enterprises",
      "Modern Commerce Co",
    ];

    // Random cities and governorates
    const locations = [
      { city: "Cairo", governorate: "Cairo Governorate" },
      { city: "Alexandria", governorate: "Alexandria Governorate" },
      { city: "Giza", governorate: "Giza Governorate" },
      { city: "Shubra El-Kheima", governorate: "Qalyubia Governorate" },
      { city: "Port Said", governorate: "Port Said Governorate" },
      { city: "Suez", governorate: "Suez Governorate" },
      { city: "Luxor", governorate: "Luxor Governorate" },
      { city: "Aswan", governorate: "Aswan Governorate" },
      { city: "Mansoura", governorate: "Dakahlia Governorate" },
      { city: "Tanta", governorate: "Gharbia Governorate" },
    ];

    // Random contact names
    const contactNames = [
      "Ahmed Mohamed",
      "Fatima Hassan",
      "Mohamed Ali",
      "Sara Mahmoud",
      "Omar Hassan",
      "Layla Ahmed",
      "Karim Ibrahim",
      "Nour El-Din",
      "Youssef Hassan",
      "Amina Mahmoud",
    ];

    // Random store names
    const storeNames = [
      "TechHub Store",
      "Digital Depot",
      "Smart Shop",
      "Prime Products",
      "Elite Emporium",
      "Modern Marketplace",
      "Urban Store",
      "City Commerce",
      "Metro Mart",
      "Global Goods",
    ];

    // Random business descriptions
    const descriptions = [
      "Leading provider of high-quality electronics and technology products.",
      "Specialized in fashion and lifestyle products for modern consumers.",
      "Comprehensive home and garden solutions for every household.",
      "Premium sporting goods and outdoor equipment retailer.",
      "Curated collection of books and educational materials.",
      "Fun and educational toys for children of all ages.",
      "Beauty and wellness products for health-conscious individuals.",
      "Automotive parts and accessories for vehicle maintenance.",
      "Elegant jewelry and accessories for special occasions.",
      "Gourmet food and beverages from around the world.",
    ];

    // Random categories (select 2-4 random categories)
    const allCategories = [
      "Electronics",
      "Fashion",
      "Home & Garden",
      "Sports & Outdoors",
      "Books",
      "Toys & Games",
      "Health & Beauty",
      "Automotive",
      "Jewelry",
      "Food & Beverages",
      "Office Supplies",
      "Pet Supplies",
    ];

    const selectedCategories = [];
    const numCategories = Math.floor(Math.random() * 3) + 2; // 2-4 categories
    const shuffledCategories = [...allCategories].sort(
      () => 0.5 - Math.random(),
    );
    for (let i = 0; i < numCategories; i++) {
      selectedCategories.push(shuffledCategories[i]);
    }

    const randomLocation =
      locations[Math.floor(Math.random() * locations.length)];
    const randomPassword = `Pass${randomId}!`;

    const businessTypes = ["company", "individual", "partnership"] as const;
    const legalEntityTypes = [
      "egyptian_tax_authority",
      "ministry_supply_trade",
      "other",
    ] as const;

    setFormData({
      businessType:
        businessTypes[Math.floor(Math.random() * businessTypes.length)],
      commercialRegistrationNumber: `CR-${randomId
        .toString()
        .padStart(6, "0")}`,
      taxNumber: `TAX-${randomId.toString().padStart(6, "0")}`,
      legalEntityType:
        legalEntityTypes[Math.floor(Math.random() * legalEntityTypes.length)],
      licenseNumber: `LIC-${randomId.toString().padStart(6, "0")}`,
      companyName:
        companyNames[Math.floor(Math.random() * companyNames.length)],
      companyAddress: `${randomId} Demo Street, Business District`,
      issueDate: tomorrow.toISOString().slice(0, 10),
      expiryDate: nextYear.toISOString().slice(0, 10),
      allowedActivities: "Retail, Online sales, Wholesale distribution",
      contactPersonName:
        contactNames[Math.floor(Math.random() * contactNames.length)],
      email: `contact${randomId}@demo${randomId % 10}.com`,
      phone: `+20${Math.floor(Math.random() * 900000000) + 100000000}`,
      alternativePhone: `+20${
        Math.floor(Math.random() * 900000000) + 100000000
      }`,
      address: `${randomId} Main Street, ${randomLocation.city}`,
      city: randomLocation.city,
      governorate: randomLocation.governorate,
      postalCode: `${10000 + randomId}`,
      businessDescription:
        descriptions[Math.floor(Math.random() * descriptions.length)],
      productCategories: selectedCategories,
      expectedMonthlyVolume: Math.floor(Math.random() * 5000) + 1000,
      storeName: storeNames[Math.floor(Math.random() * storeNames.length)],
      storeDescription: `Welcome to our ${storeNames[
        Math.floor(Math.random() * storeNames.length)
      ].toLowerCase()}! We offer high-quality products with excellent customer service.`,
      termsAccepted: true,
      privacyPolicyAccepted: true,
    });

    // Generate random account data
    setAccountData({
      accountEmail: `vendor${randomId}@demo${randomId % 10}.com`,
      password: randomPassword,
      confirmPassword: randomPassword,
    });

    // Clear any attached documents (keeps files empty)
    setDocuments({});
    toast.success(
      t("vendorRegistration.validation.demoDataPopulated", {
        randomId: randomId,
        domain: randomId % 10,
      }),
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Final validation
    if (!validateStep5()) return;

    try {
      const registrationData = {
        ...formData,
        accountEmail: accountData.accountEmail,
        password: accountData.password,
      };

      // Create FormData for file uploads
      const formDataToSend = new FormData();

      // Append all form fields
      Object.entries(registrationData).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (Array.isArray(value)) {
            formDataToSend.append(key, JSON.stringify(value));
          } else {
            formDataToSend.append(key, value.toString());
          }
        }
      });

      // Append files
      Object.entries(documents).forEach(([key, file]) => {
        if (!file) return;
        // backend expects 'storeLogo' for the logo file, other documents use the '*Document' suffix
        if (key === "storeLogo") {
          formDataToSend.append("storeLogo", file as File);
        } else if (key === "commercialRegistration") {
          formDataToSend.append("commercialRegistrationDocument", file as File);
        } else if (key === "taxCard") {
          formDataToSend.append("taxCardDocument", file as File);
        } else if (key === "nationalId") {
          formDataToSend.append("nationalIdDocument", file as File);
        } else if (key === "bankStatement") {
          formDataToSend.append("bankStatementDocument", file as File);
        } else {
          // fallback: append with original key
          formDataToSend.append(key, file as File);
        }
      });

      await registerVendor(formDataToSend);
      toast.success(t("vendorRegistration.validation.registrationSuccess"));
      navigate("/vendor-registration-success");
    } catch (error: any) {
      console.error("Registration error:", error);
      toast.error(
        error?.response?.data?.message ||
          t("vendorRegistration.validation.registrationFailed"),
      );
    }
  };

  const nextStep = () => {
    let canProceed = false;

    switch (currentStep) {
      case 1:
        canProceed = validateStep1();
        break;
      case 2:
        canProceed = validateStep2();
        break;
      case 3:
        canProceed = validateStep3();
        break;
      case 4:
        canProceed = validateStep4();
        break;
      default:
        canProceed = true;
    }

    if (canProceed && currentStep < 5) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const renderStepIndicator = () => (
    <div className="flex items-center justify-between mb-8 px-2">
      {STEPS.map((step, i) => (
        <React.Fragment key={step.num}>
          <div className="flex flex-col items-center gap-1.5 relative">
            <div
              className={`w-11 h-11 rounded-xl flex items-center justify-center text-base font-bold transition-all duration-300 ${
                step.num < currentStep
                  ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 ring-2 ring-emerald-500/30"
                  : step.num === currentStep
                  ? "bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-accent)] text-white shadow-lg shadow-[var(--brand-primary)]/25"
                  : "bg-[var(--surface-2)] text-[var(--text-subtle)] border border-[var(--border)]"
              }`}
            >
 {step.num < currentStep ? null : <step.icon className="w-5 h-5" aria-hidden="true" />}
            </div>
            <span
              className={`text-[11px] font-medium transition-colors hidden sm:block ${
                step.num === currentStep
                  ? "text-[var(--brand-primary)] dark:text-[var(--brand-accent)]"
                  : step.num < currentStep
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-[var(--text-subtle)]"
              }`}
            >
              {t(`vendorRegistration.steps.${step.label.toLowerCase()}`, step.label)}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div className="flex-1 mx-2 h-0.5 rounded-full overflow-hidden bg-[var(--border)]">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-[var(--brand-primary)] transition-all duration-500 rounded-full"
                style={{ width: step.num < currentStep ? "100%" : "0%" }}
              />
            </div>
          )}
        </React.Fragment>
      ))}
    </div>
  );

  const renderStep1 = () => (
    <div className="space-y-6">
      {process.env.NODE_ENV === 'development' && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={fillDummyData}
            className="px-3 py-1 text-xs bg-[var(--surface-2)] rounded-lg hover:bg-[var(--border)] border border-[var(--border)] text-[var(--text-muted)] transition-colors"
          >
            {t("vendorRegistration.generateRandomData")}
          </button>
        </div>
      )}
      <h2 className="text-xl font-bold text-[var(--text)] mb-6">
        {t("vendorRegistration.step1.title")}
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-[var(--text-muted)] mb-2">
            {t("vendorRegistration.step1.legalEntityType")} *
          </label>
          <select
            name="legalEntityType"
            value={formData.legalEntityType}
            onChange={handleInputChange}
            className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/40 focus:border-[var(--brand-primary)] transition-all"
            required
          >
            <option value="egyptian_tax_authority">
              {t(
                "vendorRegistration.options.legalEntityType.egyptian_tax_authority",
              )}
            </option>
            <option value="ministry_supply_trade">
              {t(
                "vendorRegistration.options.legalEntityType.ministry_supply_trade",
              )}
            </option>
            <option value="other">
              {t("vendorRegistration.options.legalEntityType.other")}
            </option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--text-muted)] mb-2">
            {t("vendorRegistration.step1.licenseNumber")} *
          </label>
          <input
            type="text"
            name="licenseNumber"
            value={formData.licenseNumber}
            onChange={handleInputChange}
            placeholder={t("vendorRegistration.step1.licenseNumberPlaceholder")}
            className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/40 focus:border-[var(--brand-primary)] transition-all"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--text-muted)] mb-2">
            {t("vendorRegistration.step1.companyName")} *
          </label>
          <input
            type="text"
            name="companyName"
            value={formData.companyName}
            onChange={handleInputChange}
            placeholder={t("vendorRegistration.step1.companyNamePlaceholder")}
            className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/40 focus:border-[var(--brand-primary)] transition-all"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--text-muted)] mb-2">
            {t("vendorRegistration.step1.companyAddress")} *
          </label>
          <input
            type="text"
            name="companyAddress"
            value={formData.companyAddress}
            onChange={handleInputChange}
            placeholder={t(
              "vendorRegistration.step1.companyAddressPlaceholder",
            )}
            className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/40 focus:border-[var(--brand-primary)] transition-all"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--text-muted)] mb-2">
            {t("vendorRegistration.step1.issueDate")} *
          </label>
          <input
            type="date"
            name="issueDate"
            value={formData.issueDate}
            onChange={handleInputChange}
            className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/40 focus:border-[var(--brand-primary)] transition-all"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--text-muted)] mb-2">
            {t("vendorRegistration.step1.expiryDate")} *
          </label>
          <input
            type="date"
            name="expiryDate"
            value={formData.expiryDate}
            onChange={handleInputChange}
            className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/40 focus:border-[var(--brand-primary)] transition-all"
            required
          />
        </div>
      </div>

      <div className="bg-[var(--surface-2)] p-6 rounded-xl border border-[var(--border)]">
        <h3 className="text-base font-semibold text-[var(--text)] mb-3">
          {t("vendorRegistration.step1.uploadCommercialRegistration")}
        </h3>
        <p className="text-sm text-[var(--text-muted)] mb-4">
          {t("vendorRegistration.step1.uploadDescription")}
        </p>
        <div className="border-2 border-dashed border-[var(--border)] rounded-xl p-6 text-center hover:border-[var(--brand-primary)]/40 transition-colors bg-[var(--bg)]">
          <input
            type="file"
            name="commercialRegistration"
            onChange={handleFileChange}
            accept=".pdf,.jpg,.jpeg,.png"
            className="hidden"
            id="commercial-registration-upload"
          />
          <label
            htmlFor="commercial-registration-upload"
            className="cursor-pointer flex flex-col items-center"
          >
 <div className="text-4xl mb-2"></div>
            <p className="text-sm text-[var(--text-muted)]">
              {t("vendorRegistration.step1.clickToUpload")}
            </p>
            <p className="text-xs text-[var(--text-subtle)] mt-1">
              {t("vendorRegistration.step1.pdfPngJpg")}
            </p>
          </label>
          {documents.commercialRegistration && (
            <p className="text-sm text-green-600 mt-2">
              {t("vendorRegistration.step1.fileUploaded", {
                fileName: documents.commercialRegistration.name,
              })}
            </p>
          )}
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-[var(--text)] mb-6">
        {t("vendorRegistration.step2.title")}
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-[var(--text-muted)] mb-2">
            {t("vendorRegistration.step2.businessType")} *
          </label>
          <select
            name="businessType"
            value={formData.businessType}
            onChange={handleInputChange}
            className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/40 focus:border-[var(--brand-primary)] transition-all"
            required
          >
            <option value="individual">
              {t("vendorRegistration.options.businessType.individual")}
            </option>
            <option value="company">
              {t("vendorRegistration.options.businessType.company")}
            </option>
            <option value="partnership">
              {t("vendorRegistration.options.businessType.partnership")}
            </option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--text-muted)] mb-2">
            {t("vendorRegistration.step2.contactPersonName")} *
          </label>
          <input
            type="text"
            name="contactPersonName"
            value={formData.contactPersonName}
            onChange={handleInputChange}
            placeholder={t(
              "vendorRegistration.step2.contactPersonNamePlaceholder",
            )}
            className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/40 focus:border-[var(--brand-primary)] transition-all"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--text-muted)] mb-2">
            {t("vendorRegistration.step2.email")} *
          </label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleInputChange}
            placeholder={t("vendorRegistration.step2.emailPlaceholder")}
            className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/40 focus:border-[var(--brand-primary)] transition-all"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--text-muted)] mb-2">
            {t("vendorRegistration.step2.phone")} *
          </label>
          <input
            type="tel"
            name="phone"
            value={formData.phone}
            onChange={handleInputChange}
            placeholder={t("vendorRegistration.step2.phonePlaceholder")}
            className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/40 focus:border-[var(--brand-primary)] transition-all"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--text-muted)] mb-2">
            {t("vendorRegistration.step2.alternativePhone")}
          </label>
          <input
            type="tel"
            name="alternativePhone"
            value={formData.alternativePhone}
            onChange={handleInputChange}
            placeholder={t(
              "vendorRegistration.step2.alternativePhonePlaceholder",
            )}
            className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/40 focus:border-[var(--brand-primary)] transition-all"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-[var(--text-muted)] mb-2">
          {t("vendorRegistration.step2.businessDescription")} *
        </label>
        <textarea
          name="businessDescription"
          value={formData.businessDescription}
          onChange={handleInputChange}
          placeholder={t(
            "vendorRegistration.step2.businessDescriptionPlaceholder",
          )}
          rows={4}
          className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/40 focus:border-[var(--brand-primary)] transition-all"
          required
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <label className="block text-sm font-medium text-[var(--text-muted)] mb-2">
            {t("vendorRegistration.step2.city")} *
          </label>
          <input
            type="text"
            name="city"
            value={formData.city}
            onChange={handleInputChange}
            placeholder={t("vendorRegistration.step2.cityPlaceholder")}
            className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/40 focus:border-[var(--brand-primary)] transition-all"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--text-muted)] mb-2">
            {t("vendorRegistration.step2.governorate")} *
          </label>
          <select
            name="governorate"
            value={formData.governorate}
            onChange={handleInputChange}
            className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/40 focus:border-[var(--brand-primary)] transition-all"
            required
          >
            <option value="">
              {t("vendorRegistration.options.selectGovernorate")}
            </option>
            {egyptianGovernorates.map((gov) => (
              <option key={gov} value={gov}>
                {t(`vendorRegistration.governorates.${gov}`, gov)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--text-muted)] mb-2">
            {t("vendorRegistration.step2.postalCode")}
          </label>
          <input
            type="text"
            name="postalCode"
            value={formData.postalCode}
            onChange={handleInputChange}
            placeholder={t("vendorRegistration.step2.postalCodePlaceholder")}
            className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/40 focus:border-[var(--brand-primary)] transition-all"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-[var(--text-muted)] mb-2">
          {t("vendorRegistration.step2.fullAddress", "Full Address")} *
        </label>
        <textarea
          name="address"
          value={formData.address}
          onChange={handleInputChange}
          placeholder={t("vendorRegistration.step2.addressPlaceholder")}
          rows={3}
          className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/40 focus:border-[var(--brand-primary)] transition-all"
          required
        />
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-[var(--text)] mb-6">
        {t("vendorRegistration.step3.title")}
      </h2>

      <div>
        <label className="block text-sm font-medium text-[var(--text-muted)] mb-2">
          {t("vendorRegistration.step3.selectCategories")} *
        </label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-4 rounded-xl border border-[var(--border)] max-h-60 overflow-y-auto">
          {[
            "Electronics",
            "Fashion",
            "Home & Garden",
            "Sports & Outdoors",
            "Books",
            "Toys & Games",
            "Health & Beauty",
            "Automotive",
            "Jewelry",
            "Food & Beverages",
            "Office Supplies",
            "Pet Supplies",
          ].map((category) => (
            <label key={category} className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={formData.productCategories.includes(category)}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setFormData((prev) => ({
                    ...prev,
                    productCategories: checked
                      ? [...prev.productCategories, category]
                      : prev.productCategories.filter((c) => c !== category),
                  }));
                }}
                className="rounded-lg border-[var(--border)] text-[var(--brand-primary)] focus:ring-[var(--brand-primary)]"
              />
              <span className="text-sm text-[var(--text-muted)]">
                {t(`vendorRegistration.categories.${category}`)}
              </span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-[var(--text-muted)] mb-2">
          {t("vendorRegistration.step3.expectedVolume")}
        </label>
        <input
          type="number"
          name="expectedMonthlyVolume"
          value={formData.expectedMonthlyVolume}
          onChange={handleInputChange}
          placeholder={t("vendorRegistration.step3.expectedVolumePlaceholder")}
          className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/40 focus:border-[var(--brand-primary)] transition-all"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-[var(--text-muted)] mb-2">
            {t("vendorRegistration.step3.storeName")} *
          </label>
          <input
            type="text"
            name="storeName"
            value={formData.storeName}
            onChange={handleInputChange}
            placeholder={t("vendorRegistration.step3.storeNamePlaceholder")}
            className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/40 focus:border-[var(--brand-primary)] transition-all"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--text-muted)] mb-2">
            {t("vendorRegistration.step3.taxNumber")}
          </label>
          <input
            type="text"
            name="taxNumber"
            value={formData.taxNumber}
            onChange={handleInputChange}
            placeholder={t("vendorRegistration.step3.taxNumberPlaceholder")}
            className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/40 focus:border-[var(--brand-primary)] transition-all"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-[var(--text-muted)] mb-2">
          {t("vendorRegistration.step3.storeDescription")}
        </label>
        <textarea
          name="storeDescription"
          value={formData.storeDescription}
          onChange={handleInputChange}
          placeholder={t(
            "vendorRegistration.step3.storeDescriptionPlaceholder",
          )}
          rows={4}
          className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/40 focus:border-[var(--brand-primary)] transition-all"
        />
      </div>

      <div className="bg-[var(--surface-2)] p-6 rounded-xl border border-[var(--border)]">
        <h3 className="text-base font-semibold text-[var(--text)] mb-4">
          {t("vendorRegistration.step3.uploadStoreLogo")}
        </h3>
        <div className="border-2 border-dashed border-[var(--border)] rounded-xl p-6 text-center">
          <input
            type="file"
            name="storeLogo"
            onChange={handleFileChange}
            accept=".jpg,.jpeg,.png"
            className="hidden"
            id="store-logo-upload"
          />
          <label
            htmlFor="store-logo-upload"
            className="cursor-pointer flex flex-col items-center"
          >
 <div className="text-4xl mb-2"></div>
            <p className="text-sm text-[var(--text-muted)]">
              {t("vendorRegistration.step3.uploadLogoDescription")}
            </p>
            <p className="text-xs text-[var(--text-subtle)] mt-1">
              {t("vendorRegistration.step3.pngJpg")}
            </p>
          </label>
          {documents.storeLogo && (
            <p className="text-sm text-green-600 mt-2">
              {t("vendorRegistration.step3.fileUploaded", {
                fileName: documents.storeLogo.name,
              })}
            </p>
          )}
        </div>
      </div>
    </div>
  );

  const renderStep4 = () => (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-[var(--text)] mb-6">
        {t("vendorRegistration.step4.title")}
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-[var(--surface-2)] p-6 rounded-xl border border-[var(--border)]">
          <h3 className="text-base font-semibold text-[var(--text)] mb-4">
            {t("vendorRegistration.step4.taxCard")}
          </h3>
          <div className="border-2 border-dashed border-[var(--border)] rounded-xl p-4 text-center">
            <input
              type="file"
              name="taxCard"
              onChange={handleFileChange}
              accept=".pdf,.jpg,.jpeg,.png"
              className="hidden"
              id="tax-card-upload"
            />
            <label
              htmlFor="tax-card-upload"
              className="cursor-pointer flex flex-col items-center"
            >
 <div className="text-2xl mb-2"></div>
              <p className="text-sm text-[var(--text-muted)]">{t("vendorRegistration.step4.uploadTaxCard", "Upload Tax Card")}</p>
            </label>
            {documents.taxCard && (
              <p className="text-sm text-green-600 mt-2">
                {t("vendorRegistration.step4.fileUploaded", {
                  fileName: documents.taxCard.name,
                })}
              </p>
            )}
          </div>
        </div>

        <div className="bg-[var(--surface-2)] p-6 rounded-xl border border-[var(--border)]">
          <h3 className="text-base font-semibold text-[var(--text)] mb-4">
            {t("vendorRegistration.step4.nationalId")}
          </h3>
          <div className="border-2 border-dashed border-[var(--border)] rounded-xl p-4 text-center">
            <input
              type="file"
              name="nationalId"
              onChange={handleFileChange}
              accept=".pdf,.jpg,.jpeg,.png"
              className="hidden"
              id="national-id-upload"
            />
            <label
              htmlFor="national-id-upload"
              className="cursor-pointer flex flex-col items-center"
            >
              <div className="text-2xl mb-2">🆔</div>
              <p className="text-sm text-[var(--text-muted)]">{t("vendorRegistration.step4.uploadNationalId", "Upload National ID")}</p>
            </label>
            {documents.nationalId && (
              <p className="text-sm text-green-600 mt-2">
                {t("vendorRegistration.step4.fileUploaded", {
                  fileName: documents.nationalId.name,
                })}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="bg-[var(--surface-2)] p-6 rounded-xl border border-[var(--border)]">
        <h3 className="text-base font-semibold text-[var(--text)] mb-4">
          {t("vendorRegistration.step4.bankStatement", "Bank Statement (Optional)")}
        </h3>
        <div className="border-2 border-dashed border-[var(--border)] rounded-xl p-4 text-center">
          <input
            type="file"
            name="bankStatement"
            onChange={handleFileChange}
            accept=".pdf,.jpg,.jpeg,.png"
            className="hidden"
            id="bank-statement-upload"
          />
          <label
            htmlFor="bank-statement-upload"
            className="cursor-pointer flex flex-col items-center"
          >
 <div className="text-2xl mb-2"></div>
            <p className="text-sm text-[var(--text-muted)]">{t("vendorRegistration.step4.uploadBankStatement", "Upload Bank Statement")}</p>
          </label>
          {documents.bankStatement && (
            <p className="text-sm text-green-600 mt-2">
              {t("vendorRegistration.step1.fileUploaded", {
                fileName: documents.bankStatement.name,
              })}
            </p>
          )}
        </div>
      </div>

      <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/25 p-6 rounded-xl">
        <h3 className="text-lg font-medium text-blue-900 dark:text-blue-100 mb-4">
          {t("vendorRegistration.step4.terms")}
        </h3>
        <div className="space-y-4">
          <label className="flex items-start space-x-3">
            <input
              type="checkbox"
              name="termsAccepted"
              checked={formData.termsAccepted}
              onChange={handleInputChange}
              className="mt-1 rounded-lg border-[var(--border)] text-[var(--brand-primary)] focus:ring-[var(--brand-primary)]"
              required
            />
            <span className="text-sm text-[var(--text-muted)]">
              {t("vendorRegistration.step4.acceptTerms")}
            </span>
          </label>

          <label className="flex items-start space-x-3">
            <input
              type="checkbox"
              name="privacyPolicyAccepted"
              checked={formData.privacyPolicyAccepted}
              onChange={handleInputChange}
              className="mt-1 rounded-lg border-[var(--border)] text-[var(--brand-primary)] focus:ring-[var(--brand-primary)]"
              required
            />
            <span className="text-sm text-[var(--text-muted)]">
              {t("vendorRegistration.step4.acceptPrivacy")}
            </span>
          </label>
        </div>
      </div>

      <div className="bg-green-50 dark:bg-emerald-500/10 border border-green-100 dark:border-emerald-500/25 p-6 rounded-lg">
        <h3 className="text-lg font-medium text-green-900 dark:text-emerald-100 mb-4">
          {t("vendorRegistration.step4.summary")}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <p>
              <strong>
                {t("vendorRegistration.step4.summaryLabels.contactPerson")}
              </strong>{" "}
              {formData.contactPersonName}
            </p>
            <p>
              <strong>
                {t("vendorRegistration.step4.summaryLabels.email")}
              </strong>{" "}
              {formData.email}
            </p>
            <p>
              <strong>
                {t("vendorRegistration.step4.summaryLabels.phone")}
              </strong>{" "}
              {formData.phone}
            </p>
          </div>
          <div>
            <p>
              <strong>
                {t("vendorRegistration.step4.summaryLabels.storeName")}
              </strong>{" "}
              {formData.storeName}
            </p>
            <p>
              <strong>
                {t("vendorRegistration.step4.summaryLabels.categories")}
              </strong>{" "}
              {formData.productCategories
                .map((cat) => t(`vendorRegistration.categories.${cat}`))
                .join(", ")}
            </p>
            <p>
              <strong>
                {t("vendorRegistration.step4.summaryLabels.city")}
              </strong>{" "}
              {formData.city}
            </p>
            <p>
              <strong>
                {t("vendorRegistration.step4.summaryLabels.governorate")}
              </strong>{" "}
              {formData.governorate}
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderStep5 = () => (
    <div className="space-y-6">
      <h2 className="text-xl font-bold text-[var(--text)] mb-6">
        {t("vendorRegistration.step5.title")}
      </h2>

      <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/25 p-6 rounded-lg mb-6">
        <div className="flex items-center mb-3">
 <div className="text-2xl mr-3"></div>
          <h3 className="text-lg font-medium text-blue-900 dark:text-blue-100">
            {t("vendorRegistration.step5.accountSection.title")}
          </h3>
        </div>
        <p className="text-sm text-blue-700 dark:text-blue-100/80">
          {t("vendorRegistration.step5.accountSection.description")}
        </p>
      </div>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-[var(--text-muted)] mb-2">
            {t("vendorRegistration.step5.accountEmail")} *
          </label>
          <input
            type="email"
            name="accountEmail"
            value={accountData.accountEmail}
            onChange={handleAccountInputChange}
            placeholder={t("vendorRegistration.step5.accountEmailPlaceholder")}
            className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/40 focus:border-[var(--brand-primary)] transition-all"
            required
          />
          <p className="text-xs text-[var(--text-subtle)] mt-1">
            {t("vendorRegistration.step5.accountEmailHint", "This email will be used to log into your vendor dashboard")}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-[var(--text-muted)] mb-2">
              {t("vendorRegistration.step5.password")} *
            </label>
            <input
              type="password"
              name="password"
              value={accountData.password}
              onChange={handleAccountInputChange}
              placeholder={t("vendorRegistration.step5.passwordPlaceholder")}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/40 focus:border-[var(--brand-primary)] transition-all"
              required
              minLength={8}
            />
            <p className="text-xs text-[var(--text-subtle)] mt-1">
              {t("vendorRegistration.step5.passwordHint", "Must be at least 8 characters long")}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-muted)] mb-2">
              {t("vendorRegistration.step5.confirmPassword")} *
            </label>
            <input
              type="password"
              name="confirmPassword"
              value={accountData.confirmPassword}
              onChange={handleAccountInputChange}
              placeholder={t(
                "vendorRegistration.step5.confirmPasswordPlaceholder",
              )}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg)] text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]/40 focus:border-[var(--brand-primary)] transition-all"
              required
            />
            {accountData.password && accountData.confirmPassword && (
              <div className="mt-1">
                {accountData.password === accountData.confirmPassword ? (
                  <p className="text-xs text-green-600">
                    {t("vendorRegistration.validation.passwordsMatch")}
                  </p>
                ) : (
                  <p className="text-xs text-red-600">
                    {t("vendorRegistration.validation.passwordsDoNotMatch")}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="bg-[var(--surface-2)] p-4 rounded-xl border border-[var(--border)]">
          <h4 className="text-sm font-semibold text-[var(--text)] mb-2">
            {t("vendorRegistration.step5.passwordRequirements")}
          </h4>
          <ul className="text-xs text-[var(--text-muted)] space-y-1">
            <li className="flex items-center">
              <span
                className={`mr-2 ${
                  accountData.password.length >= 8
                    ? "text-green-600"
                    : "text-[var(--text-subtle)]"
                }`}
              >
 {accountData.password.length >= 8 ? "" : "○"}
              </span>
              {t("vendorRegistration.step5.minLength")}
            </li>
            <li className="flex items-center">
              <span
                className={`mr-2 ${
                  /[A-Z]/.test(accountData.password)
                    ? "text-green-600"
                    : "text-[var(--text-subtle)]"
                }`}
              >
 {/[A-Z]/.test(accountData.password) ? "" : "○"}
              </span>
              {t("vendorRegistration.step5.uppercase")}
            </li>
            <li className="flex items-center">
              <span
                className={`mr-2 ${
                  /[a-z]/.test(accountData.password)
                    ? "text-green-600"
                    : "text-[var(--text-subtle)]"
                }`}
              >
 {/[a-z]/.test(accountData.password) ? "" : "○"}
              </span>
              {t("vendorRegistration.step5.lowercase")}
            </li>
            <li className="flex items-center">
              <span
                className={`mr-2 ${
                  /[0-9]/.test(accountData.password)
                    ? "text-green-600"
                    : "text-[var(--text-subtle)]"
                }`}
              >
 {/[0-9]/.test(accountData.password) ? "" : "○"}
              </span>
              {t("vendorRegistration.step5.number")}
            </li>
          </ul>
        </div>

        <div className="bg-amber-50 dark:bg-amber-500/10 p-4 rounded-lg border border-amber-200 dark:border-amber-500/30">
          <div className="flex items-start">
 <div className="text-amber-600 dark:text-amber-300 mr-2"></div>
            <div>
              <h4 className="text-sm font-medium text-amber-800 dark:text-amber-100 mb-1">
                {t("vendorRegistration.step5.securityNote.title")}
              </h4>
              <p className="text-xs text-amber-700 dark:text-amber-100/90">
                {t("vendorRegistration.step5.securityNote.content")}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  /* ── Sidebar tips per step ── */
  const sidebarTips: Record<number, { icon: ComponentType<SVGProps<SVGSVGElement>>; title: string; text: string }[]> = {
    1: [
      { icon: ClipboardDocumentListIcon, title: t("vendorRegistration.tips.license1Title", "Valid License"), text: t("vendorRegistration.tips.license1", "Make sure your commercial registration is up-to-date and not expired.") },
      { icon: CameraIcon, title: t("vendorRegistration.tips.license2Title", "Clear Scans"), text: t("vendorRegistration.tips.license2", "Upload high-quality, color scans of all document pages.") },
    ],
    2: [
      { icon: EnvelopeIcon, title: t("vendorRegistration.tips.business1Title", "Business Email"), text: t("vendorRegistration.tips.business1", "Use your official business email for faster verification.") },
      { icon: DevicePhoneMobileIcon, title: t("vendorRegistration.tips.business2Title", "Phone Number"), text: t("vendorRegistration.tips.business2", "Provide a phone number where we can reach you during business hours.") },
    ],
    3: [
      { icon: TagIcon, title: t("vendorRegistration.tips.store1Title", "Store Name"), text: t("vendorRegistration.tips.store1", "Choose a unique, memorable store name that reflects your brand.") },
      { icon: CubeIcon, title: t("vendorRegistration.tips.store2Title", "Categories"), text: t("vendorRegistration.tips.store2", "Select all categories that match your product range for better visibility.") },
    ],
    4: [
      { icon: CheckCircleIcon, title: t("vendorRegistration.tips.docs1Title", "Required Docs"), text: t("vendorRegistration.tips.docs1", "Tax card and national ID are required. Bank statement is optional but speeds up verification.") },
      { icon: PencilSquareIcon, title: t("vendorRegistration.tips.docs2Title", "Review Summary"), text: t("vendorRegistration.tips.docs2", "Double-check all your details in the summary section before proceeding.") },
    ],
    5: [
      { icon: LockClosedIcon, title: t("vendorRegistration.tips.account1Title", "Strong Password"), text: t("vendorRegistration.tips.account1", "Use a mix of uppercase, lowercase, numbers, and symbols.") },
      { icon: EnvelopeIcon, title: t("vendorRegistration.tips.account2Title", "Confirmation Email"), text: t("vendorRegistration.tips.account2", "You'll receive login credentials at the email address you provide here.") },
    ],
  };

  const progressPercent = Math.round(((currentStep - 1) / (STEPS.length - 1)) * 100);

  return (
    <>
      <Header />
      <main className="min-h-screen bg-[var(--bg)]">

        {/* ═══════ HERO SECTION ═══════ */}
        <section className="relative overflow-hidden bg-gradient-to-br from-[#15151C] via-[#0B0B10] to-[#15151C] py-14 sm:py-20">
          {/* Ambient orbs */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 right-[20%] w-72 h-72 bg-[var(--brand-primary)] rounded-full opacity-[0.07] blur-3xl" />
            <div className="absolute bottom-0 left-[15%] w-64 h-64 bg-[var(--brand-accent)] rounded-full opacity-[0.06] blur-3xl" />
          </div>
          {/* Grid */}
          <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)", backgroundSize: "40px 40px" }} />

          <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 mb-5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-medium text-white/80 uppercase tracking-wider">
                {t("vendorRegistration.heroBadge", "Now Accepting New Vendors")}
              </span>
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white leading-tight mb-4">
              {t("vendorRegistration.heroTitle", "Grow Your Business")}
              <span className="block bg-gradient-to-r from-[#00A8E8] to-[#7FD8FF] bg-clip-text text-transparent">
                {t("vendorRegistration.heroTitleAccent", "with Belgomla")}
              </span>
            </h1>
            <p className="text-base sm:text-lg text-white/60 max-w-xl mx-auto mb-8">
              {t("vendorRegistration.heroSubtitle", "Join hundreds of vendors reaching thousands of IT & networking buyers across Egypt.")}
            </p>

            {/* Benefit pills */}
            <div className="flex flex-wrap items-center justify-center gap-3 mb-8">
              {[
                { icon: BanknotesIcon, text: t("vendorRegistration.heroBenefit1", "No Listing Fees") },
                { icon: FlagIcon, text: t("vendorRegistration.heroBenefit2", "Dedicated Support") },
                { icon: BoltIcon, text: t("vendorRegistration.heroBenefit3", "Fast Payouts") },
              ].map((b) => (
                <span key={b.text} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/8 border border-white/15 text-sm text-white/80">
                  <b.icon className="w-4 h-4" aria-hidden="true" /> {b.text}
                </span>
              ))}
            </div>

            {/* Trust stats */}
            <div className="grid grid-cols-3 gap-4 max-w-md mx-auto">
              {[
                { num: "100+", label: t("vendorRegistration.heroStat1", "Active Vendors") },
                { num: "5K+", label: t("vendorRegistration.heroStat2", "Products Listed") },
                { num: "10K+", label: t("vendorRegistration.heroStat3", "Orders Processed") },
              ].map((s) => (
                <div key={s.label} className="text-center">
                  <div className="text-xl sm:text-2xl font-black text-white">{s.num}</div>
                  <div className="text-[11px] text-white/50 uppercase tracking-wider">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ═══════ FORM AREA ═══════ */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8 items-start">

            {/* ── LEFT: Form Card ── */}
            <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] shadow-sm p-6 sm:p-8">
              {/* Progress text */}
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-[var(--text-muted)]">
                  {t("vendorRegistration.stepOf", { current: currentStep, total: STEPS.length, defaultValue: `Step ${currentStep} of ${STEPS.length}` })}
                </span>
                <span className="text-xs font-bold text-[var(--brand-primary)]">{progressPercent}%</span>
              </div>
              {/* Thin progress bar */}
              <div className="h-1 rounded-full bg-[var(--surface-2)] mb-6 overflow-hidden">
                <div className="h-full rounded-full bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-accent)] transition-all duration-500" style={{ width: `${progressPercent}%` }} />
              </div>

              {renderStepIndicator()}

              <form onSubmit={handleSubmit}>
                {currentStep === 1 && renderStep1()}
                {currentStep === 2 && renderStep2()}
                {currentStep === 3 && renderStep3()}
                {currentStep === 4 && renderStep4()}
                {currentStep === 5 && renderStep5()}

                {/* Navigation buttons */}
                <div className="flex items-center justify-between mt-8 pt-6 border-t border-[var(--border)]">
                  <button
                    type="button"
                    onClick={prevStep}
                    disabled={currentStep === 1}
                    className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                      currentStep === 1
                        ? "bg-[var(--surface-2)] text-[var(--text-subtle)] cursor-not-allowed"
                        : "bg-[var(--surface-2)] text-[var(--text)] hover:bg-[var(--border)] active:scale-[0.97]"
                    }`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                    {t("vendorRegistration.buttons.previous")}
                  </button>

                  {currentStep < 5 ? (
                    <button
                      type="button"
                      onClick={nextStep}
                      className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-accent)] hover:shadow-lg hover:shadow-[var(--brand-primary)]/20 hover:-translate-y-0.5 active:scale-[0.97] transition-all duration-200"
                    >
                      {t("vendorRegistration.buttons.next")}
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={loading}
                      className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-emerald-500 to-teal-600 hover:shadow-lg hover:shadow-emerald-500/20 hover:-translate-y-0.5 active:scale-[0.97] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? (
                        <>
                          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                          {t("vendorRegistration.buttons.registering")}
                        </>
                      ) : (
                        <>
                          {t("vendorRegistration.buttons.submit")}
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </form>
            </div>

            {/* ── RIGHT: Sticky Sidebar ── */}
            <aside className="hidden lg:block space-y-5 sticky top-24">
              {/* Why sell on Belgomla */}
              <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] p-5">
                <h3 className="text-sm font-bold text-[var(--text)] mb-4">
 {t("vendorRegistration.sidebar.whySell", "Why Sell on Belgomla?")}
                </h3>
                <ul className="space-y-3">
                  {[
                    { icon: FlagIcon, text: t("vendorRegistration.sidebar.benefit1", "Access to thousands of B2B buyers") },
                    { icon: ChartBarIcon, text: t("vendorRegistration.sidebar.benefit2", "Real-time analytics dashboard") },
                    { icon: CreditCardIcon, text: t("vendorRegistration.sidebar.benefit3", "Secure, on-time payments") },
                    { icon: CubeIcon, text: t("vendorRegistration.sidebar.benefit4", "Easy inventory management") },
                    { icon: ArrowTrendingUpIcon, text: t("vendorRegistration.sidebar.benefit5", "Marketing tools to boost sales") },
                  ].map((item) => (
                    <li key={item.text} className="flex items-start gap-2.5">
                      <item.icon className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                      <span className="text-xs text-[var(--text-muted)] leading-relaxed">{item.text}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Step-contextual tips */}
              <div className="bg-gradient-to-br from-[var(--brand-primary)]/5 to-[var(--brand-accent)]/5 rounded-2xl border border-[var(--brand-primary)]/15 p-5">
                <h4 className="text-xs font-bold text-[var(--brand-primary)] dark:text-[var(--brand-accent)] uppercase tracking-wider mb-3">
 {t("vendorRegistration.sidebar.tips", "Tips for this step")}
                </h4>
                <div className="space-y-3">
                  {(sidebarTips[currentStep] || []).map((tip, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className="text-sm shrink-0"><tip.icon className="w-4 h-4" aria-hidden="true" /></span>
                      <div>
                        <p className="text-xs font-semibold text-[var(--text)]">{tip.title}</p>
                        <p className="text-[11px] text-[var(--text-muted)] leading-relaxed">{tip.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Trust badges */}
              <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] p-5">
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { icon: LockClosedIcon, text: t("vendorRegistration.sidebar.trust1", "SSL Secured") },
                    { icon: ShieldCheckIcon, text: t("vendorRegistration.sidebar.trust2", "Data Protected") },
                    { icon: CheckCircleIcon, text: t("vendorRegistration.sidebar.trust3", "Verified Platform") },
                    { icon: PhoneIcon, text: t("vendorRegistration.sidebar.trust4", "24/7 Support") },
                  ].map((badge) => (
                    <div key={badge.text} className="flex items-center gap-1.5 text-[11px] text-[var(--text-muted)]">
                      <badge.icon className="w-4 h-4" aria-hidden="true" /> {badge.text}
                    </div>
                  ))}
                </div>
              </div>

              {/* Support contact */}
              <div className="text-center py-3">
                <p className="text-xs text-[var(--text-subtle)]">
                  {t("vendorRegistration.sidebar.needHelp", "Need help?")}
                </p>
                <a href="mailto:vendors@belgomla.com" className="text-xs font-semibold text-[var(--brand-primary)] dark:text-[var(--brand-accent)] hover:underline">
                  vendors@belgomla.com
                </a>
              </div>
            </aside>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
};

export default VendorRegistrationPage;
