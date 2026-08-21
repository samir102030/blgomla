export interface Notification {
  _id: string;
  user: string; // User ID
  title: string;
  message: string;
  type:
    | "info"
    | "warning"
    | "success"
    | "error"
    | "order"
    | "promotion"
    | "system";
  /** Where it is about, as an app path. Absent when there is nowhere to go. */
  link?: string;
  read: boolean;
  deleted: boolean;
  createdAt: string;
  updatedAt: string;
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
  frequency: "immediate" | "daily" | "weekly";
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
