import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  ExclamationTriangleIcon,
  ArrowPathIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline";
import { useUserStore } from "../../stores/user.store";

const StoreInvalidPage: React.FC = () => {
  const [checking, setChecking] = useState(false);
  const [checked, setChecked] = useState(false);
  const getProfile = useUserStore((s) => s.getProfile);

  const handleCheckStatus = async () => {
    setChecking(true);
    setChecked(false);
    try {
      await getProfile();
      setChecked(true);
      // The AdminLayout will automatically re-render and check the new status
    } catch (error) {
      console.error("Error checking status:", error);
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <div className="text-center">
            <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-yellow-400" />
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              Store Not Approved
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              Your store account is not approved yet. Please contact the
              administrator for approval.
            </p>
            {checked && (
              <p className="mt-2 text-center text-sm text-green-600">
                Status checked. If approved, you'll be redirected automatically.
              </p>
            )}
            <div className="mt-6 space-y-3">
              <button
                onClick={handleCheckStatus}
                disabled={checking}
                className="w-full flex justify-center items-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {checking ? (
                  <>
                    <ArrowPathIcon className="animate-spin h-4 w-4 mr-2" />
                    Checking...
                  </>
                ) : checked ? (
                  <>
                    <CheckCircleIcon className="h-4 w-4 mr-2" />
                    Checked
                  </>
                ) : (
                  "Check Status"
                )}
              </button>
              <Link
                to="/account"
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-yellow-600 hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
              >
                Go to Account
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StoreInvalidPage;
