import React, { useState, useEffect } from 'react';
import { BuildingStorefrontIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { toast } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { useVendorStore } from '../../stores/vendor.store';
// import type { VendorStore } from '../../types/vendor.type';

const VendorStoreManagement: React.FC = () => {
  const { t } = useTranslation();
  const {
    vendorStore,
    loading,
    fetchVendorStore,
    createStore,
    updateStore
  } = useVendorStore();

  const [isEditing, setIsEditing] = useState(false);
  const [storeForm, setStoreForm] = useState({
    name: '',
    email: '',
    phone: '',
    description: '',
    address: '',
    location: '',
    about: '',
    story: '',
    socialLinks: [] as Array<{ platform: string; url: string }>,
    features: [] as Array<{ title: string; description: string; icon: string }>,
    achievements: [] as Array<{ number: number; name: string }>,
  });

  useEffect(() => {
    fetchVendorStore();
  }, [fetchVendorStore]);

  useEffect(() => {
    if (vendorStore) {
      setStoreForm({
        name: vendorStore.name || '',
        email: vendorStore.email || '',
        phone: vendorStore.phone || '',
        description: vendorStore.description || '',
        address: vendorStore.address || '',
        location: vendorStore.location || '',
        about: vendorStore.about || '',
        story: vendorStore.story || '',
        socialLinks: vendorStore.socialLinks || [],
        features: vendorStore.features || [],
        achievements: vendorStore.achievements || [],
      });
    }
  }, [vendorStore]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (vendorStore) {
        await updateStore(vendorStore._id, storeForm);
        toast.success(t('vendor.storeUpdatedSuccess'));
      } else {
        await createStore(storeForm);
        toast.success(t('vendor.storeCreatedSuccess'));
      }
      setIsEditing(false);
    } catch (error) {
      toast.error(t('vendor.storeFailedSave'));
    }
  };

  const addSocialLink = () => {
    setStoreForm(prev => ({
      ...prev,
      socialLinks: [...prev.socialLinks, { platform: '', url: '' }]
    }));
  };

  const removeSocialLink = (index: number) => {
    setStoreForm(prev => ({
      ...prev,
      socialLinks: prev.socialLinks.filter((_, i) => i !== index)
    }));
  };

  const updateSocialLink = (index: number, field: 'platform' | 'url', value: string) => {
    setStoreForm(prev => ({
      ...prev,
      socialLinks: prev.socialLinks.map((link, i) =>
        i === index ? { ...link, [field]: value } : link
      )
    }));
  };

  // const addFeature = () => {
  //   setStoreForm(prev => ({
  //     ...prev,
  //     features: [...prev.features, { title: '', description: '', icon: '' }]
  //   }));
  // };

  // const removeFeature = (index: number) => {
  //   setStoreForm(prev => ({
  //     ...prev,
  //     features: prev.features.filter((_, i) => i !== index)
  //   }));
  // };

  // const updateFeature = (index: number, field: 'title' | 'description' | 'icon', value: string) => {
  //   setStoreForm(prev => ({
  //     ...prev,
  //     features: prev.features.map((feature, i) =>
  //       i === index ? { ...feature, [field]: value } : feature
  //     )
  //   }));
  // };

  // const addAchievement = () => {
  //   setStoreForm(prev => ({
  //     ...prev,
  //     achievements: [...prev.achievements, { number: 0, name: '' }]
  //   }));
  // };

  // const removeAchievement = (index: number) => {
  //   setStoreForm(prev => ({
  //     ...prev,
  //     achievements: prev.achievements.filter((_, i) => i !== index)
  //   }));
  // };

  // const updateAchievement = (index: number, field: 'number' | 'name', value: string | number) => {
  //   setStoreForm(prev => ({
  //     ...prev,
  //     achievements: prev.achievements.map((achievement, i) =>
  //       i === index ? { ...achievement, [field]: value } : achievement
  //     )
  //   }));
  // };

  if (loading && !vendorStore) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500"></div>
      </div>
    );
  }

  if (!vendorStore && !isEditing) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4"><BuildingStorefrontIcon className="w-9 h-9" aria-hidden="true" /></div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">{t('vendor.createNewStoreTitle')}</h2>
        <p className="text-gray-600 mb-6">{t('vendor.createNewStoreDesc')}</p>
        <button
          onClick={() => setIsEditing(true)}
          className="bg-yellow-500 text-white px-6 py-3 rounded-md hover:bg-yellow-600"
        >
          {t('vendor.createStore')}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">{t('vendor.storeManagement')}</h1>
          <p className="text-sm sm:text-base text-gray-600">{t('vendor.customizeProfile')}</p>
        </div>
        {vendorStore && !isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="bg-yellow-500 text-white px-4 py-2 rounded-md hover:bg-yellow-600 self-start sm:self-auto"
          >
            {t('vendor.editStore')}
          </button>
        )}
      </div>

      {isEditing ? (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm">
            <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">{t('vendor.basicInformation')}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('vendor.storeName')} *
                </label>
                <input
                  type="text"
                  value={storeForm.name}
                  onChange={(e) => setStoreForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('vendor.storeEmail')}
                </label>
                <input
                  type="email"
                  value={storeForm.email}
                  onChange={(e) => setStoreForm(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('vendor.storePhone')}
                </label>
                <input
                  type="tel"
                  value={storeForm.phone}
                  onChange={(e) => setStoreForm(prev => ({ ...prev, phone: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('vendor.location')}
                </label>
                <input
                  type="text"
                  value={storeForm.location}
                  onChange={(e) => setStoreForm(prev => ({ ...prev, location: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
                />
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('vendor.description')}
              </label>
              <textarea
                value={storeForm.description}
                onChange={(e) => setStoreForm(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
              />
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('vendor.address')}
              </label>
              <textarea
                value={storeForm.address}
                onChange={(e) => setStoreForm(prev => ({ ...prev, address: e.target.value }))}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
              />
            </div>
          </div>

          {/* About & Story */}
          <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm">
            <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">{t('vendor.aboutYourStore')}</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('vendor.about')}
                </label>
                <textarea
                  value={storeForm.about}
                  onChange={(e) => setStoreForm(prev => ({ ...prev, about: e.target.value }))}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
                  placeholder={t('vendor.aboutPlaceholder')}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('vendor.yourStory')}
                </label>
                <textarea
                  value={storeForm.story}
                  onChange={(e) => setStoreForm(prev => ({ ...prev, story: e.target.value }))}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
                  placeholder={t('vendor.storyPlaceholder')}
                />
              </div>
            </div>
          </div>

          {/* Social Links */}
          <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm">
            <div className="flex justify-between items-center mb-3 sm:mb-4">
              <h2 className="text-base sm:text-lg font-semibold text-gray-900">{t('vendor.socialLinks')}</h2>
              <button
                type="button"
                onClick={addSocialLink}
                className="text-yellow-600 hover:text-yellow-700 text-sm font-medium"
              >
                + {t('vendor.addLink')}
              </button>
            </div>
            <div className="space-y-3">
              {storeForm.socialLinks.map((link, index) => (
                <div key={index} className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                  <select
                    value={link.platform}
                    onChange={(e) => updateSocialLink(index, 'platform', e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
                  >
                    <option value="">{t('vendor.selectPlatform')}</option>
                    <option value="facebook">Facebook</option>
                    <option value="instagram">Instagram</option>
                    <option value="twitter">Twitter</option>
                    <option value="linkedin">LinkedIn</option>
                    <option value="youtube">YouTube</option>
                  </select>
                  <input
                    type="url"
                    value={link.url}
                    onChange={(e) => updateSocialLink(index, 'url', e.target.value)}
                    placeholder="https://..."
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
                  />
                  <button
                    type="button"
                    onClick={() => removeSocialLink(index)}
                    className="text-red-600 hover:text-red-700 px-3 py-2"
                  >
                    <XMarkIcon className="w-6 h-6" aria-hidden="true" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => {
                setIsEditing(false);
                if (vendorStore) {
                  setStoreForm({
                    name: vendorStore.name || '',
                    email: vendorStore.email || '',
                    phone: vendorStore.phone || '',
                    description: vendorStore.description || '',
                    address: vendorStore.address || '',
                    location: vendorStore.location || '',
                    about: vendorStore.about || '',
                    story: vendorStore.story || '',
                    socialLinks: vendorStore.socialLinks || [],
                    features: vendorStore.features || [],
                    achievements: vendorStore.achievements || [],
                  });
                }
              }}
              className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
            >
              {t('vendor.cancel')}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 disabled:opacity-50"
            >
              {loading ? t('vendor.saving') : (vendorStore ? t('vendor.updateStore') : t('vendor.createStore'))}
            </button>
          </div>
        </form>
      ) : (
        vendorStore && (
          <div className="space-y-6">
            {/* Store Overview */}
            <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 sm:mb-6">
                <div className="flex items-center min-w-0">
                  <div className="w-12 sm:w-16 h-12 sm:h-16 bg-yellow-500 rounded-full flex items-center justify-center mr-3 sm:mr-4 flex-shrink-0">
                    <span className="text-white text-lg sm:text-2xl font-bold">
                      {vendorStore.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-900 truncate">{vendorStore.name}</h2>
                    <p className="text-sm sm:text-base text-gray-600 truncate">{vendorStore.location}</p>
                  </div>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm font-medium self-start sm:self-auto flex-shrink-0 ${vendorStore.isActive
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                  }`}>
                  {vendorStore.isActive ? t('vendor.active') : t('vendor.inactive')}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">{t('vendor.contactInformation')}</h3>
                  <div className="space-y-1 text-sm text-gray-600">
                    <p><strong>{t('vendor.email')}:</strong> {vendorStore.email || t('vendor.notSet')}</p>
                    <p><strong>{t('vendor.phone')}:</strong> {vendorStore.phone || t('vendor.notSet')}</p>
                    <p><strong>{t('vendor.address')}:</strong> {vendorStore.address || t('vendor.notSet')}</p>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">{t('vendor.storeMetrics')}</h3>
                  <div className="space-y-1 text-sm text-gray-600">
                    <p><strong>{t('vendor.subscribers')}:</strong> {vendorStore.subscribers?.length || 0}</p>
                    <p><strong>{t('vendor.socialLinks')}:</strong> {vendorStore.socialLinks?.length || 0}</p>
                    <p><strong>{t('vendor.created')}:</strong> {new Date(vendorStore.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>

              {vendorStore.description && (
                <div className="mt-6">
                  <h3 className="font-semibold text-gray-900 mb-2">{t('vendor.description')}</h3>
                  <p className="text-gray-700">{vendorStore.description}</p>
                </div>
              )}
            </div>

            {/* About & Story */}
            {(vendorStore.about || vendorStore.story) && (
              <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm">
                <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">{t('vendor.aboutYourStore')}</h2>
                {vendorStore.about && (
                  <div className="mb-4">
                    <h3 className="font-medium text-gray-900 mb-2">{t('vendor.about')}</h3>
                    <p className="text-gray-700">{vendorStore.about}</p>
                  </div>
                )}
                {vendorStore.story && (
                  <div>
                    <h3 className="font-medium text-gray-900 mb-2">{t('vendor.ourStory')}</h3>
                    <p className="text-gray-700">{vendorStore.story}</p>
                  </div>
                )}
              </div>
            )}

            {/* Social Links */}
            {vendorStore.socialLinks && vendorStore.socialLinks.length > 0 && (
              <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm">
                <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">{t('vendor.socialLinks')}</h2>
                <div className="flex flex-wrap gap-3">
                  {vendorStore.socialLinks.map((link, index) => (
                    <a
                      key={index}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center px-3 py-2 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                    >
                      <span className="capitalize font-medium">{link.platform}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        )
      )}
    </div>
  );
};

export default VendorStoreManagement;
