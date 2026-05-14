import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  MagnifyingGlassIcon,
  PlusIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { useBrandStore } from "../../stores/brand.store";
import BrandModal from "../../components/BrandModal";
import ViewBrandModal from "../../components/ViewBrandModal";

const BrandsPage: React.FC = () => {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState<any>(null);
  const [viewingBrand, setViewingBrand] = useState<any>(null);
  const { brands, loading, fetchBrands, safeDeleteBrand, updateBrand } =
    useBrandStore();

  useEffect(() => {
    fetchBrands();
  }, [fetchBrands]);

  const getStatusColor = (isActive: boolean) => {
    return isActive
      ? "bg-[#009688]/10 text-[#009688]"
      : "bg-[#9E9E9E]/10 text-[#9E9E9E]";
  };

  const filteredBrands = brands?.filter(
    (brand) =>
      brand.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (brand.description &&
        brand.description.toLowerCase().includes(searchTerm.toLowerCase()))
  ) || [];

  const handleDelete = async (brandId: string) => {
    if (window.confirm(t("brands.confirmDelete"))) {
      await safeDeleteBrand(brandId);
      fetchBrands(); // Refresh the list
    }
  };

  const handleAddBrand = () => {
    setEditingBrand(null);
    setModalOpen(true);
  };

  const handleEditBrand = (brand: any) => {
    setEditingBrand(brand);
    setModalOpen(true);
  };

  const handleViewBrand = (brand: any) => {
    setViewingBrand(brand);
    setViewModalOpen(true);
  };

  const handleViewModalClose = () => {
    setViewModalOpen(false);
    setViewingBrand(null);
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setEditingBrand(null);
    fetchBrands(); // Refresh after modal closes
  };

  const handleToggleStatus = async (brand: any) => {
    await updateBrand(brand._id, { isActive: !brand.isActive });
    fetchBrands(); // Refresh the list
  };

  if (loading && (!brands || brands.length === 0)) {
    return (
      <div className="flex justify-center items-center h-64">{t("brands.loading")}</div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-[#333333]">
            {t("brands.title")}
          </h1>
          <p className="text-[#9E9E9E]">{t("brands.subtitle")}</p>
        </div>
        <button
          onClick={handleAddBrand}
          className="bg-[#FFD600] text-[#333333] px-4 py-2 rounded-lg hover:bg-[#e6c100] transition-colors flex items-center gap-2 font-medium"
        >
          <PlusIcon className="h-4 w-4" />
          {t("brands.addBrand")}
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">{t("brands.totalBrands")}</p>
              <p className="text-2xl font-bold text-gray-900">
                {brands?.length || 0}
              </p>
            </div>
            <div className="bg-[var(--brand-primary)]/10 p-3 rounded-full">
              <span className="text-2xl">🏷️</span>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">{t("brands.activeBrands")}</p>
              <p className="text-2xl font-bold text-green-600">
                {(brands?.filter((b) => b.isActive) || []).length}
              </p>
            </div>
            <div className="bg-green-100 p-3 rounded-full">
              <span className="text-2xl">✅</span>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">{t("brands.inactiveBrands")}</p>
              <p className="text-2xl font-bold text-orange-600">
                {(brands?.filter((b) => !b.isActive) || []).length}
              </p>
            </div>
            <div className="bg-orange-100 p-3 rounded-full">
              <span className="text-2xl">⏸️</span>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">{t("brands.brandsWithLogo")}</p>
              <p className="text-2xl font-bold text-[var(--brand-primary)]">
                {(brands?.filter((b) => b.logo) || []).length}
              </p>
            </div>
            <div className="bg-[var(--brand-primary)]/10 p-3 rounded-full">
              <span className="text-2xl">🖼️</span>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <div className="relative">
          <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder={t("brands.searchPlaceholder")}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--brand-primary)] focus:border-transparent"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Brands Table */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t("brands.colBrand")}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t("brands.colDescription")}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t("brands.colLogo")}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t("brands.colStatus")}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t("brands.colActions")}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredBrands?.map((brand) => (
                <tr key={brand._id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {brand.name}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {brand.description || "-"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {brand.logo ? (
                      <img
                        className="h-10 w-10 rounded-lg object-cover"
                        src={brand.logo}
                        alt={brand.name}
                       loading="lazy" decoding="async"/>
                    ) : (
                      <span className="text-gray-400">{t("brands.noLogo")}</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(
                        brand.isActive
                      )}`}
                    >
                      {brand.isActive ? t("brands.active") : t("brands.inactive")}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleViewBrand(brand)}
                        className="text-[var(--brand-primary)] hover:text-[var(--brand-accent)]"
                      >
                        <EyeIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleToggleStatus(brand)}
                        className={`hover:text-gray-900 ${brand.isActive ? "text-green-600" : "text-gray-600"
                          }`}
                        title={brand.isActive ? t("brands.deactivate") : t("brands.activate")}
                      >
                        {brand.isActive ? "✓" : "✗"}
                      </button>
                      <button
                        onClick={() => handleEditBrand(brand)}
                        className="text-green-600 hover:text-green-900"
                      >
                        <PencilIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(brand._id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="bg-white px-6 py-3 rounded-lg shadow-sm border flex items-center justify-between">
        <div className="text-sm text-gray-700">
          {t("brands.showing")} <span className="font-medium">1</span> {t("brands.to")}{" "}
          <span className="font-medium">{filteredBrands.length}</span> {t("brands.of")}{" "}
          <span className="font-medium">{filteredBrands.length}</span> {t("brands.results")}
        </div>
        <div className="flex space-x-2">
          <button
            className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50"
            disabled
          >
            {t("brands.previous")}
          </button>
          <button className="px-3 py-1 bg-[var(--brand-accent)] text-white rounded text-sm">
            1
          </button>
          <button
            className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50"
            disabled
          >
            {t("brands.next")}
          </button>
        </div>
      </div>

      {/* Brand Modal */}
      <BrandModal
        isOpen={modalOpen}
        onClose={handleModalClose}
        brand={editingBrand}
      />

      {/* View Brand Modal */}
      <ViewBrandModal
        isOpen={viewModalOpen}
        onClose={handleViewModalClose}
        brand={viewingBrand}
      />
    </div>
  );
};

export default BrandsPage;
