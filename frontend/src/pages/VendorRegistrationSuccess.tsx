import React from 'react';
import { Link } from 'react-router-dom';
import Header from "../components/Header";
import Footer from "../components/Footer";

const VendorRegistrationSuccess: React.FC = () => {
  return (
    <>
      <Header />
      <main className="min-h-screen bg-gray-50 dark:bg-[var(--bg)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <div className="mx-auto h-24 w-24 bg-green-100 dark:bg-emerald-500/15 rounded-full flex items-center justify-center">
              <svg className="h-12 w-12 text-green-600 dark:text-emerald-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
              Application Submitted!
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Thank you for your interest in becoming a vendor on Belgomla
            </p>
          </div>
          
          <div className="bg-white shadow rounded-lg p-6">
            <div className="space-y-4">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-100 dark:bg-blue-500/20 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 dark:text-blue-100 text-sm font-medium">1</span>
                  </div>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-gray-900">Application Review</h3>
                  <p className="text-sm text-gray-500">
                    Our team will review your application and documents within 2-3 business days.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-100 dark:bg-blue-500/20 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 dark:text-blue-100 text-sm font-medium">2</span>
                  </div>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-gray-900">Verification Process</h3>
                  <p className="text-sm text-gray-500">
                    We may contact you for additional information or document verification.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-100 dark:bg-blue-500/20 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 dark:text-blue-100 text-sm font-medium">3</span>
                  </div>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-gray-900">Account Activation</h3>
                  <p className="text-sm text-gray-500">
                    Once approved, you'll receive an email with your vendor account details.
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 dark:bg-amber-500/10 dark:border-amber-500/30">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400 dark:text-amber-200" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800 dark:text-amber-100">
                  Important Information
                </h3>
                <div className="mt-2 text-sm text-yellow-700 dark:text-amber-100/90">
                  <ul className="list-disc list-inside space-y-1">
                    <li>Keep your contact information updated</li>
                    <li>Check your email regularly for updates</li>
                    <li>Ensure all uploaded documents are clear and valid</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
          
          <div className="text-center space-y-4">
            <p className="text-sm text-gray-600">
              Have questions about your application?
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                to="/contact"
                className="inline-flex justify-center items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                Contact Support
              </Link>
              <Link
                to="/"
                className="inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-yellow-600 hover:bg-yellow-700"
              >
                Back to Home
              </Link>
            </div>
          </div>
          
          <div className="text-center">
            <p className="text-xs text-gray-500">
              Application Reference: VR-{Date.now().toString().slice(-6)}
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
};

export default VendorRegistrationSuccess;
