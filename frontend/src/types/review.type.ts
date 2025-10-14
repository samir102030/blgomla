export interface Review {
  reviewId: string;
  productId: string;
  productName: string;
  storeId: string;
  storeName: string;
  userId: string;
  userName: string;
  userEmail: string;
  rating: number;
  comment: string;
  isVisible: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ReviewStats {
  totalReviews: number;
  visibleReviews: number;
  hiddenReviews: number;
  averageRating: number;
}

export interface ReviewFilters {
  page?: number;
  limit?: number;
  storeId?: string;
  productId?: string;
  isVisible?: boolean;
  rating?: number;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  userEmail?: string;
}
