export interface Notification {
  _id: string;
  recipient: string; // User ID
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'order' | 'product' | 'vendor' | 'system';
  category?: 'order' | 'product' | 'account' | 'promotion' | 'system' | 'vendor';
  isRead: boolean;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  actionUrl?: string;
  actionText?: string;
  data?: Record<string, any>; // Additional data for the notification
  expiresAt?: string;
  createdAt: string;
  readAt?: string;
}

export interface NotificationPreferences {
  _id: string;
  user: string;
  emailNotifications: {
    orders: boolean;
    promotions: boolean;
    productUpdates: boolean;
    accountActivity: boolean;
    vendorUpdates: boolean;
  };
  pushNotifications: {
    orders: boolean;
    promotions: boolean;
    productUpdates: boolean;
    accountActivity: boolean;
    vendorUpdates: boolean;
  };
  smsNotifications: {
    orders: boolean;
    accountActivity: boolean;
  };
  frequency: 'immediate' | 'daily' | 'weekly';
  quietHours: {
    enabled: boolean;
    startTime: string; // HH:mm format
    endTime: string; // HH:mm format
  };
  createdAt: string;
  updatedAt: string;
}

export interface NotificationStats {
  total: number;
  unread: number;
  byType: Record<string, number>;
  byCategory: Record<string, number>;
  recentActivity: Notification[];
}
