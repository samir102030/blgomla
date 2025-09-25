import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { useVendorStore } from '../../stores/vendor.store';
// import type { VendorStore } from '../../types/vendor.type';

const VendorStoreManagement: React.FC = () => {
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
        toast.success('Store updated successfully!');
      } else {
        await createStore(storeForm);
        toast.success('Store created successfully!');
      }
      setIsEditing(false);
    } catch (error) {
      toast.error('Failed to save store');
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500"></div>
      </div>
    );
  }

  if (!vendorStore && !isEditing) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">🏪</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Create a new store</h2>
        <p className="text-gray-600 mb-6">You don't have any store on this project. Create a new store from here</p>
        <button
          onClick={() => setIsEditing(true)}
          className="bg-yellow-500 text-white px-6 py-3 rounded-md hover:bg-yellow-600"
        >
          Create Store
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Store Management</h1>
          <p className="text-gray-600">Customize your store profile and settings</p>
        </div>
        {vendorStore && !isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="bg-yellow-500 text-white px-4 py-2 rounded-md hover:bg-yellow-600"
          >
            Edit Store
          </button>
        )}
      </div>

      {isEditing ? (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Store Name *
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
                  Email
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
                  Phone
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
                  Location
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
                Store Description
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
                Address
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
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">About Your Store</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  About
                </label>
                <textarea
                  value={storeForm.about}
                  onChange={(e) => setStoreForm(prev => ({ ...prev, about: e.target.value }))}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
                  placeholder="Tell customers about your store..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Your Story
                </label>
                <textarea
                  value={storeForm.story}
                  onChange={(e) => setStoreForm(prev => ({ ...prev, story: e.target.value }))}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
                  placeholder="Share your store's story..."
                />
              </div>
            </div>
          </div>

          {/* Social Links */}
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Social Links</h2>
              <button
                type="button"
                onClick={addSocialLink}
                className="text-yellow-600 hover:text-yellow-700 text-sm font-medium"
              >
                + Add Link
              </button>
            </div>
            <div className="space-y-3">
              {storeForm.socialLinks.map((link, index) => (
                <div key={index} className="flex gap-3">
                  <select
                    value={link.platform}
                    onChange={(e) => updateSocialLink(index, 'platform', e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
                  >
                    <option value="">Select Platform</option>
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
                    ✕
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
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 disabled:opacity-50"
            >
              {loading ? 'Saving...' : (vendorStore ? 'Update Store' : 'Create Store')}
            </button>
          </div>
        </form>
      ) : (
        vendorStore && (
          <div className="space-y-6">
            {/* Store Overview */}
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center">
                  <div className="w-16 h-16 bg-yellow-500 rounded-full flex items-center justify-center mr-4">
                    <span className="text-white text-2xl font-bold">
                      {vendorStore.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">{vendorStore.name}</h2>
                    <p className="text-gray-600">{vendorStore.location}</p>
                  </div>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  vendorStore.isActive 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {vendorStore.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Contact Information</h3>
                  <div className="space-y-1 text-sm text-gray-600">
                    <p><strong>Email:</strong> {vendorStore.email || 'Not set'}</p>
                    <p><strong>Phone:</strong> {vendorStore.phone || 'Not set'}</p>
                    <p><strong>Address:</strong> {vendorStore.address || 'Not set'}</p>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Store Metrics</h3>
                  <div className="space-y-1 text-sm text-gray-600">
                    <p><strong>Subscribers:</strong> {vendorStore.subscribers?.length || 0}</p>
                    <p><strong>Social Links:</strong> {vendorStore.socialLinks?.length || 0}</p>
                    <p><strong>Created:</strong> {new Date(vendorStore.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>

              {vendorStore.description && (
                <div className="mt-6">
                  <h3 className="font-semibold text-gray-900 mb-2">Description</h3>
                  <p className="text-gray-700">{vendorStore.description}</p>
                </div>
              )}
            </div>

            {/* About & Story */}
            {(vendorStore.about || vendorStore.story) && (
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">About Your Store</h2>
                {vendorStore.about && (
                  <div className="mb-4">
                    <h3 className="font-medium text-gray-900 mb-2">About</h3>
                    <p className="text-gray-700">{vendorStore.about}</p>
                  </div>
                )}
                {vendorStore.story && (
                  <div>
                    <h3 className="font-medium text-gray-900 mb-2">Our Story</h3>
                    <p className="text-gray-700">{vendorStore.story}</p>
                  </div>
                )}
              </div>
            )}

            {/* Social Links */}
            {vendorStore.socialLinks && vendorStore.socialLinks.length > 0 && (
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Social Links</h2>
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
