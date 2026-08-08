import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useMoney } from "../lib/money";
import { useVendorStore } from "../stores/vendor.store";
import { axiosInstance } from "../lib/axios";

const AccountStore: React.FC = () => {
  const { t } = useTranslation();
  const money = useMoney();
  const {
    vendorStore,
    dashboardStats,
    fetchVendorStore,
    fetchDashboardStats,
    updateStore,
    loading,
  } = useVendorStore();

  // File upload states
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingDocument, setUploadingDocument] = useState<string | null>(
    null
  );
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  console.log("Vendor Store:", vendorStore);
  useEffect(() => {
    fetchVendorStore();
    fetchDashboardStats();
  }, [fetchVendorStore, fetchDashboardStats]);

  // Upload functions
  const uploadFile = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append("image", file);

    const response = await axiosInstance.post("/upload/upload", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    if (response.data.success) {
      return response.data.url;
    } else {
      throw new Error(response.data.message || t("Upload failed"));
    }
  };

  const handleLogoUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file || !vendorStore) return;

    setUploadingLogo(true);
    setUploadError(null);
    setUploadSuccess(null);

    try {
      const logoUrl = await uploadFile(file);
      await updateStore(vendorStore._id, { logo: logoUrl });
      setUploadSuccess("Logo updated successfully!");
      // Refresh store data
      fetchVendorStore();
    } catch (error: any) {
      setUploadError(error.message || t("Failed to upload logo"));
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleDocumentUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
    documentType: string
  ) => {
    const file = event.target.files?.[0];
    if (!file || !vendorStore) return;

    setUploadingDocument(documentType);
    setUploadError(null);
    setUploadSuccess(null);

    try {
      const documentUrl = await uploadFile(file);
      const documents = { ...vendorStore.documents };

      // Map document type to the correct field
      switch (documentType) {
        case "commercialRegistration":
          documents.commercialRegistration = documentUrl;
          break;
        case "taxCard":
          documents.taxCard = documentUrl;
          break;
        case "nationalId":
          documents.nationalId = documentUrl;
          break;
        case "bankStatement":
          documents.bankStatement = documentUrl;
          break;
      }

      await updateStore(vendorStore._id, { documents });
      setUploadSuccess(`${documentType} document updated successfully!`);
      // Refresh store data
      fetchVendorStore();
    } catch (error: any) {
      setUploadError(
        error.message || `Failed to upload ${documentType} document`
      );
    } finally {
      setUploadingDocument(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!vendorStore) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          {t("Store Information")}
        </h2>
        <p className="text-gray-600">{t("No store information found.")}</p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">My Store</h2>

      {/* Upload feedback messages */}
      {uploadError && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-red-400"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-800">{uploadError}</p>
            </div>
            <div className="ml-auto pl-3">
              <button
                onClick={() => setUploadError(null)}
                className="inline-flex rounded-md p-1.5 text-red-400 hover:bg-red-100 hover:text-red-500"
              >
                <svg
                  className="h-5 w-5"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {uploadSuccess && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-green-400"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-green-800">{uploadSuccess}</p>
            </div>
            <div className="ml-auto pl-3">
              <button
                onClick={() => setUploadSuccess(null)}
                className="inline-flex rounded-md p-1.5 text-green-400 hover:bg-green-100 hover:text-green-500"
              >
                <svg
                  className="h-5 w-5"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-8">
        {/* Store Logo and Basic Info */}
        <div className="bg-white rounded-lg p-6 border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {t("Store Overview")}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2 flex items-center space-x-6">
              <div className="w-24 h-24 bg-gray-200 rounded-lg flex items-center justify-center overflow-hidden relative">
                {vendorStore.logo ? (
                  <img
                    src={vendorStore.logo}
                    alt="Store Logo"
                    className="w-full h-full object-cover"
                   loading="lazy" decoding="async"/>
                ) : (
                  <svg
                    className="w-12 h-12 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                    />
                  </svg>
                )}
                <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                      disabled={uploadingLogo}
                    />
                    {uploadingLogo ? (
                      <div className="text-white text-xs">{t("Uploading...")}</div>
                    ) : (
                      <svg
                        className="w-6 h-6 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                        />
                      </svg>
                    )}
                  </label>
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {vendorStore.name}
                </h3>
                <p className="text-sm text-gray-600">
                  Status:{" "}
                  <span
                    className={`font-medium ${
                      vendorStore.status === "approved"
                        ? "text-green-600"
                        : vendorStore.status === "pending"
                        ? "text-yellow-600"
                        : "text-red-600"
                    }`}
                  >
                    {vendorStore.status}
                  </span>
                </p>
                <p className="text-sm text-gray-600">
                  Active: {vendorStore.isActive ? t("Yes") : t("No")} | Deleted:{" "}
                  {vendorStore.deleted ? t("Yes") : t("No")}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Basic Store Information */}
        <div className="bg-white rounded-lg p-6 border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {t("Basic Information")}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t("Store ID")}
              </label>
              <p className="text-gray-900 font-mono text-sm">
                {vendorStore._id}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t("Store Name")}
              </label>
              <p className="text-gray-900">{vendorStore.name}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t("Email")}
              </label>
              <p className="text-gray-900">
                {vendorStore.email || t("Not provided")}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t("Phone")}
              </label>
              <p className="text-gray-900">
                {vendorStore.phone || t("Not provided")}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t("Alternative Phone")}
              </label>
              <p className="text-gray-900">
                {vendorStore.alternativePhone || t("Not provided")}
              </p>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t("Description")}
              </label>
              <p className="text-gray-900">
                {vendorStore.description || t("No description available")}
              </p>
            </div>
          </div>
        </div>

        {/* Business Information */}
        <div className="bg-white rounded-lg p-6 border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {t("Business Information")}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t("Business Name")}
              </label>
              <p className="text-gray-900">
                {vendorStore.businessName || t("Not provided")}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t("Business Type")}
              </label>
              <p className="text-gray-900">
                {vendorStore.businessType || t("Not provided")}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t("Commercial Registration Number")}
              </label>
              <p className="text-gray-900">
                {vendorStore.commercialRegistrationNumber || t("Not provided")}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t("Tax Number")}
              </label>
              <p className="text-gray-900">
                {vendorStore.taxNumber || t("Not provided")}
              </p>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t("Business Description")}
              </label>
              <p className="text-gray-900">
                {vendorStore.businessDescription || t("No description available")}
              </p>
            </div>
          </div>
        </div>

        {/* Legal Entity Information */}
        <div className="bg-white rounded-lg p-6 border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {t("Legal Entity Information")}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t("Legal Entity Type")}
              </label>
              <p className="text-gray-900">
                {vendorStore.legalEntityType || t("Not provided")}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t("License Number")}
              </label>
              <p className="text-gray-900">
                {vendorStore.licenseNumber || t("Not provided")}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t("Company Name")}
              </label>
              <p className="text-gray-900">
                {vendorStore.companyName || t("Not provided")}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t("Company Address")}
              </label>
              <p className="text-gray-900">
                {vendorStore.companyAddress || t("Not provided")}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t("Issue Date")}
              </label>
              <p className="text-gray-900">
                {vendorStore.issueDate
                  ? new Date(vendorStore.issueDate).toLocaleDateString()
                  : "Not provided"}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t("Expiry Date")}
              </label>
              <p className="text-gray-900">
                {vendorStore.expiryDate
                  ? new Date(vendorStore.expiryDate).toLocaleDateString()
                  : "Not provided"}
              </p>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t("Allowed Activities")}
              </label>
              <p className="text-gray-900">
                {vendorStore.allowedActivities || t("Not provided")}
              </p>
            </div>
          </div>
        </div>

        {/* Contact Information */}
        <div className="bg-white rounded-lg p-6 border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {t("Contact Information")}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t("Contact Person Name")}
              </label>
              <p className="text-gray-900">
                {vendorStore.contactPersonName || t("Not provided")}
              </p>
            </div>
          </div>
        </div>

        {/* Address Information */}
        <div className="bg-white rounded-lg p-6 border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {t("Address Information")}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t("Address")}
              </label>
              <p className="text-gray-900">
                {vendorStore.address || t("Not provided")}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t("City")}
              </label>
              <p className="text-gray-900">
                {vendorStore.city || t("Not provided")}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t("Governorate")}
              </label>
              <p className="text-gray-900">
                {vendorStore.governorate || t("Not provided")}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t("Postal Code")}
              </label>
              <p className="text-gray-900">
                {vendorStore.postalCode || t("Not provided")}
              </p>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t("Location")}
              </label>
              <p className="text-gray-900">
                {vendorStore.location || t("Not provided")}
              </p>
            </div>
          </div>
        </div>

        {/* Product and Business Details */}
        <div className="bg-white rounded-lg p-6 border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {t("Product & Business Details")}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t("Expected Monthly Volume")}
              </label>
              <p className="text-gray-900">
                {vendorStore.expectedMonthlyVolume || t("Not provided")}
              </p>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t("Product Categories")}
              </label>
              <div className="flex flex-wrap gap-2">
                {vendorStore.productCategories &&
                vendorStore.productCategories.length > 0 ? (
                  vendorStore.productCategories.map((category, index) => (
                    <span
                      key={index}
                      className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-sm"
                    >
                      {category}
                    </span>
                  ))
                ) : (
                  <p className="text-gray-600">{t("No categories specified")}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Store Status and Approval */}
        <div className="bg-white rounded-lg p-6 border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {t("Status & Approval")}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t("Status")}
              </label>
              <p className="text-gray-900">
                {vendorStore.status || t("Not provided")}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t("Rejection Reason")}
              </label>
              <p className="text-gray-900">
                {vendorStore.rejectionReason || t("Not provided")}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t("Approved At")}
              </label>
              <p className="text-gray-900">
                {vendorStore.approvedAt
                  ? new Date(vendorStore.approvedAt).toLocaleDateString()
                  : "Not approved"}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t("Rejected At")}
              </label>
              <p className="text-gray-900">
                {vendorStore.rejectedAt
                  ? new Date(vendorStore.rejectedAt).toLocaleDateString()
                  : "Not rejected"}
              </p>
            </div>
          </div>
        </div>

        {/* Documents */}
        <div className="bg-white rounded-lg p-6 border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {t("Documents")}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t("Commercial Registration")}
              </label>
              <div className="flex items-center space-x-2">
                {vendorStore.documents?.commercialRegistration ? (
                  <a
                    href={vendorStore.documents.commercialRegistration}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 underline"
                  >
                    {t("View Document")}
                  </a>
                ) : (
                  <span className="text-gray-600">{t("Not uploaded")}</span>
                )}
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) =>
                      handleDocumentUpload(e, "commercialRegistration")
                    }
                    className="hidden"
                    disabled={uploadingDocument === "commercialRegistration"}
                  />
                  <span className="text-sm text-blue-600 hover:text-blue-800 underline">
                    {uploadingDocument === "commercialRegistration"
                      ? "Uploading..."
                      : "Upload"}
                  </span>
                </label>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t("Tax Card")}
              </label>
              <div className="flex items-center space-x-2">
                {vendorStore.documents?.taxCard ? (
                  <a
                    href={vendorStore.documents.taxCard}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 underline"
                  >
                    {t("View Document")}
                  </a>
                ) : (
                  <span className="text-gray-600">{t("Not uploaded")}</span>
                )}
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) => handleDocumentUpload(e, "taxCard")}
                    className="hidden"
                    disabled={uploadingDocument === "taxCard"}
                  />
                  <span className="text-sm text-blue-600 hover:text-blue-800 underline">
                    {uploadingDocument === "taxCard"
                      ? "Uploading..."
                      : "Upload"}
                  </span>
                </label>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t("National ID")}
              </label>
              <div className="flex items-center space-x-2">
                {vendorStore.documents?.nationalId ? (
                  <a
                    href={vendorStore.documents.nationalId}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 underline"
                  >
                    {t("View Document")}
                  </a>
                ) : (
                  <span className="text-gray-600">{t("Not uploaded")}</span>
                )}
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) => handleDocumentUpload(e, "nationalId")}
                    className="hidden"
                    disabled={uploadingDocument === "nationalId"}
                  />
                  <span className="text-sm text-blue-600 hover:text-blue-800 underline">
                    {uploadingDocument === "nationalId"
                      ? "Uploading..."
                      : "Upload"}
                  </span>
                </label>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t("Bank Statement")}
              </label>
              <div className="flex items-center space-x-2">
                {vendorStore.documents?.bankStatement ? (
                  <a
                    href={vendorStore.documents.bankStatement}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 underline"
                  >
                    {t("View Document")}
                  </a>
                ) : (
                  <span className="text-gray-600">{t("Not uploaded")}</span>
                )}
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) => handleDocumentUpload(e, "bankStatement")}
                    className="hidden"
                    disabled={uploadingDocument === "bankStatement"}
                  />
                  <span className="text-sm text-blue-600 hover:text-blue-800 underline">
                    {uploadingDocument === "bankStatement"
                      ? "Uploading..."
                      : "Upload"}
                  </span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Agreement Acceptance */}
        <div className="bg-white rounded-lg p-6 border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {t("Agreement Acceptance")}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t("Terms Accepted")}
              </label>
              <p className="text-gray-900">
                {vendorStore.termsAccepted ? t("Yes") : t("No")}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t("Privacy Policy Accepted")}
              </label>
              <p className="text-gray-900">
                {vendorStore.privacyPolicyAccepted ? t("Yes") : t("No")}
              </p>
            </div>
          </div>
        </div>

        {/* Store Metrics */}
        <div className="bg-white rounded-lg p-6 border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {t("Store Metrics")}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t("Total Sales")}
              </label>
              <p className="text-gray-900">
                {money(dashboardStats?.totalSales)}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t("Total Products")}
              </label>
              <p className="text-gray-900">
                {dashboardStats?.totalProducts || 0}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t("Total Orders")}
              </label>
              <p className="text-gray-900">
                {dashboardStats?.totalOrders || 0}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t("Rating")}
              </label>
              <p className="text-gray-900">{vendorStore.rating || 0}/5</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t("Total Reviews")}
              </label>
              <p className="text-gray-900">{vendorStore.totalReviews || 0}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t("Commission")}
              </label>
              <p className="text-gray-900">{vendorStore.commission || 0}%</p>
            </div>
          </div>
        </div>

        {/* Store Customization */}
        <div className="bg-white rounded-lg p-6 border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {t("Store Customization")}
          </h3>
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t("Subscribers")}
              </label>
              <p className="text-gray-900">
                {vendorStore.subscribers?.length || 0} subscribers
              </p>
            </div>

            {/* About Section */}
            {vendorStore.about && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t("About")}
                </label>
                <p className="text-gray-900">{vendorStore.about}</p>
              </div>
            )}

            {/* Story Section */}
            {vendorStore.story && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t("Story")}
                </label>
                <p className="text-gray-900">{vendorStore.story}</p>
              </div>
            )}

            {/* Achievements */}
            {vendorStore.achievements &&
              vendorStore.achievements.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t("Achievements")}
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {vendorStore.achievements.map((achievement, index) => (
                      <div
                        key={index}
                        className="bg-gray-50 p-4 rounded-lg text-center"
                      >
                        <div className="text-2xl font-bold text-blue-600">
                          {achievement.number}
                        </div>
                        <div className="text-sm text-gray-600">
                          {achievement.name}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            {/* Social Links */}
            {vendorStore.socialLinks && vendorStore.socialLinks.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t("Social Links")}
                </label>
                <div className="flex flex-wrap gap-2">
                  {vendorStore.socialLinks.map((link, index) => (
                    <a
                      key={index}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-sm hover:bg-blue-100 transition-colors"
                    >
                      {link.platform}
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Features */}
            {vendorStore.features && vendorStore.features.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t("Features")}
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {vendorStore.features.map((feature, index) => (
                    <div key={index} className="bg-gray-50 p-4 rounded-lg">
                      <div className="flex items-center mb-2">
                        <span className="text-2xl mr-3">{feature.icon}</span>
                        <h4 className="font-medium text-gray-900">
                          {feature.title}
                        </h4>
                      </div>
                      <p className="text-sm text-gray-600">
                        {feature.description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Slider */}
            {vendorStore.slider && vendorStore.slider.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t("Slider Images")}
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {vendorStore.slider.map((slide, index) => (
                    <div key={index} className="bg-gray-50 p-4 rounded-lg">
                      {slide.image && (
                        <img
                          src={slide.image}
                          alt={slide.title}
                          className="w-full h-32 object-cover rounded-lg mb-3"
                         loading="lazy" decoding="async"/>
                      )}
                      <h4 className="font-medium text-gray-900 mb-1">
                        {slide.title}
                      </h4>
                      <p className="text-sm text-gray-600">
                        {slide.description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Timestamps */}
        <div className="bg-white rounded-lg p-6 border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {t("Timestamps")}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t("Created At")}
              </label>
              <p className="text-gray-900">
                {new Date(vendorStore.createdAt).toLocaleDateString()}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t("Updated At")}
              </label>
              <p className="text-gray-900">
                {new Date(vendorStore.updatedAt).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccountStore;
