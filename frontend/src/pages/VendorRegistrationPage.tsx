import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { useVendorStore } from "../stores/vendor.store";
import type { VendorRegistrationData } from "../types/vendor.type";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { useTranslation } from "react-i18next";

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
    <div className="flex items-center justify-center mb-8">
      {[1, 2, 3, 4, 5].map((step) => (
        <div key={step} className="flex items-center">
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium ${
              step <= currentStep
                ? "bg-yellow-500 text-white"
                : "bg-gray-200 text-gray-600 dark:bg-slate-700 dark:text-gray-300"
            }`}
          >
            {step}
          </div>
          {step < 5 && (
            <div
              className={`w-16 h-1 mx-2 ${
                step < currentStep
                  ? "bg-yellow-500"
                  : "bg-gray-200 dark:bg-slate-700"
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );

  const renderStep1 = () => (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={fillDummyData}
          className="px-3 py-1 text-sm bg-gray-100 rounded-md hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-gray-200"
        >
          {t("vendorRegistration.generateRandomData")}
        </button>
      </div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">
        {t("vendorRegistration.step1.title")}
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t("vendorRegistration.step1.legalEntityType")} *
          </label>
          <select
            name="legalEntityType"
            value={formData.legalEntityType}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
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
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t("vendorRegistration.step1.licenseNumber")} *
          </label>
          <input
            type="text"
            name="licenseNumber"
            value={formData.licenseNumber}
            onChange={handleInputChange}
            placeholder={t("vendorRegistration.step1.licenseNumberPlaceholder")}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t("vendorRegistration.step1.companyName")} *
          </label>
          <input
            type="text"
            name="companyName"
            value={formData.companyName}
            onChange={handleInputChange}
            placeholder={t("vendorRegistration.step1.companyNamePlaceholder")}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
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
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t("vendorRegistration.step1.issueDate")} *
          </label>
          <input
            type="date"
            name="issueDate"
            value={formData.issueDate}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t("vendorRegistration.step1.expiryDate")} *
          </label>
          <input
            type="date"
            name="expiryDate"
            value={formData.expiryDate}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
            required
          />
        </div>
      </div>

      <div className="bg-gray-50 p-6 rounded-lg">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          {t("vendorRegistration.step1.uploadCommercialRegistration")}
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          {t("vendorRegistration.step1.uploadDescription")}
        </p>
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
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
            <div className="text-4xl mb-2">📄</div>
            <p className="text-sm text-gray-600">
              {t("vendorRegistration.step1.clickToUpload")}
            </p>
            <p className="text-xs text-gray-500 mt-1">
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
      <h2 className="text-2xl font-bold text-gray-900 mb-6">
        {t("vendorRegistration.step2.title")}
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t("vendorRegistration.step2.businessType")} *
          </label>
          <select
            name="businessType"
            value={formData.businessType}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
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
          <label className="block text-sm font-medium text-gray-700 mb-2">
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
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t("vendorRegistration.step2.email")} *
          </label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleInputChange}
            placeholder={t("vendorRegistration.step2.emailPlaceholder")}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t("vendorRegistration.step2.phone")} *
          </label>
          <input
            type="tel"
            name="phone"
            value={formData.phone}
            onChange={handleInputChange}
            placeholder={t("vendorRegistration.step2.phonePlaceholder")}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
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
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
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
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
          required
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t("vendorRegistration.step2.city")} *
          </label>
          <input
            type="text"
            name="city"
            value={formData.city}
            onChange={handleInputChange}
            placeholder={t("vendorRegistration.step2.cityPlaceholder")}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t("vendorRegistration.step2.governorate")} *
          </label>
          <select
            name="governorate"
            value={formData.governorate}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
            required
          >
            <option value="">
              {t("vendorRegistration.options.selectGovernorate")}
            </option>
            {egyptianGovernorates.map((gov) => (
              <option key={gov} value={gov}>
                {gov}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t("vendorRegistration.step2.postalCode")}
          </label>
          <input
            type="text"
            name="postalCode"
            value={formData.postalCode}
            onChange={handleInputChange}
            placeholder={t("vendorRegistration.step2.postalCodePlaceholder")}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Full Address *
        </label>
        <textarea
          name="address"
          value={formData.address}
          onChange={handleInputChange}
          placeholder={t("vendorRegistration.step2.addressPlaceholder")}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
          required
        />
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">
        {t("vendorRegistration.step3.title")}
      </h2>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {t("vendorRegistration.step3.selectCategories")} *
        </label>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-4 border border-gray-300 rounded-md max-h-60 overflow-y-auto">
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
                className="rounded border-gray-300 text-yellow-600 focus:ring-yellow-500"
              />
              <span className="text-sm text-gray-700">
                {t(`vendorRegistration.categories.${category}`)}
              </span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {t("vendorRegistration.step3.expectedVolume")}
        </label>
        <input
          type="number"
          name="expectedMonthlyVolume"
          value={formData.expectedMonthlyVolume}
          onChange={handleInputChange}
          placeholder={t("vendorRegistration.step3.expectedVolumePlaceholder")}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t("vendorRegistration.step3.storeName")} *
          </label>
          <input
            type="text"
            name="storeName"
            value={formData.storeName}
            onChange={handleInputChange}
            placeholder={t("vendorRegistration.step3.storeNamePlaceholder")}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t("vendorRegistration.step3.taxNumber")}
          </label>
          <input
            type="text"
            name="taxNumber"
            value={formData.taxNumber}
            onChange={handleInputChange}
            placeholder={t("vendorRegistration.step3.taxNumberPlaceholder")}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
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
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
        />
      </div>

      <div className="bg-gray-50 p-6 rounded-lg">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          {t("vendorRegistration.step3.uploadStoreLogo")}
        </h3>
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
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
            <div className="text-4xl mb-2">🏪</div>
            <p className="text-sm text-gray-600">
              {t("vendorRegistration.step3.uploadLogoDescription")}
            </p>
            <p className="text-xs text-gray-500 mt-1">
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
      <h2 className="text-2xl font-bold text-gray-900 mb-6">
        {t("vendorRegistration.step4.title")}
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gray-50 p-6 rounded-lg">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            {t("vendorRegistration.step4.taxCard")}
          </h3>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
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
              <div className="text-2xl mb-2">📄</div>
              <p className="text-sm text-gray-600">Upload Tax Card</p>
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

        <div className="bg-gray-50 p-6 rounded-lg">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            {t("vendorRegistration.step4.nationalId")}
          </h3>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
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
              <p className="text-sm text-gray-600">Upload National ID</p>
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

      <div className="bg-gray-50 p-6 rounded-lg">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Bank Statement (Optional)
        </h3>
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
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
            <div className="text-2xl mb-2">🏦</div>
            <p className="text-sm text-gray-600">Upload Bank Statement</p>
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

      <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/25 p-6 rounded-lg">
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
              className="mt-1 rounded border-gray-300 text-yellow-600 focus:ring-yellow-500"
              required
            />
            <span className="text-sm text-gray-700">
              {t("vendorRegistration.step4.acceptTerms")}
            </span>
          </label>

          <label className="flex items-start space-x-3">
            <input
              type="checkbox"
              name="privacyPolicyAccepted"
              checked={formData.privacyPolicyAccepted}
              onChange={handleInputChange}
              className="mt-1 rounded border-gray-300 text-yellow-600 focus:ring-yellow-500"
              required
            />
            <span className="text-sm text-gray-700">
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
      <h2 className="text-2xl font-bold text-gray-900 mb-6">
        {t("vendorRegistration.step5.title")}
      </h2>

      <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/25 p-6 rounded-lg mb-6">
        <div className="flex items-center mb-3">
          <div className="text-2xl mr-3">🔐</div>
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
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t("vendorRegistration.step5.accountEmail")} *
          </label>
          <input
            type="email"
            name="accountEmail"
            value={accountData.accountEmail}
            onChange={handleAccountInputChange}
            placeholder={t("vendorRegistration.step5.accountEmailPlaceholder")}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
            required
          />
          <p className="text-xs text-gray-500 mt-1">
            This email will be used to log into your vendor dashboard
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t("vendorRegistration.step5.password")} *
            </label>
            <input
              type="password"
              name="password"
              value={accountData.password}
              onChange={handleAccountInputChange}
              placeholder={t("vendorRegistration.step5.passwordPlaceholder")}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
              required
              minLength={8}
            />
            <p className="text-xs text-gray-500 mt-1">
              Must be at least 8 characters long
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
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
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
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

        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="text-sm font-medium text-gray-900 mb-2">
            {t("vendorRegistration.step5.passwordRequirements")}
          </h4>
          <ul className="text-xs text-gray-600 space-y-1">
            <li className="flex items-center">
              <span
                className={`mr-2 ${
                  accountData.password.length >= 8
                    ? "text-green-600"
                    : "text-gray-400"
                }`}
              >
                {accountData.password.length >= 8 ? "✓" : "○"}
              </span>
              {t("vendorRegistration.step5.minLength")}
            </li>
            <li className="flex items-center">
              <span
                className={`mr-2 ${
                  /[A-Z]/.test(accountData.password)
                    ? "text-green-600"
                    : "text-gray-400"
                }`}
              >
                {/[A-Z]/.test(accountData.password) ? "✓" : "○"}
              </span>
              {t("vendorRegistration.step5.uppercase")}
            </li>
            <li className="flex items-center">
              <span
                className={`mr-2 ${
                  /[a-z]/.test(accountData.password)
                    ? "text-green-600"
                    : "text-gray-400"
                }`}
              >
                {/[a-z]/.test(accountData.password) ? "✓" : "○"}
              </span>
              {t("vendorRegistration.step5.lowercase")}
            </li>
            <li className="flex items-center">
              <span
                className={`mr-2 ${
                  /[0-9]/.test(accountData.password)
                    ? "text-green-600"
                    : "text-gray-400"
                }`}
              >
                {/[0-9]/.test(accountData.password) ? "✓" : "○"}
              </span>
              {t("vendorRegistration.step5.number")}
            </li>
          </ul>
        </div>

        <div className="bg-amber-50 dark:bg-amber-500/10 p-4 rounded-lg border border-amber-200 dark:border-amber-500/30">
          <div className="flex items-start">
            <div className="text-amber-600 dark:text-amber-300 mr-2">⚠️</div>
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

  return (
    <>
      <Header />
      <main className="min-h-screen bg-gray-50 dark:bg-[var(--bg)] py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="text-center mb-8">
              <div className="flex items-center justify-center mb-4">
                <img src="/logo.png" alt="Belgomla" className="h-12 w-auto" />
                <span className="ml-3 text-2xl font-bold text-gray-900">
                  Belgomla
                </span>
              </div>
              <h1 className="text-3xl font-bold text-gray-900">
                {t("vendorRegistration.title")}
              </h1>
              <p className="text-gray-600 mt-2">
                {t("vendorRegistration.subtitle")}
              </p>
            </div>

            {renderStepIndicator()}

            <form onSubmit={handleSubmit}>
              {currentStep === 1 && renderStep1()}
              {currentStep === 2 && renderStep2()}
              {currentStep === 3 && renderStep3()}
              {currentStep === 4 && renderStep4()}
              {currentStep === 5 && renderStep5()}

              <div className="flex justify-between mt-8">
                <button
                  type="button"
                  onClick={prevStep}
                  disabled={currentStep === 1}
                  className={`px-6 py-2 rounded-md ${
                    currentStep === 1
                      ? "bg-gray-200 text-gray-400 cursor-not-allowed dark:bg-slate-800 dark:text-gray-500"
                      : "bg-gray-300 text-gray-700 hover:bg-gray-400 dark:bg-slate-800 dark:text-gray-200 dark:hover:bg-slate-700"
                  }`}
                >
                  {t("vendorRegistration.buttons.previous")}
                </button>

                {currentStep < 5 ? (
                  <button
                    type="button"
                    onClick={nextStep}
                    className="px-6 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600"
                  >
                    {t("vendorRegistration.buttons.next")}
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-6 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 disabled:opacity-50"
                  >
                    {loading
                      ? t("vendorRegistration.buttons.registering")
                      : t("vendorRegistration.buttons.submit")}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
};

export default VendorRegistrationPage;
