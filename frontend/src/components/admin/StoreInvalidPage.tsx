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
    <div className="min-h-screen bg-[var(--bg)] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-[var(--surface)] border border-[var(--border)] py-8 px-4 shadow-lg rounded-xl sm:px-10">
          <div className="text-center">
            <div className="mx-auto h-14 w-14 rounded-full bg-[var(--brand-primary)]/15 flex items-center justify-center">
              <ExclamationTriangleIcon className="h-7 w-7 text-[var(--brand-primary)]" />
            </div>
            <h2 className="mt-5 text-2xl font-bold text-[var(--text)]">
              Store Not Approved
            </h2>
            <p className="mt-2 text-sm text-[var(--text-muted)]">
              Your store account is not approved yet. Please contact the
              administrator for approval.
            </p>
            {checked && (
              <p className="mt-2 text-sm text-emerald-500">
                Status checked. If approved, you'll be redirected automatically.
              </p>
            )}
            <div className="mt-6 space-y-3">
              <button
                onClick={handleCheckStatus}
                disabled={checking}
                className="w-full flex justify-center items-center py-2.5 px-4 border border-[var(--border)] rounded-lg text-sm font-medium text-[var(--text)] bg-[var(--surface)] hover:bg-[var(--surface-2)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
                className="w-full flex justify-center py-2.5 px-4 rounded-lg shadow-sm text-sm font-semibold text-white hover:opacity-95 transition"
                style={{ background: "var(--brand-gradient)" }}
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
