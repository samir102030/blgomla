import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { axiosInstance } from '../../lib/axios';
import { toast } from 'react-hot-toast';
import { useBrandStore } from '../../stores/brand.store';
import { useVendorStore } from '../../stores/vendor.store';
import { useUserStore } from '../../stores/user.store';
import { useCategoryStore } from '../../stores/category.store';

interface UploadResult {
  successful: Array<{ row: number; name: string; productId: string | null; willCreateCategory?: boolean }>;
  failed: Array<{ row: number; name: string; errors: string[] }>;
  totalRows: number;
}

interface PreviewRow {
  row: number;
  name: string;
  description?: string;
  price?: number;
  category?: string;
  brand?: string;
  salePercentage?: number;
  stock?: number;
  willCreateCategory?: boolean;
}

interface BulkProductUploadProps {
  onUploadComplete?: () => void;
}

const BulkProductUpload: React.FC<BulkProductUploadProps> = ({ onUploadComplete }) => {
  const { t } = useTranslation();
  const { brands, fetchBrands } = useBrandStore();
  const { vendorStore, fetchVendorStore, fetchVendors } = useVendorStore();
  const user = useUserStore((s) => s.user);
  const { categories, fetchCategories } = useCategoryStore();
  const [uploading, setUploading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [isPreview, setIsPreview] = useState(false);
  const [previewRows, setPreviewRows] = useState<PreviewRow[]>([]);
  const [templateType, setTemplateType] = useState<'full' | 'simple'>('full');
  const [selectedBrand, setSelectedBrand] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [newCategoryName, setNewCategoryName] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchBrands();
    fetchVendorStore();
    if (user?.role === 'admin') {
      fetchVendors();
      fetchCategories();
    }
    if (user?.role === 'store') {
      fetchCategories(); // to keep categories available if needed
    }
  }, [fetchBrands, fetchVendorStore, fetchVendors, fetchCategories, user?.role]);

  const availableCategories =
    user?.role === 'admin'
      ? (categories || []).map((c) => c.name)
      : vendorStore?.productCategories || [];

  const handleDownloadTemplate = async () => {
    try {
      setDownloadingTemplate(true);
      console.log('Starting template download...');

      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const url = `${apiUrl}/bulk-products/template?templateType=${templateType}`;
      console.log('Fetching from:', url);

      // Use fetch instead of axios to avoid interceptor issues with blob
      const response = await fetch(url, {
        method: 'GET',
        credentials: 'include', // Important for cookies
        headers: {
          'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        },
      });

      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);
      console.log('Response content-type:', response.headers.get('content-type'));

      if (!response.ok) {
        // Try to get error message
        const contentType = response.headers.get('content-type');
        let errorMessage = 'Failed to download template';

        if (contentType && contentType.includes('application/json')) {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
          console.error('Error response:', errorData);
        } else {
          const errorText = await response.text();
          console.error('Error response text:', errorText);
          errorMessage = errorText || errorMessage;
        }

        // Show specific error for authentication issues
        if (response.status === 401) {
          errorMessage = 'Please login as a vendor to download the template';
        } else if (response.status === 403) {
          errorMessage = 'Access denied. Please make sure you are logged in as an approved vendor';
        }

        throw new Error(errorMessage);
      }

      // Get the blob from response
      const blob = await response.blob();
      console.log('Blob received, size:', blob.size, 'type:', blob.type);

      if (blob.size === 0) {
        throw new Error('Received empty file from server');
      }

      // Create download link
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = 'product-upload-template.xlsx';
      document.body.appendChild(link);
      console.log('Triggering download...');
      link.click();

      // Clean up after a short delay
      setTimeout(() => {
        document.body.removeChild(link);
        window.URL.revokeObjectURL(downloadUrl);
        console.log('Download cleanup complete');
      }, 100);

      toast.success(t('vendor.bulk.templateDownloaded'));
    } catch (error: any) {
      console.error('Error downloading template:', error);
      toast.error(error.message || t('vendor.bulk.templateDownloadError'));
    } finally {
      setDownloadingTemplate(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      const validTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel',
      ];
      
      if (!validTypes.includes(file.type)) {
        toast.error(t('vendor.bulk.invalidFileType'));
        return;
      }

      // Validate file size (10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast.error(t('vendor.bulk.fileTooLarge'));
        return;
      }

      setSelectedFile(file);
      setUploadResult(null);
      setShowResults(false);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error(t('vendor.bulk.noFileSelected'));
      return;
    }

    try {
      setUploading(true);
      setIsPreview(false);
      setPreviewRows([]);

      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('templateType', templateType);
      formData.append('dryRun', 'true');

      if (templateType === 'simple') {
        const chosenCategory = (newCategoryName || selectedCategory).trim();
        if (!chosenCategory) {
          toast.error('Please choose a category for all products.');
          return;
        }
        if (!selectedBrand) {
          toast.error('Please choose a brand for all products.');
          return;
        }
        formData.append('categoryName', chosenCategory);
        formData.append('brandName', selectedBrand);
      } else {
        const chosenCategory = (newCategoryName || selectedCategory).trim();
        if (chosenCategory) formData.append('categoryName', chosenCategory);
        if (selectedBrand) formData.append('brandName', selectedBrand);
      }

      const response = await axiosInstance.post('/bulk-products/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setIsPreview(true);
      const preview = response.data.preview || [];
      setPreviewRows(
        preview.length
          ? preview
          : (response.data.results?.successful || []).map((item: any) => ({
              row: item.row,
              name: item.name,
              price: undefined,
              category: undefined,
              brand: undefined,
              willCreateCategory: item.willCreateCategory,
            }))
      );
      setUploadResult(response.data.results);
      setShowResults(true);

      toast.success('Preview generated. Review and confirm to upload.');
    } catch (error: any) {
      console.error('Error uploading file:', error);
      toast.error(error.response?.data?.message || t('vendor.bulk.uploadError'));
    } finally {
      setUploading(false);
    }
  };

  const handleConfirmUpload = async () => {
    if (!selectedFile) {
      toast.error(t('vendor.bulk.noFileSelected'));
      return;
    }
    try {
      setConfirming(true);
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('templateType', templateType);

      if (templateType === 'simple') {
        const chosenCategory = (newCategoryName || selectedCategory).trim();
        if (!chosenCategory) {
          toast.error('Please choose a category for all products.');
          return;
        }
        if (!selectedBrand) {
          toast.error('Please choose a brand for all products.');
          return;
        }
        formData.append('categoryName', chosenCategory);
        formData.append('brandName', selectedBrand);
      } else {
        const chosenCategory = (newCategoryName || selectedCategory).trim();
        if (chosenCategory) formData.append('categoryName', chosenCategory);
        if (selectedBrand) formData.append('brandName', selectedBrand);
      }

      const response = await axiosInstance.post('/bulk-products/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setUploadResult(response.data.results);
      setShowResults(true);
      setIsPreview(false);
      setPreviewRows([]);

      if (response.data.results.failed.length === 0) {
        toast.success(t('vendor.bulk.uploadSuccess', { count: response.data.results.successful.length }));
      } else {
        toast(
          t('vendor.bulk.uploadPartialSuccess', {
            success: response.data.results.successful.length,
            failed: response.data.results.failed.length,
          }),
          { icon: "⚠️" }
        );
      }

      if (response.data.results.successful.length > 0) {
        onUploadComplete?.();
      }

      // Clear file selection
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error: any) {
      console.error('Error confirming upload:', error);
      toast.error(error.response?.data?.message || t('vendor.bulk.uploadError'));
    } finally {
      setConfirming(false);
    }
  };

  const handleClearFile = () => {
    setSelectedFile(null);
    setUploadResult(null);
    setShowResults(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-lg shadow-md p-6 border border-gray-200 dark:border-slate-800">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          {t('vendor.bulk.title')}
        </h2>
        <p className="text-gray-600 dark:text-gray-300">
          {t('vendor.bulk.description')}
        </p>
      </div>

      {/* Template selector */}
      <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => setTemplateType('full')}
          className={`p-4 rounded-lg border text-left transition-colors ${
            templateType === 'full'
              ? 'border-blue-500 bg-blue-50 dark:border-blue-400 dark:bg-blue-500/10'
              : 'border-gray-200 bg-white dark:bg-slate-800 dark:border-slate-700 hover:border-blue-200 dark:hover:border-blue-400'
          }`}
        >
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Full template</p>
          <p className="text-xs text-gray-600 dark:text-gray-300">
            All fields (stock, brand, category, images, variants, etc).
          </p>
        </button>
        <button
          type="button"
          onClick={() => setTemplateType('simple')}
          className={`p-4 rounded-lg border text-left transition-colors ${
            templateType === 'simple'
              ? 'border-blue-500 bg-blue-50 dark:border-blue-400 dark:bg-blue-500/10'
              : 'border-gray-200 bg-white dark:bg-slate-800 dark:border-slate-700 hover:border-blue-200 dark:hover:border-blue-400'
          }`}
        >
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            Simple template (Name, Description, Price)
          </p>
          <p className="text-xs text-gray-600 dark:text-gray-300">
            Uploads will use one brand and one category for all rows.
          </p>
        </button>
      </div>

      {templateType === 'simple' && (
        <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
              Category for all products
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
            >
              <option value="">Select category</option>
              {availableCategories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
            {!availableCategories.length && (
              <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                No categories found for this store/vendor.
              </p>
            )}
            {user?.role === 'admin' && (
              <div className="mt-3">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                  Or create a new category
                </label>
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="Enter new category name"
                  className="w-full border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                />
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
              Brand for all products
            </label>
            <select
              value={selectedBrand}
              onChange={(e) => setSelectedBrand(e.target.value)}
              className="w-full border border-gray-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
            >
              <option value="">Select brand</option>
              {brands.map((brand) => (
                <option key={brand._id} value={brand.name}>
                  {brand.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Step 1: Download Template */}
      <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-500/10 rounded-lg border border-blue-200 dark:border-blue-500/30">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-500 text-white font-bold">
              1
            </span>
          </div>
          <div className="ml-4 flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {t('vendor.bulk.step1Title')}
            </h3>
            <p className="text-gray-600 mb-3">
              {t('vendor.bulk.step1Description')}
            </p>
            <button
              onClick={handleDownloadTemplate}
              disabled={downloadingTemplate}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-300 transition-colors"
            >
              {downloadingTemplate ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {t('vendor.bulk.downloading')}
                </>
              ) : (
                <>
                  📥 {t('vendor.bulk.downloadTemplate')}
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Step 2: Upload File */}
      <div className="mb-6 p-4 bg-green-50 dark:bg-emerald-500/10 rounded-lg border border-green-200 dark:border-emerald-500/30">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-green-500 text-white font-bold">
              2
            </span>
          </div>
          <div className="ml-4 flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {t('vendor.bulk.step2Title')}
            </h3>
            <p className="text-gray-600 mb-3">
              {t('vendor.bulk.step2Description')}
            </p>

            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileSelect}
                className="block w-full text-sm text-gray-500 dark:text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-green-600 file:text-white hover:file:bg-green-700 cursor-pointer dark:file:bg-emerald-600 dark:hover:file:bg-emerald-500"
              />
              </div>

              {selectedFile && (
                <div className="flex items-center justify-between p-3 bg-white dark:bg-slate-800 rounded-md border border-gray-300 dark:border-slate-700">
                  <div className="flex items-center space-x-2">
                    <span className="text-2xl">📄</span>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{selectedFile.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {(selectedFile.size / 1024).toFixed(2)} KB
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleClearFile}
                    className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
                  >
                    ✕
                  </button>
                </div>
              )}

              <div className="flex flex-col gap-3">
                <button
                  onClick={handleUpload}
                  disabled={!selectedFile || uploading || confirming}
                  className="w-full px-4 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-semibold"
                >
                  {uploading ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Validate & Preview
                    </span>
                  ) : (
                    <>🔍 Validate & Preview</>
                  )}
                </button>
                {isPreview && (
                  <button
                    onClick={handleConfirmUpload}
                    disabled={confirming}
                    className="w-full px-4 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-semibold"
                  >
                    {confirming ? 'Uploading…' : 'Confirm Upload'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Upload Results */}
      {showResults && uploadResult && (
        <div className="mt-6 p-4 bg-gray-50 dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {isPreview ? 'Preview (not saved yet)' : t('vendor.bulk.results')}
            </h3>
            {isPreview && (
              <span className="text-xs px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-200">
                Review then press Confirm Upload
              </span>
            )}
          </div>

          {/* Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-gray-200 dark:border-slate-700">
              <p className="text-sm text-gray-600 dark:text-gray-300">{t('vendor.bulk.totalRows')}</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{uploadResult.totalRows}</p>
            </div>
            <div className="bg-green-50 dark:bg-emerald-500/10 p-4 rounded-lg border border-green-200 dark:border-emerald-500/30">
              <p className="text-sm text-green-600 dark:text-emerald-300">{t('vendor.bulk.successful')}</p>
              <p className="text-2xl font-bold text-green-700 dark:text-emerald-200">{uploadResult.successful.length}</p>
            </div>
            <div className="bg-red-50 dark:bg-red-500/10 p-4 rounded-lg border border-red-200 dark:border-red-500/30">
              <p className="text-sm text-red-600 dark:text-red-300">{t('vendor.bulk.failed')}</p>
              <p className="text-2xl font-bold text-red-700 dark:text-red-200">{uploadResult.failed.length}</p>
            </div>
          </div>

          {/* Preview table */}
          {isPreview && previewRows.length > 0 && (
            <div className="mb-4">
              <h4 className="text-md font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Preview Rows
              </h4>
              <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 max-h-72 overflow-y-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
                  <thead className="bg-gray-50 dark:bg-slate-900 sticky top-0">
                    <tr>
                      {['Row','Name','Price','Category','Brand','Will Create Category?'].map((h) => (
                        <th key={h} className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-700">
                    {previewRows.map((row) => (
                      <tr key={row.row}>
                        <td className="px-4 py-2 text-sm text-gray-900 dark:text-gray-100">{row.row}</td>
                        <td className="px-4 py-2 text-sm text-gray-900 dark:text-gray-100">{row.name}</td>
                        <td className="px-4 py-2 text-sm text-gray-900 dark:text-gray-100">{row.price ?? '-'}</td>
                        <td className="px-4 py-2 text-sm text-gray-900 dark:text-gray-100">{row.category || '-'}</td>
                        <td className="px-4 py-2 text-sm text-gray-900 dark:text-gray-100">{row.brand || '-'}</td>
                        <td className="px-4 py-2 text-sm text-gray-900 dark:text-gray-100">
                          {row.willCreateCategory ? 'Yes' : 'No'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Successful Products */}
          {!isPreview && uploadResult.successful.length > 0 && (
            <div className="mb-4">
              <h4 className="text-md font-semibold text-green-700 dark:text-emerald-200 mb-2">
                ✅ {t('vendor.bulk.successfulProducts')}
              </h4>
              <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 max-h-60 overflow-y-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
                  <thead className="bg-gray-50 dark:bg-slate-900 sticky top-0">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                        {t('vendor.bulk.row')}
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                        {t('vendor.bulk.productName')}
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                        {t('vendor.bulk.productId')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-700">
                    {uploadResult.successful.map((item, idx) => (
                      <tr key={`${item.productId ?? idx}-${item.row}`}>
                        <td className="px-4 py-2 text-sm text-gray-900 dark:text-gray-100">{item.row}</td>
                        <td className="px-4 py-2 text-sm text-gray-900 dark:text-gray-100">{item.name}</td>
                        <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-300 font-mono text-xs">
                          {item.productId || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Failed Products */}
          {uploadResult.failed.length > 0 && (
            <div>
              <h4 className="text-md font-semibold text-red-700 dark:text-red-200 mb-2">
                ❌ {t('vendor.bulk.failedProducts')}
              </h4>
              <div className="bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 max-h-60 overflow-y-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-slate-700">
                  <thead className="bg-gray-50 dark:bg-slate-900 sticky top-0">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                        {t('vendor.bulk.row')}
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                        {t('vendor.bulk.productName')}
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                        {t('vendor.bulk.errors')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-slate-800 divide-y divide-gray-200 dark:divide-slate-700">
                    {uploadResult.failed.map((item, index) => (
                      <tr key={index}>
                        <td className="px-4 py-2 text-sm text-gray-900 dark:text-gray-100">{item.row}</td>
                        <td className="px-4 py-2 text-sm text-gray-900 dark:text-gray-100">{item.name || '-'}</td>
                        <td className="px-4 py-2 text-sm text-red-600 dark:text-red-300">
                          <ul className="list-disc list-inside">
                            {item.errors.map((error, i) => (
                              <li key={i}>{error}</li>
                            ))}
                          </ul>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default BulkProductUpload;

