import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useAdvertisementStore } from "../../stores/advertisement.store";
import { PlusIcon, PencilIcon, TrashIcon, EyeIcon } from "@heroicons/react/24/outline";
import toast from "react-hot-toast";
import AdvertisementModal from "../../components/admin/AdvertisementModal";

const AdvertisementsPage: React.FC = () => {
  const { t } = useTranslation();
  const {
    advertisements,
    loading,
    fetchAdvertisements,
    deleteAdvertisement,
  } = useAdvertisementStore();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAd, setEditingAd] = useState<any>(null);

  useEffect(() => {
    fetchAdvertisements();
  }, [fetchAdvertisements]);

  const handleCreate = () => {
    setEditingAd(null);
    setIsModalOpen(true);
  };

  const handleEdit = (ad: any) => {
    setEditingAd(ad);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm(t("ads.confirmDelete"))) {
      const success = await deleteAdvertisement(id);
      if (success) {
        toast.success(t("ads.deleteSuccess"));
        fetchAdvertisements();
      } else {
        toast.error(t("ads.deleteFailed"));
      }
    }
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingAd(null);
    fetchAdvertisements();
  };

  const getPositionBadge = (position: string) => {
    const colors: Record<string, string> = {
      hero: "bg-[var(--brand-primary)]/10 text-[var(--brand-accent)]",
      banner: "bg-[var(--brand-primary)]/10 text-[var(--brand-accent)]",
      sidebar: "bg-green-100 text-green-800",
      popup: "bg-orange-100 text-orange-800",
    };
    return colors[position] || "bg-gray-100 text-gray-800";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t("ads.title")}</h1>
          <p className="text-gray-600">{t("ads.subtitle")}</p>
        </div>
        <button
          onClick={handleCreate}
          className="bg-[#FFD600] text-[#333333] px-4 py-2 rounded-lg hover:bg-[#e6c100] transition-colors flex items-center gap-2 font-medium"
        >
          <PlusIcon className="h-5 w-5" />
          {t("ads.addAdvertisement")}
        </button>
      </div>

      {/* Advertisements List */}
      {loading && advertisements.length === 0 ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#002B5B]"></div>
        </div>
      ) : advertisements.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <p className="text-gray-500 mb-4">{t("ads.empty")}</p>
          <button
            onClick={handleCreate}
            className="bg-[#FFD600] text-[#333333] px-4 py-2 rounded-lg hover:bg-[#e6c100] transition-colors"
          >
            {t("ads.createFirst")}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {advertisements.map((ad) => (
            <div
              key={ad._id}
              className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow"
            >
              <div className="relative h-48">
                <img
                  src={ad.image}
                  alt={ad.title}
                  className="w-full h-full object-cover"
                />
                {!ad.isActive && (
                  <div className="absolute top-2 right-2 bg-red-500 text-white text-xs px-2 py-1 rounded">
                    {t("ads.inactive")}
                  </div>
                )}
              </div>
              <div className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-lg font-semibold text-gray-900 flex-1">
                    {ad.title}
                  </h3>
                  <span className={`text-xs px-2 py-1 rounded ${getPositionBadge(ad.position)}`}>
                    {ad.position}
                  </span>
                </div>
                {ad.description && (
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                    {ad.description}
                  </p>
                )}
                <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <EyeIcon className="h-4 w-4" />
                      {ad.viewCount}
                    </span>
                    <span>{t("ads.clicks")}: {ad.clickCount}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(ad)}
                    className="flex-1 bg-[var(--brand-primary)] text-white px-3 py-2 rounded-lg hover:bg-[var(--brand-accent)] transition-colors flex items-center justify-center gap-1"
                  >
                    <PencilIcon className="h-4 w-4" />
                    {t("ads.edit")}
                  </button>
                  <button
                    onClick={() => handleDelete(ad._id)}
                    className="flex-1 bg-red-500 text-white px-3 py-2 rounded-lg hover:bg-red-600 transition-colors flex items-center justify-center gap-1"
                  >
                    <TrashIcon className="h-4 w-4" />
                    {t("ads.delete")}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <AdvertisementModal
          isOpen={isModalOpen}
          onClose={handleModalClose}
          advertisement={editingAd}
        />
      )}
    </div>
  );
};

export default AdvertisementsPage;

