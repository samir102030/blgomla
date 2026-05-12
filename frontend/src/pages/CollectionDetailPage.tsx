import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { axiosInstance } from "../lib/axios";
import { useCollectionStore } from "../stores/collection.store";
import { useUserStore } from "../stores/user.store";
import toast from "react-hot-toast";

const CollectionDetailPage: React.FC = () => {
  const { t } = useTranslation();
  const { collectionId } = useParams();
  const navigate = useNavigate();
  const [collection, setCollection] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addingToCart, setAddingToCart] = useState(false);
  const addCollectionToCart = useCollectionStore(
    (state) => state.addCollectionToCart,
  );
  const fetchCart = useUserStore((state) => state.fetchCart);

  // Quotation modal state
  const [showQuotationModal, setShowQuotationModal] = useState(false);
  const [quotationSubmitting, setQuotationSubmitting] = useState(false);
  const [quotationSuccess, setQuotationSuccess] = useState(false);
  const [quotationForm, setQuotationForm] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    quantity: 1,
    notes: "",
  });

  const handleQuotationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!collectionId) return;
    setQuotationSubmitting(true);
    try {
      await axiosInstance.post("/quotations", {
        collectionId,
        customer: {
          name: quotationForm.name,
          email: quotationForm.email,
          phone: quotationForm.phone,
          company: quotationForm.company,
        },
        collectionQuantity: quotationForm.quantity,
        customerNotes: quotationForm.notes,
      });
      setQuotationSuccess(true);
      toast.success(t("Quotation request submitted successfully!"));
    } catch (err: any) {
      toast.error(err?.response?.data?.message || t("Failed to submit quotation"));
    } finally {
      setQuotationSubmitting(false);
    }
  };

  useEffect(() => {
    const loadCollection = async () => {
      if (!collectionId) return;
      try {
        setLoading(true);
        const { data } = await axiosInstance.get(`/collections/${collectionId}`);
        setCollection(data.collection);
        setError(null);
      } catch (err: any) {
        setError(err?.response?.data?.message || "Failed to load collection");
      } finally {
        setLoading(false);
      }
    };
    loadCollection();
  }, [collectionId]);

  const getOriginalTotal = () => {
    if (!collection) return 0;
    return collection.items.reduce((sum: number, item: any) => {
      const product = item.product;
      const unitPrice = product.saleActive
        ? product.price * (1 - product.salePercentage / 100)
        : product.price;
      return sum + unitPrice * item.quantity;
    }, 0);
  };

  const handleAddToCart = async () => {
    if (!collectionId) return;
    setAddingToCart(true);
    const success = await addCollectionToCart(collectionId, 1);
    setAddingToCart(false);
    if (success) {
      await fetchCart();
      toast.success(t("collections.addedToCart"));
      navigate("/cart");
    } else {
      toast.error(t("collections.failedToAdd"));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--bg)]">
        <Header />
        <div className="max-w-5xl mx-auto px-4 py-16">
          <div className="animate-pulse space-y-6">
            <div className="h-8 w-64 bg-[var(--border)] rounded" />
            <div className="h-4 w-96 bg-[var(--border)] rounded" />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-20 bg-[var(--border)] rounded-xl" />
                ))}
              </div>
              <div className="h-64 bg-[var(--border)] rounded-2xl" />
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (error || !collection) {
    return (
      <div className="min-h-screen bg-[var(--bg)]">
        <Header />
        <div className="flex items-center justify-center py-24">
          <div className="text-center">
            <div className="text-5xl mb-4">🔍</div>
            <h2 className="text-xl font-bold text-[var(--text)] mb-2">
              {t("Bundle Not Found")}
            </h2>
            <p className="text-sm text-[var(--text-muted)] mb-6 max-w-md">
              {error || t("This collection may have been removed or is no longer available.")}
            </p>
            <Link
              to="/collections"
              className="inline-flex items-center gap-2 bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-accent)] text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:shadow-lg transition-all"
            >
              ← {t("Back to Bundles")}
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const originalTotal = getOriginalTotal();
  const savings = Math.max(originalTotal - collection.bundlePrice, 0);
  const savingsPercent = originalTotal > 0 ? Math.round((savings / originalTotal) * 100) : 0;

  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <Header />

      {/* ═══ Breadcrumb + Hero ═══ */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#0f0c29] via-[#302b63] to-[#24243e] py-12 sm:py-16">
        <div className="absolute top-10 right-20 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)", backgroundSize: "40px 40px" }} />

        <div className="relative max-w-5xl mx-auto px-4">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-xs text-white/40 mb-6">
            <Link to="/" className="hover:text-white/70 transition-colors">{t("Home")}</Link>
            <span>/</span>
            <Link to="/collections" className="hover:text-white/70 transition-colors">{t("Bundles")}</Link>
            <span>/</span>
            <span className="text-white/70">{collection.name}</span>
          </nav>

          <div className="flex items-start justify-between gap-6 flex-wrap">
            <div>
              <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-md border border-white/10 rounded-full px-3 py-1 text-xs text-amber-300 mb-3">
                📦 {t("Bundle Deal")}
              </div>
              <h1 className="text-2xl sm:text-4xl font-bold text-white mb-2">
                {collection.name}
              </h1>
              <p className="text-sm text-white/50 max-w-xl leading-relaxed">
                {collection.description || t("A curated bundle of premium products at an exclusive price.")}
              </p>
            </div>

            {savingsPercent > 0 && (
              <div className="flex flex-col items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-400 to-green-600 text-white shadow-lg shadow-emerald-500/25">
                <span className="text-xl font-black leading-none">{savingsPercent}%</span>
                <span className="text-[9px] font-bold uppercase tracking-wide opacity-80">SAVED</span>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ═══ Content ═══ */}
      <main className="max-w-5xl mx-auto px-4 py-10 sm:py-14">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          {/* Items List */}
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-sm font-bold text-[var(--text-muted)] uppercase tracking-wider mb-1">
              {t("What's Included")} ({collection.items.length} {t("items")})
            </h2>

            {collection.items.map((item: any, index: number) => (
              <div
                key={`${collection._id}-${index}`}
                className="group bg-[var(--surface)] rounded-xl border border-[var(--border)] p-4 flex items-center gap-4 hover:shadow-md hover:border-[var(--brand-primary)]/20 transition-all duration-200"
              >
                <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden bg-[var(--bg)] border border-[var(--border)] shrink-0">
                  <img
                    src={item.product?.images?.[0]?.url || "/placeholder.png"}
                    alt={item.product?.name || "Product"}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute top-1 right-1 bg-black/60 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md">
                    ×{item.quantity}
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <Link
                    to={`/product/${item.product?._id}`}
                    className="text-sm font-semibold text-[var(--text)] hover:text-[var(--brand-primary)] transition-colors line-clamp-1"
                  >
                    {item.product?.name || "Product"}
                  </Link>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5 line-clamp-1">
                    {item.product?.description || ""}
                  </p>
                  <div className="flex items-center gap-2 mt-1.5">
                    {item.product?.rating && (
                      <span className="flex items-center gap-0.5 text-[11px] text-amber-500">
                        ⭐ {item.product.rating}
                      </span>
                    )}
                    {item.product?.numReviews && (
                      <span className="text-[10px] text-[var(--text-muted)]">
                        ({item.product.numReviews} reviews)
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-[var(--text)]">
                    EGP {item.product?.price?.toLocaleString()}
                  </p>
                  {item.product?.saleActive && (
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                      {item.product.salePercentage}% off
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Pricing Sidebar */}
          <div className="space-y-5">
            <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] p-5 sm:p-6 sticky top-24">
              <h3 className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider mb-4">
                {t("Bundle Summary")}
              </h3>

              {/* Price breakdown */}
              <div className="space-y-2.5 mb-5">
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--text-muted)]">{t("Items Total")}</span>
                  <span className="text-[var(--text)] font-medium">EGP {originalTotal.toLocaleString()}</span>
                </div>
                {savings > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-emerald-600 dark:text-emerald-400">{t("Bundle Discount")}</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                      -EGP {savings.toLocaleString()}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--text-muted)]">{t("Shipping")}</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium">{t("FREE")}</span>
                </div>
              </div>

              <div className="border-t border-[var(--border)] pt-4 mb-5">
                <div className="flex justify-between items-baseline">
                  <span className="text-sm font-semibold text-[var(--text)]">{t("You Pay")}</span>
                  <div className="text-right">
                    <p className="text-2xl font-black text-[var(--text)]">
                      EGP {collection.bundlePrice.toLocaleString()}
                    </p>
                    {savings > 0 && (
                      <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                        💰 {t("Save")} EGP {savings.toLocaleString()} ({savingsPercent}%)
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <button
                onClick={handleAddToCart}
                disabled={addingToCart}
                className="w-full bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-accent)] text-white py-3.5 rounded-xl font-semibold text-sm hover:shadow-lg hover:shadow-[var(--brand-primary)]/25 transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 mb-3"
              >
                {addingToCart ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    {t("Adding...")}
                  </>
                ) : (
                  <>🛒 {t("Add Bundle to Cart")}</>
                )}
              </button>

              {/* Request Quotation Button */}
              <button
                onClick={() => { setShowQuotationModal(true); setQuotationSuccess(false); }}
                className="w-full border-2 border-[var(--brand-primary)] text-[var(--brand-primary)] py-3 rounded-xl font-semibold text-sm hover:bg-[var(--brand-primary)]/5 transition-all duration-300 flex items-center justify-center gap-2"
              >
                📋 {t("Request Quotation")}
              </button>

              <Link
                to="/collections"
                className="block text-center text-xs font-medium text-[var(--text-muted)] hover:text-[var(--brand-primary)] mt-3 transition-colors"
              >
                ← {t("View All Bundles")}
              </Link>
            </div>

            {/* Trust signals */}
            <div className="bg-[var(--surface)] rounded-2xl border border-[var(--border)] p-5 space-y-3">
              {[
                { icon: "✅", text: t("All items verified in stock") },
                { icon: "🛡️", text: t("Full warranty on every product") },
                { icon: "🚚", text: t("Free insured shipping") },
                { icon: "↩️", text: t("3-day hassle-free returns") },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-2.5 text-xs text-[var(--text-muted)]">
                  <span className="text-sm">{item.icon}</span>
                  {item.text}
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      {/* Quotation Modal */}
      {showQuotationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[var(--surface)] rounded-2xl shadow-2xl w-full max-w-lg border border-[var(--border)] overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-[var(--border)] bg-gradient-to-r from-[var(--brand-primary)]/5 to-[var(--brand-accent)]/5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-[var(--text)]">
                    📋 {t("Request Quotation")}
                  </h2>
                  <p className="text-xs text-[var(--text-muted)] mt-1">
                    {t("Get a custom price for")} "{collection.name}"
                  </p>
                </div>
                <button
                  onClick={() => setShowQuotationModal(false)}
                  className="p-2 hover:bg-[var(--bg)] rounded-full transition-colors text-[var(--text-muted)]"
                >
                  ✕
                </button>
              </div>
            </div>

            {quotationSuccess ? (
              <div className="p-8 text-center">
                <div className="text-5xl mb-4">✅</div>
                <h3 className="text-lg font-bold text-[var(--text)] mb-2">
                  {t("Quotation Submitted!")}
                </h3>
                <p className="text-sm text-[var(--text-muted)] mb-6">
                  {t("We'll review your request and get back to you within 24 hours.")}
                </p>
                <button
                  onClick={() => setShowQuotationModal(false)}
                  className="px-6 py-2.5 bg-[var(--brand-primary)] text-white rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity"
                >
                  {t("Close")}
                </button>
              </div>
            ) : (
              <form onSubmit={handleQuotationSubmit} className="p-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1.5">
                      {t("Full Name")} *
                    </label>
                    <input
                      required
                      value={quotationForm.name}
                      onChange={(e) => setQuotationForm({ ...quotationForm, name: e.target.value })}
                      className="w-full px-3 py-2.5 border border-[var(--border)] rounded-xl text-sm bg-[var(--bg)] text-[var(--text)] focus:ring-2 focus:ring-[var(--brand-primary)]/30 focus:border-[var(--brand-primary)] outline-none transition-all"
                      placeholder={t("Your name")}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1.5">
                      {t("Email")} *
                    </label>
                    <input
                      required
                      type="email"
                      value={quotationForm.email}
                      onChange={(e) => setQuotationForm({ ...quotationForm, email: e.target.value })}
                      className="w-full px-3 py-2.5 border border-[var(--border)] rounded-xl text-sm bg-[var(--bg)] text-[var(--text)] focus:ring-2 focus:ring-[var(--brand-primary)]/30 focus:border-[var(--brand-primary)] outline-none transition-all"
                      placeholder="email@example.com"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1.5">
                      {t("Phone")} *
                    </label>
                    <input
                      required
                      value={quotationForm.phone}
                      onChange={(e) => setQuotationForm({ ...quotationForm, phone: e.target.value })}
                      className="w-full px-3 py-2.5 border border-[var(--border)] rounded-xl text-sm bg-[var(--bg)] text-[var(--text)] focus:ring-2 focus:ring-[var(--brand-primary)]/30 focus:border-[var(--brand-primary)] outline-none transition-all"
                      placeholder="+20 1XX XXX XXXX"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1.5">
                      {t("Company")} ({t("optional")})
                    </label>
                    <input
                      value={quotationForm.company}
                      onChange={(e) => setQuotationForm({ ...quotationForm, company: e.target.value })}
                      className="w-full px-3 py-2.5 border border-[var(--border)] rounded-xl text-sm bg-[var(--bg)] text-[var(--text)] focus:ring-2 focus:ring-[var(--brand-primary)]/30 focus:border-[var(--brand-primary)] outline-none transition-all"
                      placeholder={t("Your company")}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1.5">
                    {t("Bundle Quantity")}
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={quotationForm.quantity}
                    onChange={(e) => setQuotationForm({ ...quotationForm, quantity: Number(e.target.value) || 1 })}
                    className="w-full px-3 py-2.5 border border-[var(--border)] rounded-xl text-sm bg-[var(--bg)] text-[var(--text)] focus:ring-2 focus:ring-[var(--brand-primary)]/30 focus:border-[var(--brand-primary)] outline-none transition-all"
                  />
                  {quotationForm.quantity > 1 && (
                    <p className="text-xs text-[var(--text-muted)] mt-1">
                      {t("Estimated total")}: EGP {(collection.bundlePrice * quotationForm.quantity).toLocaleString()}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1.5">
                    {t("Additional Notes")} ({t("optional")})
                  </label>
                  <textarea
                    value={quotationForm.notes}
                    onChange={(e) => setQuotationForm({ ...quotationForm, notes: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2.5 border border-[var(--border)] rounded-xl text-sm bg-[var(--bg)] text-[var(--text)] focus:ring-2 focus:ring-[var(--brand-primary)]/30 focus:border-[var(--brand-primary)] outline-none transition-all resize-none"
                    placeholder={t("Any special requirements or questions...")}
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowQuotationModal(false)}
                    className="flex-1 px-4 py-2.5 border border-[var(--border)] rounded-xl text-sm font-medium text-[var(--text-muted)] hover:bg-[var(--bg)] transition-colors"
                  >
                    {t("Cancel")}
                  </button>
                  <button
                    type="submit"
                    disabled={quotationSubmitting}
                    className="flex-1 px-4 py-2.5 bg-gradient-to-r from-[var(--brand-primary)] to-[var(--brand-accent)] text-white rounded-xl text-sm font-semibold hover:shadow-lg hover:shadow-[var(--brand-primary)]/25 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {quotationSubmitting ? t("Submitting...") : t("Submit Request")}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
};

export default CollectionDetailPage;
