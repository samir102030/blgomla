import React, { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { axiosInstance } from '../../lib/axios';
import { toast } from 'react-hot-toast';

interface UploadResult {
  successful: Array<{ row: number; name: string; productId: string }>;
  failed: Array<{ row: number; name: string; errors: string[] }>;
  totalRows: number;
}

const BulkProductUpload: React.FC = () => {
  const { t } = useTranslation();
  const [uploading, setUploading] = useState(false);
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [showResults, setShowResults] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDownloadTemplate = async () => {
    try {
      setDownloadingTemplate(true);
      console.log('Starting template download...');

      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const url = `${apiUrl}/bulk-products/template`;
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
      const formData = new FormData();
      formData.append('file', selectedFile);

      const response = await axiosInstance.post('/bulk-products/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setUploadResult(response.data.results);
      setShowResults(true);

      if (response.data.results.failed.length === 0) {
        toast.success(t('vendor.bulk.uploadSuccess', { count: response.data.results.successful.length }));
      } else {
        toast.warning(
          t('vendor.bulk.uploadPartialSuccess', {
            success: response.data.results.successful.length,
            failed: response.data.results.failed.length,
          })
        );
      }

      // Clear file selection
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error: any) {
      console.error('Error uploading file:', error);
      toast.error(error.response?.data?.message || t('vendor.bulk.uploadError'));
    } finally {
      setUploading(false);
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
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {t('vendor.bulk.title')}
        </h2>
        <p className="text-gray-600">
          {t('vendor.bulk.description')}
        </p>
      </div>

      {/* Step 1: Download Template */}
      <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
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
      <div className="mb-6 p-4 bg-green-50 rounded-lg border border-green-200">
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
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-green-600 file:text-white hover:file:bg-green-700 cursor-pointer"
                />
              </div>

              {selectedFile && (
                <div className="flex items-center justify-between p-3 bg-white rounded-md border border-gray-300">
                  <div className="flex items-center space-x-2">
                    <span className="text-2xl">📄</span>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{selectedFile.name}</p>
                      <p className="text-xs text-gray-500">
                        {(selectedFile.size / 1024).toFixed(2)} KB
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleClearFile}
                    className="text-red-600 hover:text-red-800"
                  >
                    ✕
                  </button>
                </div>
              )}

              <button
                onClick={handleUpload}
                disabled={!selectedFile || uploading}
                className="w-full px-4 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-semibold"
              >
                {uploading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    {t('vendor.bulk.uploading')}
                  </span>
                ) : (
                  <>📤 {t('vendor.bulk.uploadFile')}</>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Upload Results */}
      {showResults && uploadResult && (
        <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            {t('vendor.bulk.results')}
          </h3>

          {/* Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="bg-white p-4 rounded-lg border border-gray-200">
              <p className="text-sm text-gray-600">{t('vendor.bulk.totalRows')}</p>
              <p className="text-2xl font-bold text-gray-900">{uploadResult.totalRows}</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <p className="text-sm text-green-600">{t('vendor.bulk.successful')}</p>
              <p className="text-2xl font-bold text-green-700">{uploadResult.successful.length}</p>
            </div>
            <div className="bg-red-50 p-4 rounded-lg border border-red-200">
              <p className="text-sm text-red-600">{t('vendor.bulk.failed')}</p>
              <p className="text-2xl font-bold text-red-700">{uploadResult.failed.length}</p>
            </div>
          </div>

          {/* Successful Products */}
          {uploadResult.successful.length > 0 && (
            <div className="mb-4">
              <h4 className="text-md font-semibold text-green-700 mb-2">
                ✅ {t('vendor.bulk.successfulProducts')}
              </h4>
              <div className="bg-white rounded-lg border border-gray-200 max-h-60 overflow-y-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        {t('vendor.bulk.row')}
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        {t('vendor.bulk.productName')}
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        {t('vendor.bulk.productId')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {uploadResult.successful.map((item) => (
                      <tr key={item.productId}>
                        <td className="px-4 py-2 text-sm text-gray-900">{item.row}</td>
                        <td className="px-4 py-2 text-sm text-gray-900">{item.name}</td>
                        <td className="px-4 py-2 text-sm text-gray-500 font-mono text-xs">
                          {item.productId}
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
              <h4 className="text-md font-semibold text-red-700 mb-2">
                ❌ {t('vendor.bulk.failedProducts')}
              </h4>
              <div className="bg-white rounded-lg border border-gray-200 max-h-60 overflow-y-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        {t('vendor.bulk.row')}
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        {t('vendor.bulk.productName')}
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        {t('vendor.bulk.errors')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {uploadResult.failed.map((item, index) => (
                      <tr key={index}>
                        <td className="px-4 py-2 text-sm text-gray-900">{item.row}</td>
                        <td className="px-4 py-2 text-sm text-gray-900">{item.name || '-'}</td>
                        <td className="px-4 py-2 text-sm text-red-600">
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

