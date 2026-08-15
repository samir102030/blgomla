import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import { useCollectionStore } from "../stores/collection.store";
import { useUserStore } from "../stores/user.store";
import { cldImg } from "../lib/cldImage";

/**
 * The confirmation step between "add this bundle" and it actually going in.
 *
 * Lives here rather than on a page because a bundle can be added from three
 * places — the bundle's own page, the bundles listing, and the home page —
 * and the fitting question has to be asked in all of them. Three copies of
 * this markup would have drifted the first time one of them changed.
 *
 * Renders nothing when closed, so callers can mount it unconditionally.
 */
export interface AddBundleDialogProps {
  /** The bundle to add. Must carry `items` (with products) and `installation`. */
  collection: any | null;
  open: boolean;
  onClose: () => void;
  /** Called after the bundle is in the cart. Use it to navigate, if you want to. */
  onAdded?: () => void;
}

const AddBundleDialog: React.FC<AddBundleDialogProps> = ({
  collection,
  open,
  onClose,
  onAdded,
}) => {
  const { t } = useTranslation();
  const addCollectionToCart = useCollectionStore((s) => s.addCollectionToCart);
  const fetchCart = useUserStore((s) => s.fetchCart);

  const [wantsInstallation, setWantsInstallation] = useState(false);
  const [adding, setAdding] = useState(false);

  // Always reopen on "no". Carrying an answer over from the last bundle
  // someone looked at would book a fitter nobody asked for.
  useEffect(() => {
    if (open) setWantsInstallation(false);
  }, [open, collection?._id]);

  if (!open || !collection) return null;

  const items: any[] = collection.items || [];
  const installOffered = !!collection.installation?.offered;
  const installPrice = Number(collection.installation?.price) || 0;
  const installCharge = wantsInstallation && installOffered ? installPrice : 0;
  const payable = (Number(collection.bundlePrice) || 0) + installCharge;

  const confirm = async () => {
    setAdding(true);
    const okAdd = await addCollectionToCart(collection._id, 1, wantsInstallation);
    setAdding(false);
    if (okAdd) {
      await fetchCart();
      toast.success(t("collections.addedToCart"));
      onClose();
      onAdded?.();
    } else {
      toast.error(
        useCollectionStore.getState().error || t("collections.failedToAdd")
      );
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={() => !adding && onClose()}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="bg-[var(--surface)] rounded-2xl shadow-2xl w-full max-w-md border border-[var(--border)] overflow-hidden max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b border-[var(--border)] flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-base font-bold text-[var(--text)]">
              {t("Confirm your bundle")}
            </h2>
            <p className="text-xs text-[var(--text-muted)] mt-0.5 truncate">
              {collection.name}
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={adding}
            className="p-1.5 hover:bg-[var(--bg)] rounded-full transition-colors text-[var(--text-muted)] shrink-0 disabled:opacity-40"
            aria-label={t("Close")}
          >
            ✕
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto">
          {/* what's in it */}
          {items.length > 0 && (
            <div className="rounded-xl border border-[var(--border)] divide-y divide-[var(--border)]">
              {items.slice(0, 4).map((item, i) => (
                <div key={i} className="flex items-center gap-2.5 p-2.5">
                  <img
                    src={cldImg(item.product?.images?.[0]?.url, { w: 80 })}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    className="w-9 h-9 rounded-lg object-cover bg-[var(--bg)] shrink-0"
                  />
                  <span className="text-xs text-[var(--text)] flex-1 min-w-0 truncate">
                    {item.product?.name}
                  </span>
                  <span className="text-xs text-[var(--text-muted)] shrink-0">
                    ×{item.quantity}
                  </span>
                </div>
              ))}
              {items.length > 4 && (
                <p className="p-2.5 text-[11px] text-[var(--text-muted)] text-center">
                  + {items.length - 4} {t("more items")}
                </p>
              )}
            </div>
          )}

          {/* the fitting question */}
          {installOffered && (
            <div>
              <p className="text-sm font-semibold text-[var(--text)] mb-2">
                🔧 {t("Do you want us to install it for you?")}
              </p>
              {collection.installation?.note && (
                <p className="text-xs text-[var(--text-muted)] mb-2">
                  {collection.installation.note}
                </p>
              )}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setWantsInstallation(true)}
                  className={`rounded-xl border p-3 text-start transition-all ${
                    wantsInstallation
                      ? "border-[var(--brand-primary)] bg-[var(--brand-primary)]/5"
                      : "border-[var(--border)] hover:border-[var(--brand-primary)]/40"
                  }`}
                >
                  <span className="block text-sm font-semibold text-[var(--text)]">
                    {t("Yes, install it")}
                  </span>
                  <span className="block text-[11px] text-[var(--text-muted)] mt-0.5">
                    {installPrice > 0
                      ? `+EGP ${installPrice.toLocaleString()}`
                      : t("No extra cost")}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setWantsInstallation(false)}
                  className={`rounded-xl border p-3 text-start transition-all ${
                    !wantsInstallation
                      ? "border-[var(--brand-primary)] bg-[var(--brand-primary)]/5"
                      : "border-[var(--border)] hover:border-[var(--brand-primary)]/40"
                  }`}
                >
                  <span className="block text-sm font-semibold text-[var(--text)]">
                    {t("No, thanks")}
                  </span>
                  <span className="block text-[11px] text-[var(--text-muted)] mt-0.5">
                    {t("I'll install it myself")}
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* what it comes to */}
          <div className="rounded-xl bg-[var(--bg)] border border-[var(--border)] p-3.5 space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-[var(--text-muted)]">{t("Bundle")}</span>
              <span className="text-[var(--text)] font-medium">
                EGP {(Number(collection.bundlePrice) || 0).toLocaleString()}
              </span>
            </div>
            {installCharge > 0 && (
              <div className="flex justify-between text-xs">
                <span className="text-[var(--text-muted)]">{t("Installation")}</span>
                <span className="text-[var(--text)] font-medium">
                  +EGP {installCharge.toLocaleString()}
                </span>
              </div>
            )}
            <div className="flex justify-between items-baseline border-t border-[var(--border)] pt-1.5 mt-1.5">
              <span className="text-sm font-semibold text-[var(--text)]">
                {t("Total")}
              </span>
              <span className="text-lg font-black text-[var(--text)]">
                EGP {payable.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        <div className="p-5 pt-0 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={adding}
            className="flex-1 px-4 py-2.5 border border-[var(--border)] rounded-xl text-sm font-medium text-[var(--text-muted)] hover:bg-[var(--bg)] transition-colors disabled:opacity-40"
          >
            {t("Cancel")}
          </button>
          <button
            type="button"
            onClick={confirm}
            disabled={adding}
            className="flex-1 px-4 py-2.5 bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-accent)] text-white rounded-xl text-sm font-semibold hover:shadow-lg hover:shadow-[var(--brand-primary)]/25 transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {adding ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                {t("Adding...")}
              </>
            ) : (
              <>🛒 {t("Add to cart")}</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddBundleDialog;
