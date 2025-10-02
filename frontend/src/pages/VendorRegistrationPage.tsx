import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { useVendorStore } from "../stores/vendor.store";
import type { VendorRegistrationData } from "../types/vendor.type";

const VendorRegistrationPage: React.FC = () => {
  const navigate = useNavigate();
  const { registerVendor, loading } = useVendorStore();

  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<VendorRegistrationData>({
    businessName: "",
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

  const [errors, setErrors] = useState<Record<string, string>>({});

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
    >
  ) => {
    const { name, value, type } = e.target;

    if (type === "checkbox") {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData((prev) => ({ ...prev, [name]: checked }));
    } else if (name === "productCategories") {
      // Handle multi-select for categories
      const selectedOptions = Array.from(
        (e.target as HTMLSelectElement).selectedOptions,
        (option) => option.value
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
      (field) => !formData[field as keyof VendorRegistrationData]
    );

    if (missingFields.length > 0) {
      toast.error(
        `Please fill in all required fields: ${missingFields.join(", ")}`
      );
      return false;
    }

    // Check if expiry date is after issue date
    if (formData.issueDate && formData.expiryDate) {
      if (new Date(formData.expiryDate) <= new Date(formData.issueDate)) {
        toast.error("Expiry date must be after issue date");
        return false;
      }
    }

    return true;
  };

  const validateStep2 = (): boolean => {
    const requiredFields = [
      "businessName",
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
      (field) => !formData[field as keyof VendorRegistrationData]
    );

    if (missingFields.length > 0) {
      toast.error(
        `Please fill in all required fields: ${missingFields.join(", ")}`
      );
      return false;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast.error("Please enter a valid email address");
      return false;
    }

    // Validate phone format (basic validation)
    const phoneRegex = /^\+?[\d\s\-()]{10,}$/;
    if (!phoneRegex.test(formData.phone)) {
      toast.error("Please enter a valid phone number");
      return false;
    }

    return true;
  };

  const validateStep3 = (): boolean => {
    if (!formData.storeName) {
      toast.error("Store name is required");
      return false;
    }

    if (formData.productCategories.length === 0) {
      toast.error("Please select at least one product category");
      return false;
    }

    return true;
  };

  const validateStep4 = (): boolean => {
    if (!formData.termsAccepted) {
      toast.error("Please accept the Terms and Conditions");
      return false;
    }

    if (!formData.privacyPolicyAccepted) {
      toast.error("Please accept the Privacy Policy");
      return false;
    }

    return true;
  };

  const validateStep5 = (): boolean => {
    if (!accountData.accountEmail) {
      toast.error("Account email is required");
      return false;
    }

    if (!accountData.password) {
      toast.error("Password is required");
      return false;
    }

    if (!accountData.confirmPassword) {
      toast.error("Please confirm your password");
      return false;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(accountData.accountEmail)) {
      toast.error("Please enter a valid email address");
      return false;
    }

    if (accountData.password !== accountData.confirmPassword) {
      toast.error("Passwords do not match");
      return false;
    }

    if (accountData.password.length < 8) {
      toast.error("Password must be at least 8 characters long");
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
    // populate all form fields with representative demo values
    const tomorrow = new Date();
    const nextYear = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
    setFormData({
      businessName: "Demo Business",
      businessType: "company",
      commercialRegistrationNumber: "CR-123456",
      taxNumber: "TAX-987654",
      legalEntityType: "egyptian_tax_authority",
      licenseNumber: "LIC-2025-001",
      companyName: "Demo Company Ltd",
      companyAddress: "123 Demo Street",
      issueDate: tomorrow.toISOString().slice(0, 10),
      expiryDate: nextYear.toISOString().slice(0, 10),
      allowedActivities: "Retail, Online sales",
      contactPersonName: "John Doe",
      email: "contact@example.com",
      phone: "+201234567890",
      alternativePhone: "+201112223334",
      address: "123 Demo Street, Floor 2",
      city: "Cairo",
      governorate: "Cairo Governorate",
      postalCode: "11511",
      businessDescription: "Demo business selling various demo products.",
      productCategories: ["Electronics", "Fashion"],
      expectedMonthlyVolume: 1000,
      storeName: "Demo Store",
      storeDescription: "This is a demo store used for testing.",
      termsAccepted: true,
      privacyPolicyAccepted: true,
    });

    // prefill password so user only needs to enter account email
    setAccountData({
      accountEmail: "",
      password: "Password123",
      confirmPassword: "Password123",
    });
    // clear any attached documents (keeps files empty)
    setDocuments({});
    toast.success(
      "Demo data populated. Please enter your account email to continue."
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
      toast.success(
        "Vendor registration submitted successfully! We will review your application."
      );
      navigate("/vendor-registration-success");
    } catch (error: any) {
      console.error("Registration error:", error);
      toast.error(
        error?.response?.data?.message ||
          "Failed to submit registration. Please try again."
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
                : "bg-gray-200 text-gray-600"
            }`}
          >
            {step}
          </div>
          {step < 5 && (
            <div
              className={`w-16 h-1 mx-2 ${
                step < currentStep ? "bg-yellow-500" : "bg-gray-200"
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
          className="px-3 py-1 text-sm bg-gray-100 rounded-md hover:bg-gray-200"
        >
          Fill demo data
        </button>
      </div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">
        Legal Entity Information
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            What Authority is Your Commercial Registration From? *
          </label>
          <select
            name="legalEntityType"
            value={formData.legalEntityType}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
            required
          >
            <option value="egyptian_tax_authority">
              مصلحة الضرائب المصرية - EGYPTIAN TAX AUTHORITY
            </option>
            <option value="ministry_supply_trade">
              وزارة التموين والتجارة الداخلية - MINISTRY OF SUPPLY AND INTERNAL
              TRADE
            </option>
            <option value="other">Other</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            License Number *
          </label>
          <input
            type="text"
            name="licenseNumber"
            value={formData.licenseNumber}
            onChange={handleInputChange}
            placeholder="Enter your trade license number"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Company Name *
          </label>
          <input
            type="text"
            name="companyName"
            value={formData.companyName}
            onChange={handleInputChange}
            placeholder="Enter your company name"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Company Address *
          </label>
          <input
            type="text"
            name="companyAddress"
            value={formData.companyAddress}
            onChange={handleInputChange}
            placeholder="Enter your company address"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Issue Date *
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
            Expiry Date *
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

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          List of Allowed Activities (Optional)
        </label>
        <textarea
          name="allowedActivities"
          value={formData.allowedActivities}
          onChange={handleInputChange}
          placeholder="Enter your allowed activities"
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
        />
      </div>

      <div className="bg-gray-50 p-6 rounded-lg">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Upload Commercial Registration
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          Details on the document should match the details you entered.
          <br />
          Provide all the pages of the document and ensure that the image copy
          is high quality and colored.
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
              Click to upload or drag and drop
            </p>
            <p className="text-xs text-gray-500 mt-1">
              PDF, PNG, JPG up to 10MB
            </p>
          </label>
          {documents.commercialRegistration && (
            <p className="text-sm text-green-600 mt-2">
              ✓ {documents.commercialRegistration.name}
            </p>
          )}
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">
        Business Information
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Business Name *
          </label>
          <input
            type="text"
            name="businessName"
            value={formData.businessName}
            onChange={handleInputChange}
            placeholder="Enter your business name"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Business Type *
          </label>
          <select
            name="businessType"
            value={formData.businessType}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
            required
          >
            <option value="individual">Individual</option>
            <option value="company">Company</option>
            <option value="partnership">Partnership</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Contact Person Name *
          </label>
          <input
            type="text"
            name="contactPersonName"
            value={formData.contactPersonName}
            onChange={handleInputChange}
            placeholder="Enter contact person name"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Email Address *
          </label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleInputChange}
            placeholder="Enter email address"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Phone Number *
          </label>
          <input
            type="tel"
            name="phone"
            value={formData.phone}
            onChange={handleInputChange}
            placeholder="Enter phone number"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Alternative Phone
          </label>
          <input
            type="tel"
            name="alternativePhone"
            value={formData.alternativePhone}
            onChange={handleInputChange}
            placeholder="Enter alternative phone number"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Business Description *
        </label>
        <textarea
          name="businessDescription"
          value={formData.businessDescription}
          onChange={handleInputChange}
          placeholder="Describe your business"
          rows={4}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
          required
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            City *
          </label>
          <input
            type="text"
            name="city"
            value={formData.city}
            onChange={handleInputChange}
            placeholder="Enter city"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Governorate *
          </label>
          <input
            type="text"
            name="governorate"
            value={formData.governorate}
            onChange={handleInputChange}
            placeholder="Enter governorate"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Postal Code
          </label>
          <input
            type="text"
            name="postalCode"
            value={formData.postalCode}
            onChange={handleInputChange}
            placeholder="Enter postal code"
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
          placeholder="Enter complete address"
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
        Product Categories & Store Setup
      </h2>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select Product Categories *
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
              <span className="text-sm text-gray-700">{category}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Expected Monthly Sales Volume
        </label>
        <input
          type="number"
          name="expectedMonthlyVolume"
          value={formData.expectedMonthlyVolume}
          onChange={handleInputChange}
          placeholder="Enter expected monthly sales volume"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Store Name *
          </label>
          <input
            type="text"
            name="storeName"
            value={formData.storeName}
            onChange={handleInputChange}
            placeholder="Enter your store name"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Tax Number
          </label>
          <input
            type="text"
            name="taxNumber"
            value={formData.taxNumber}
            onChange={handleInputChange}
            placeholder="Enter tax number"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Store Description
        </label>
        <textarea
          name="storeDescription"
          value={formData.storeDescription}
          onChange={handleInputChange}
          placeholder="Describe your store"
          rows={4}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
        />
      </div>

      <div className="bg-gray-50 p-6 rounded-lg">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Store Logo (Optional)
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
            <p className="text-sm text-gray-600">Click to upload store logo</p>
            <p className="text-xs text-gray-500 mt-1">PNG, JPG up to 5MB</p>
          </label>
          {documents.storeLogo && (
            <p className="text-sm text-green-600 mt-2">
              ✓ {documents.storeLogo.name}
            </p>
          )}
        </div>
      </div>
    </div>
  );

  const renderStep4 = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">
        Documents & Final Review
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gray-50 p-6 rounded-lg">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Tax Card Document
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
                ✓ {documents.taxCard.name}
              </p>
            )}
          </div>
        </div>

        <div className="bg-gray-50 p-6 rounded-lg">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            National ID
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
                ✓ {documents.nationalId.name}
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
              ✓ {documents.bankStatement.name}
            </p>
          )}
        </div>
      </div>

      <div className="bg-blue-50 p-6 rounded-lg">
        <h3 className="text-lg font-medium text-blue-900 mb-4">
          Terms & Conditions
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
              I accept the{" "}
              <a href="#" className="text-blue-600 hover:underline">
                Terms and Conditions
              </a>{" "}
              for becoming a vendor on Belgomla
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
              I accept the{" "}
              <a href="#" className="text-blue-600 hover:underline">
                Privacy Policy
              </a>
            </span>
          </label>
        </div>
      </div>

      <div className="bg-green-50 p-6 rounded-lg">
        <h3 className="text-lg font-medium text-green-900 mb-4">
          Application Summary
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <p>
              <strong>Business Name:</strong> {formData.businessName}
            </p>
            <p>
              <strong>Contact Person:</strong> {formData.contactPersonName}
            </p>
            <p>
              <strong>Email:</strong> {formData.email}
            </p>
            <p>
              <strong>Phone:</strong> {formData.phone}
            </p>
          </div>
          <div>
            <p>
              <strong>Store Name:</strong> {formData.storeName}
            </p>
            <p>
              <strong>Categories:</strong>{" "}
              {formData.productCategories.join(", ")}
            </p>
            <p>
              <strong>City:</strong> {formData.city}
            </p>
            <p>
              <strong>Governorate:</strong> {formData.governorate}
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderStep5 = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Account Setup</h2>

      <div className="bg-blue-50 p-6 rounded-lg mb-6">
        <div className="flex items-center mb-3">
          <div className="text-2xl mr-3">🔐</div>
          <h3 className="text-lg font-medium text-blue-900">
            Create Your Vendor Account
          </h3>
        </div>
        <p className="text-sm text-blue-700">
          Set up your login credentials to access your vendor dashboard and
          manage your store.
        </p>
      </div>

      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Account Email Address *
          </label>
          <input
            type="email"
            name="accountEmail"
            value={accountData.accountEmail}
            onChange={handleAccountInputChange}
            placeholder="Enter your account email address"
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
              Password *
            </label>
            <input
              type="password"
              name="password"
              value={accountData.password}
              onChange={handleAccountInputChange}
              placeholder="Enter your password"
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
              Confirm Password *
            </label>
            <input
              type="password"
              name="confirmPassword"
              value={accountData.confirmPassword}
              onChange={handleAccountInputChange}
              placeholder="Confirm your password"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
              required
            />
            {accountData.password && accountData.confirmPassword && (
              <div className="mt-1">
                {accountData.password === accountData.confirmPassword ? (
                  <p className="text-xs text-green-600">✓ Passwords match</p>
                ) : (
                  <p className="text-xs text-red-600">
                    ✗ Passwords do not match
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="text-sm font-medium text-gray-900 mb-2">
            Password Requirements:
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
              At least 8 characters long
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
              At least one uppercase letter (recommended)
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
              At least one lowercase letter (recommended)
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
              At least one number (recommended)
            </li>
          </ul>
        </div>

        <div className="bg-amber-50 p-4 rounded-lg border border-amber-200">
          <div className="flex items-start">
            <div className="text-amber-600 mr-2">⚠️</div>
            <div>
              <h4 className="text-sm font-medium text-amber-800 mb-1">
                Important Security Note
              </h4>
              <p className="text-xs text-amber-700">
                Keep your login credentials secure. You will use this email and
                password to access your vendor dashboard, manage products, view
                orders, and track your store performance.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 py-12">
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
              Create Legal Entity
            </h1>
            <p className="text-gray-600 mt-2">
              You need to provide your commercial registration, tax information
              and identification documents to operate on Noon.
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
                    ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                    : "bg-gray-300 text-gray-700 hover:bg-gray-400"
                }`}
              >
                Previous
              </button>

              {currentStep < 5 ? (
                <button
                  type="button"
                  onClick={nextStep}
                  className="px-6 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600"
                >
                  Next
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 disabled:opacity-50"
                >
                  {loading ? "Submitting..." : "Submit Application"}
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default VendorRegistrationPage;
