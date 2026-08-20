import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { CheckIcon, EyeIcon, EyeSlashIcon, FunnelIcon, MagnifyingGlassIcon, StarIcon, TrashIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { StarIcon as StarIconSolid } from "@heroicons/react/24/solid";
import { useReviewStore } from "../../stores/review.store";
import { useUserStore } from "../../stores/user.store";
import toast from "react-hot-toast";

const CustomerReviewsPage: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useUserStore();
  const isAdminLike =
    user?.role === "admin" || user?.role === "super_admin";
  const {
    reviews,
    stats,
    loading,
    error,
    total,
    page,
    limit,
    pages,
    reviewRequests,
    fetchReviews,
    fetchReviewStats,
    toggleReviewVisibility,
    deleteReview,
    requestHideReview,
    requestDeleteReview,
    requestUnhideReview,
    fetchReviewRequests,
    fetchVendorReviewRequests,
    approveReviewRequest,
    rejectReviewRequest,
    clearError,
  } = useReviewStore();

  const [searchTerm, setSearchTerm] = useState("");
  const [visibilityFilter, setVisibilityFilter] = useState<
    "all" | "visible" | "hidden"
  >("all");
  const [ratingFilter, setRatingFilter] = useState<number | "all">("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [storeFilter, setStoreFilter] = useState("");
  const [productFilter, setProductFilter] = useState("");
  const [userEmailFilter, setUserEmailFilter] = useState("");
  const [activeTab, setActiveTab] = useState<"reviews" | "requests">("reviews");
  const [requestsPage, setRequestsPage] = useState(1);
  const [requestStatus, setRequestStatus] = useState<
    "pending" | "approved" | "rejected"
  >("pending");
  const [pendingRequests, setPendingRequests] = useState<string[]>([]);

  useEffect(() => {
    fetchReviewStats();
  }, [fetchReviewStats]);

  useEffect(() => {
    if (isAdminLike && activeTab === "requests") {
      fetchReviewRequests(requestsPage, requestStatus);
    } else if (user?.role === "store" && activeTab === "requests") {
      fetchVendorReviewRequests(requestsPage, requestStatus);
    }
  }, [
    requestsPage,
    requestStatus,
    activeTab,
    user?.role,
    fetchReviewRequests,
    fetchVendorReviewRequests,
  ]);

  useEffect(() => {
    const filters = {
      page: currentPage,
      limit: 20,
      ...(searchTerm && { search: searchTerm }),
      ...(visibilityFilter !== "all" && {
        isVisible: visibilityFilter === "visible",
      }),
      ...(ratingFilter !== "all" && { rating: ratingFilter }),
      ...(dateFrom && { dateFrom }),
      ...(dateTo && { dateTo }),
      ...(storeFilter && { storeId: storeFilter }),
      ...(productFilter && { productId: productFilter }),
      ...(userEmailFilter && { userEmail: userEmailFilter }),
    };
    fetchReviews(filters);
  }, [
    fetchReviews,
    currentPage,
    searchTerm,
    visibilityFilter,
    ratingFilter,
    dateFrom,
    dateTo,
    storeFilter,
    productFilter,
    userEmailFilter,
  ]);

  const handleToggleVisibility = async (
    productId: string,
    reviewId: string
  ) => {
    const success = await toggleReviewVisibility(productId, reviewId);
    if (success) {
      toast.success(t("reviews.visibilityUpdated"));
      fetchReviewStats(); // Refresh stats
    } else {
      toast.error(t("reviews.visibilityUpdateFailed"));
    }
  };

  const handleDeleteReview = async (productId: string, reviewId: string) => {
    if (
      window.confirm(t("reviews.confirmDelete"))
    ) {
      const success = await deleteReview(productId, reviewId);
      if (success) {
        toast.success(t("reviews.deleteSuccess"));
        fetchReviewStats(); // Refresh stats
      } else {
        toast.error(t("reviews.deleteFailed"));
      }
    }
  };

  const handleRequestHideReview = async (
    productId: string,
    reviewId: string
  ) => {
    const success = await requestHideReview(productId, reviewId);
    if (success) {
      toast.success(t("reviews.hideRequestSubmitted"));
      setPendingRequests([...pendingRequests, `${productId}-${reviewId}-hide`]);
    } else {
      toast.error(t("reviews.requestFailed"));
    }
  };

  const handleRequestDeleteReview = async (
    productId: string,
    reviewId: string
  ) => {
    const success = await requestDeleteReview(productId, reviewId);
    if (success) {
      toast.success(t("reviews.deleteRequestSubmitted"));
      setPendingRequests([
        ...pendingRequests,
        `${productId}-${reviewId}-delete`,
      ]);
    } else {
      toast.error(t("reviews.requestFailed"));
    }
  };

  const handleRequestUnhideReview = async (
    productId: string,
    reviewId: string
  ) => {
    const success = await requestUnhideReview(productId, reviewId);
    if (success) {
      toast.success(t("reviews.unhideRequestSubmitted"));
      setPendingRequests([
        ...pendingRequests,
        `${productId}-${reviewId}-unhide`,
      ]);
    } else {
      toast.error(t("reviews.requestFailed"));
    }
  };

  const handleApproveRequest = async (productId: string, requestId: string) => {
    const success = await approveReviewRequest(productId, requestId);
    if (success) {
      toast.success(t("reviews.requestApproved"));
    } else {
      toast.error(t("reviews.approveFailed"));
    }
  };

  const handleRejectRequest = async (
    productId: string,
    requestId: string,
    reason?: string
  ) => {
    const finalReason = reason || prompt(t("reviews.enterRejectionReason"));
    if (finalReason !== null) {
      const success = await rejectReviewRequest(
        productId,
        requestId,
        finalReason
      );
      if (success) {
        toast.success(t("reviews.requestRejected"));
      } else {
        toast.error(t("reviews.rejectFailed"));
      }
    }
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center">
        {[1, 2, 3, 4, 5].map((star) => (
          <span key={star}>
            {star <= rating ? (
              <StarIconSolid className="h-4 w-4 text-yellow-400" />
            ) : (
              <StarIcon className="h-4 w-4 text-gray-300" />
            )}
          </span>
        ))}
        <span className="ml-2 text-sm text-gray-600">({rating})</span>
      </div>
    );
  };

  const handleClearAllFilters = () => {
    setSearchTerm("");
    setVisibilityFilter("all");
    setRatingFilter("all");
    setDateFrom("");
    setDateTo("");
    setStoreFilter("");
    setProductFilter("");
    setUserEmailFilter("");
    setCurrentPage(1);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading && reviews.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tabs for Admin */}
      {isAdminLike && (
        <div className="flex gap-4 border-b overflow-x-auto">
          <button
            onClick={() => setActiveTab("reviews")}
            className={`px-4 py-2 font-medium flex-shrink-0 ${
              activeTab === "reviews"
                ? "text-[var(--brand-primary)] border-b-2 border-[var(--brand-accent)]"
                : "text-gray-600 hover:text-gray-800"
            }`}
          >
            {t("reviews.allReviews")}
          </button>
          <button
            onClick={() => setActiveTab("requests")}
            className={`px-4 py-2 font-medium flex-shrink-0 ${
              activeTab === "requests"
                ? "text-[var(--brand-primary)] border-b-2 border-[var(--brand-accent)]"
                : "text-gray-600 hover:text-gray-800"
            }`}
          >
            {t("reviews.reviewRequests")}
          </button>
        </div>
      )}

      {/* Tabs for Vendor */}
      {user?.role === "store" && (
        <div className="flex gap-4 border-b overflow-x-auto">
          <button
            onClick={() => setActiveTab("reviews")}
            className={`px-4 py-2 font-medium flex-shrink-0 ${
              activeTab === "reviews"
                ? "text-[var(--brand-primary)] border-b-2 border-[var(--brand-accent)]"
                : "text-gray-600 hover:text-gray-800"
            }`}
          >
            {t("reviews.myReviews")}
          </button>
          <button
            onClick={() => setActiveTab("requests")}
            className={`px-4 py-2 font-medium flex-shrink-0 ${
              activeTab === "requests"
                ? "text-[var(--brand-primary)] border-b-2 border-[var(--brand-accent)]"
                : "text-gray-600 hover:text-gray-800"
            }`}
          >
            {t("reviews.myRequests")}
          </button>
        </div>
      )}

      {activeTab === "reviews" && (
        <>
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-[#333333]">
                {t("reviews.title")}
              </h1>
              <p className="text-[#9E9E9E]">
                {t("reviews.subtitle")}
                {user?.role === "store" && ` ${t("reviews.forYourProducts")}`}
              </p>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>{error}</div>
                <button
                  onClick={clearError}
                  className="px-3 py-1 bg-red-100 text-red-700 rounded text-sm hover:bg-red-200"
                >
                  {t("reviews.dismiss")}
                </button>
              </div>
            </div>
          )}

          {/* Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">{t("reviews.totalReviews")}</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats?.totalReviews || 0}
                  </p>
                </div>
                <div className="bg-[var(--brand-primary)]/10 p-3 rounded-full">
 <span className="text-2xl"></span>
                </div>
              </div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">{t("reviews.visibleReviews")}</p>
                  <p className="text-2xl font-bold text-green-600">
                    {stats?.visibleReviews || 0}
                  </p>
                </div>
                <div className="bg-green-100 p-3 rounded-full">
                  <EyeIcon className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">{t("reviews.hiddenReviews")}</p>
                  <p className="text-2xl font-bold text-red-600">
                    {stats?.hiddenReviews || 0}
                  </p>
                </div>
                <div className="bg-red-100 p-3 rounded-full">
                  <EyeSlashIcon className="h-6 w-6 text-red-600" />
                </div>
              </div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">{t("reviews.averageRating")}</p>
                  <p className="text-2xl font-bold text-yellow-600">
                    {stats?.averageRating
                      ? stats.averageRating.toFixed(1)
                      : "0.0"}
                  </p>
                </div>
                <div className="bg-yellow-100 p-3 rounded-full">
                  <StarIconSolid className="h-6 w-6 text-yellow-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Filters and Search */}
          <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder={t("reviews.searchPlaceholder")}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--brand-primary)] focus:border-transparent"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex flex-wrap gap-2 sm:gap-4">
                <select
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--brand-primary)] focus:border-transparent"
                  value={visibilityFilter}
                  onChange={(e) =>
                    setVisibilityFilter(
                      e.target.value as "all" | "visible" | "hidden"
                    )
                  }
                >
                  <option value="all">{t("reviews.allReviews")}</option>
                  <option value="visible">{t("reviews.visibleOnly")}</option>
                  <option value="hidden">{t("reviews.hiddenOnly")}</option>
                </select>
                <select
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--brand-primary)] focus:border-transparent"
                  value={ratingFilter}
                  onChange={(e) =>
                    setRatingFilter(
                      e.target.value === "all" ? "all" : Number(e.target.value)
                    )
                  }
                >
                  <option value="all">{t("reviews.allRatings")}</option>
                  <option value="5">{t("reviews.fiveStars")}</option>
                  <option value="4">{t("reviews.fourStars")}</option>
                  <option value="3">{t("reviews.threeStars")}</option>
                  <option value="2">{t("reviews.twoStars")}</option>
                  <option value="1">{t("reviews.oneStar")}</option>
                </select>
                <button
                  onClick={() => setShowMoreFilters(true)}
                  className={`flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50 ${
                    dateFrom ||
                    dateTo ||
                    storeFilter ||
                    productFilter ||
                    userEmailFilter
                      ? "border-[var(--brand-primary)] text-[var(--brand-primary)] bg-[var(--brand-primary)]/10"
                      : "border-gray-300 text-gray-700"
                  }`}
                >
                  <FunnelIcon className="h-4 w-4" />
                  {t("reviews.moreFilters")}
                  {(dateFrom ||
                    dateTo ||
                    storeFilter ||
                    productFilter ||
                    userEmailFilter) && (
                    <span className="bg-[var(--brand-accent)] text-white text-xs rounded-full px-2 py-0.5">
                      {
                        [
                          dateFrom,
                          dateTo,
                          storeFilter,
                          productFilter,
                          userEmailFilter,
                        ].filter(Boolean).length
                      }
                    </span>
                  )}
                </button>
                <button
                  onClick={handleClearAllFilters}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  {t("reviews.clearAll")}
                </button>
              </div>
            </div>
          </div>

          {/* More Filters Modal */}
          {showMoreFilters && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between p-6 border-b">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {t("reviews.moreFilters")}
                  </h3>
                  <button
                    onClick={() => setShowMoreFilters(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>
                <div className="p-6 space-y-4">
                  {/* Date Range */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t("reviews.fromDate")}
                      </label>
                      <input
                        type="date"
                        value={dateFrom}
                        onChange={(e) => setDateFrom(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[var(--brand-primary)] focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t("reviews.toDate")}
                      </label>
                      <input
                        type="date"
                        value={dateTo}
                        onChange={(e) => setDateTo(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[var(--brand-primary)] focus:border-transparent"
                      />
                    </div>
                  </div>

                  {/* Store Filter (Admin only) */}
                  {isAdminLike && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {t("reviews.storeId")}
                      </label>
                      <input
                        type="text"
                        placeholder={t("reviews.enterStoreId")}
                        value={storeFilter}
                        onChange={(e) => setStoreFilter(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[var(--brand-primary)] focus:border-transparent"
                      />
                    </div>
                  )}

                  {/* Product Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t("reviews.productId")}
                    </label>
                    <input
                      type="text"
                      placeholder={t("reviews.enterProductId")}
                      value={productFilter}
                      onChange={(e) => setProductFilter(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[var(--brand-primary)] focus:border-transparent"
                    />
                  </div>

                  {/* User Email Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t("reviews.customerEmail")}
                    </label>
                    <input
                      type="email"
                      placeholder={t("reviews.enterCustomerEmail")}
                      value={userEmailFilter}
                      onChange={(e) => setUserEmailFilter(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[var(--brand-primary)] focus:border-transparent"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-3 p-6 border-t bg-gray-50">
                  <button
                    onClick={() => {
                      setDateFrom("");
                      setDateTo("");
                      setStoreFilter("");
                      setProductFilter("");
                      setUserEmailFilter("");
                      setCurrentPage(1);
                    }}
                    className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    {t("reviews.clearAll")}
                  </button>
                  <button
                    onClick={() => setShowMoreFilters(false)}
                    className="px-4 py-2 bg-[var(--brand-accent)] text-white rounded-md hover:bg-[var(--brand-accent)]"
                  >
                    {t("reviews.applyFilters")}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Reviews Table */}
          <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t("reviews.colReviewDetails")}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t("reviews.colProduct")}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t("reviews.colCustomer")}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t("reviews.colRating")}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t("reviews.colStatus")}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t("reviews.colDate")}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t("reviews.colActions")}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {reviews.map((review) => (
                    <tr key={review.reviewId} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="max-w-xs">
                          <p className="text-sm text-gray-900 line-clamp-2">
                            {review.comment || t("reviews.noComment")}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {review.productName}
                          </div>
                          {isAdminLike && (
                            <div className="text-sm text-gray-500">
                              {review.storeName}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {review.userName}
                          </div>
                          <div className="text-sm text-gray-500">
                            {review.userEmail}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {renderStars(review.rating)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            review.isVisible
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {review.isVisible ? t("reviews.visible") : t("reviews.hidden")}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(review.createdAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          {isAdminLike && (
                            <>
                              <button
                                onClick={() =>
                                  handleToggleVisibility(
                                    review.productId,
                                    review.reviewId
                                  )
                                }
                                className={`${
                                  review.isVisible
                                    ? "text-red-600 hover:text-red-900"
                                    : "text-green-600 hover:text-green-900"
                                }`}
                                title={
                                  review.isVisible
                                    ? "Hide Review"
                                    : "Show Review"
                                }
                              >
                                {review.isVisible ? (
                                  <EyeSlashIcon className="h-4 w-4" />
                                ) : (
                                  <EyeIcon className="h-4 w-4" />
                                )}
                              </button>
                              <button
                                onClick={() =>
                                  handleDeleteReview(
                                    review.productId,
                                    review.reviewId
                                  )
                                }
                                className="text-red-600 hover:text-red-900"
                                title="Delete Review"
                              >
                                <TrashIcon className="h-4 w-4" />
                              </button>
                            </>
                          )}
                          {user?.role === "store" && (
                            <>
                              {review.isVisible ? (
                                <button
                                  onClick={() =>
                                    handleRequestHideReview(
                                      review.productId,
                                      review.reviewId
                                    )
                                  }
                                  disabled={pendingRequests.includes(
                                    `${review.productId}-${review.reviewId}-hide`
                                  )}
                                  className={`${
                                    pendingRequests.includes(
                                      `${review.productId}-${review.reviewId}-hide`
                                    )
                                      ? "text-gray-400 cursor-not-allowed"
                                      : "text-yellow-600 hover:text-yellow-900"
                                  }`}
                                  title={
                                    pendingRequests.includes(
                                      `${review.productId}-${review.reviewId}-hide`
                                    )
                                      ? "Request is pending"
                                      : "Request to Hide Review"
                                  }
                                >
                                  <EyeSlashIcon className="h-4 w-4" />
                                </button>
                              ) : (
                                <button
                                  onClick={() =>
                                    handleRequestUnhideReview(
                                      review.productId,
                                      review.reviewId
                                    )
                                  }
                                  disabled={pendingRequests.includes(
                                    `${review.productId}-${review.reviewId}-unhide`
                                  )}
                                  className={`${
                                    pendingRequests.includes(
                                      `${review.productId}-${review.reviewId}-unhide`
                                    )
                                      ? "text-gray-400 cursor-not-allowed"
                                      : "text-green-600 hover:text-green-900"
                                  }`}
                                  title={
                                    pendingRequests.includes(
                                      `${review.productId}-${review.reviewId}-unhide`
                                    )
                                      ? "Request is pending"
                                      : "Request to Unhide Review"
                                  }
                                >
                                  <EyeIcon className="h-4 w-4" />
                                </button>
                              )}
                              <button
                                onClick={() =>
                                  handleRequestDeleteReview(
                                    review.productId,
                                    review.reviewId
                                  )
                                }
                                disabled={pendingRequests.includes(
                                  `${review.productId}-${review.reviewId}-delete`
                                )}
                                className={`${
                                  pendingRequests.includes(
                                    `${review.productId}-${review.reviewId}-delete`
                                  )
                                    ? "text-gray-400 cursor-not-allowed"
                                    : "text-orange-600 hover:text-orange-900"
                                }`}
                                title={
                                  pendingRequests.includes(
                                    `${review.productId}-${review.reviewId}-delete`
                                  )
                                    ? "Request is pending"
                                    : "Request to Delete Review"
                                }
                              >
                                <TrashIcon className="h-4 w-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {reviews.length === 0 && !loading && (
              <div className="text-center py-12">
 <div className="text-gray-400 text-6xl mb-4"></div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {t("reviews.noReviewsFound")}
                </h3>
                <p className="text-gray-500">
                  {searchTerm ||
                  visibilityFilter !== "all" ||
                  ratingFilter !== "all" ||
                  dateFrom ||
                  dateTo ||
                  storeFilter ||
                  productFilter ||
                  userEmailFilter
                    ? t("reviews.tryAdjustFilters")
                    : t("reviews.noReviewsYet")}
                </p>
              </div>
            )}
          </div>

          {/* Pagination */}
          {pages > 1 && (
            <div className="bg-white px-4 sm:px-6 py-3 rounded-lg shadow-sm border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="text-sm text-gray-700">
                {t("reviews.showing")}{" "}
                <span className="font-medium">{(page - 1) * limit + 1}</span> {t("reviews.to")}{" "}
                <span className="font-medium">
                  {Math.min(page * limit, total)}
                </span>{" "}
                {t("reviews.of")} <span className="font-medium">{total}</span> {t("reviews.results")}
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {t("reviews.previous")}
                </button>
                {Array.from({ length: Math.min(5, pages) }, (_, i) => {
                  const pageNum =
                    Math.max(1, Math.min(pages - 4, currentPage - 2)) + i;
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`px-3 py-1 rounded text-sm ${
                        pageNum === currentPage
                          ? "bg-[#FFD600] text-[#333333]"
                          : "border border-gray-300 hover:bg-gray-50"
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                <button
                  onClick={() =>
                    setCurrentPage(Math.min(pages, currentPage + 1))
                  }
                  disabled={currentPage === pages}
                  className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {t("reviews.next")}
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Review Requests Section */}
      {isAdminLike && activeTab === "requests" && (
        <>
          {/* Request Status Filter */}
          <div className="flex flex-wrap gap-2 sm:gap-4">
            <button
              onClick={() => {
                setRequestStatus("pending");
                setRequestsPage(1);
              }}
              className={`px-4 py-2 rounded-lg font-medium ${
                requestStatus === "pending"
                  ? "bg-yellow-100 text-yellow-800 border border-yellow-300"
                  : "bg-gray-100 text-gray-700 border border-gray-300"
              }`}
            >
              {t("reviews.pending")}
            </button>
            <button
              onClick={() => {
                setRequestStatus("approved");
                setRequestsPage(1);
              }}
              className={`px-4 py-2 rounded-lg font-medium ${
                requestStatus === "approved"
                  ? "bg-green-100 text-green-800 border border-green-300"
                  : "bg-gray-100 text-gray-700 border border-gray-300"
              }`}
            >
              {t("reviews.approved")}
            </button>
            <button
              onClick={() => {
                setRequestStatus("rejected");
                setRequestsPage(1);
              }}
              className={`px-4 py-2 rounded-lg font-medium ${
                requestStatus === "rejected"
                  ? "bg-red-100 text-red-800 border border-red-300"
                  : "bg-gray-100 text-gray-700 border border-gray-300"
              }`}
            >
              {t("reviews.rejected")}
            </button>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500"></div>
            </div>
          )}

          {/* Requests Table */}
          {!loading && (
            <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t("reviews.colRequestType")}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t("reviews.colVendor")}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t("reviews.colProductReview")}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t("reviews.colReviewer")}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t("reviews.colStatus")}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t("reviews.colDate")}
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t("reviews.colActions")}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {reviewRequests.map((request: any) => (
                      <tr key={request.requestId} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              request.requestType === "hide"
                                ? "bg-[var(--brand-primary)]/10 text-[var(--brand-accent)]"
                                : request.requestType === "unhide"
                                ? "bg-green-100 text-green-800"
                                : "bg-red-100 text-red-800"
                            }`}
                          >
                            {request.requestType === "hide"
                              ? t("reviews.hideReview")
                              : request.requestType === "unhide"
                              ? t("reviews.unhideReview")
                              : t("reviews.deleteReview")}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {request.vendorName}
                            </div>
                            <div className="text-sm text-gray-500">
                              {request.vendorEmail}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {request.productName}
                            </div>
                            <div className="text-xs text-gray-500 line-clamp-1">
                              {request.reviewComment || t("reviews.noComment")}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {request.reviewerName}
                            </div>
                            <div className="text-sm text-gray-500">
                              {request.reviewerEmail}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              request.status === "pending"
                                ? "bg-yellow-100 text-yellow-800"
                                : request.status === "approved"
                                ? "bg-green-100 text-green-800"
                                : "bg-red-100 text-red-800"
                            }`}
                          >
                            {request.status.charAt(0).toUpperCase() +
                              request.status.slice(1)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatDate(request.createdAt)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          {request.status === "pending" && (
                            <div className="flex space-x-2">
                              <button
                                onClick={() =>
                                  handleApproveRequest(
                                    request.productId,
                                    request.requestId
                                  )
                                }
                                className="text-green-600 hover:text-green-900"
                                title="Approve Request"
                              >
                                <CheckIcon className="w-6 h-6" aria-hidden="true" />
                              </button>
                              <button
                                onClick={() =>
                                  handleRejectRequest(
                                    request.productId,
                                    request.requestId
                                  )
                                }
                                className="text-red-600 hover:text-red-900"
                                title="Reject Request"
                              >
                                <XMarkIcon className="w-6 h-6" aria-hidden="true" />
                              </button>
                            </div>
                          )}
                          {request.status === "rejected" && (
                            <div className="text-xs text-gray-600">
                              {request.rejectionReason || t("reviews.noReasonProvided")}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Empty State */}
          {!loading && reviewRequests.length === 0 && (
            <div className="text-center py-8 text-gray-500 bg-white rounded-lg border">
              No {requestStatus} review requests
            </div>
          )}
        </>
      )}

      {/* Vendor Review Requests Section */}
      {user?.role === "store" && activeTab === "requests" && (
        <>
          {/* Request Status Filter */}
          <div className="flex flex-wrap gap-2 sm:gap-4">
            <button
              onClick={() => {
                setRequestStatus("pending");
                setRequestsPage(1);
              }}
              className={`px-4 py-2 rounded-lg font-medium ${
                requestStatus === "pending"
                  ? "bg-yellow-100 text-yellow-800 border border-yellow-300"
                  : "bg-gray-100 text-gray-700 border border-gray-300"
              }`}
            >
              {t("reviews.pending")}
            </button>
            <button
              onClick={() => {
                setRequestStatus("approved");
                setRequestsPage(1);
              }}
              className={`px-4 py-2 rounded-lg font-medium ${
                requestStatus === "approved"
                  ? "bg-green-100 text-green-800 border border-green-300"
                  : "bg-gray-100 text-gray-700 border border-gray-300"
              }`}
            >
              {t("reviews.approved")}
            </button>
            <button
              onClick={() => {
                setRequestStatus("rejected");
                setRequestsPage(1);
              }}
              className={`px-4 py-2 rounded-lg font-medium ${
                requestStatus === "rejected"
                  ? "bg-red-100 text-red-800 border border-red-300"
                  : "bg-gray-100 text-gray-700 border border-gray-300"
              }`}
            >
              {t("reviews.rejected")}
            </button>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500"></div>
            </div>
          )}

          {/* Requests Table */}
          {!loading && (
            <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Request Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Product & Review
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Reviewer
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Response
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {reviewRequests.map((request: any) => (
                      <tr key={request.requestId} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              request.requestType === "hide"
                                ? "bg-[var(--brand-primary)]/10 text-[var(--brand-accent)]"
                                : request.requestType === "unhide"
                                ? "bg-green-100 text-green-800"
                                : "bg-red-100 text-red-800"
                            }`}
                          >
                            {request.requestType === "hide"
                              ? t("reviews.hideReview")
                              : request.requestType === "unhide"
                              ? t("reviews.unhideReview")
                              : t("reviews.deleteReview")}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {request.productName}
                            </div>
                            <div className="text-xs text-gray-500 line-clamp-1">
                              {request.reviewComment || t("reviews.noComment")}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {request.reviewerName}
                            </div>
                            <div className="text-sm text-gray-500">
                              {request.reviewerEmail}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              request.status === "pending"
                                ? "bg-yellow-100 text-yellow-800"
                                : request.status === "approved"
                                ? "bg-green-100 text-green-800"
                                : "bg-red-100 text-red-800"
                            }`}
                          >
                            {request.status.charAt(0).toUpperCase() +
                              request.status.slice(1)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatDate(request.createdAt)}
                        </td>
                        <td className="px-6 py-4">
                          {request.status === "pending" && (
                            <span className="text-xs text-gray-500 italic">
                              Waiting for admin response
                            </span>
                          )}
                          {request.status === "approved" && (
                            <span className="text-xs text-green-600 font-medium">
 Approved
                            </span>
                          )}
                          {request.status === "rejected" && (
                            <div className="text-xs">
                              <span className="text-red-600 font-medium">
 Rejected
                              </span>
                              {request.rejectionReason && (
                                <div className="mt-1 text-gray-600 max-w-xs">
                                  Reason: {request.rejectionReason}
                                </div>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Empty State */}
          {!loading && reviewRequests.length === 0 && (
            <div className="text-center py-8 text-gray-500 bg-white rounded-lg border">
              No {requestStatus} requests
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default CustomerReviewsPage;
