import type { ComponentType, SVGProps } from "react";
import {
  BellIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  GiftIcon,
  InformationCircleIcon,
  NoSymbolIcon,
  ShoppingCartIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import type { Notification } from "../types/notification.type";

type Icon = ComponentType<SVGProps<SVGSVGElement>>;

/**
 * The icon that stands for a notification's kind.
 *
 * These were emoji, which meant a warning looked like whatever the reader's
 * operating system thought a warning looked like. A component draws the same
 * shape everywhere and takes its colour from the row it sits in.
 */
const ICON_MAP: Record<Notification["type"], Icon> = {
  info: InformationCircleIcon,
  warning: ExclamationTriangleIcon,
  success: CheckCircleIcon,
  error: NoSymbolIcon,
  order: ShoppingCartIcon,
  promotion: GiftIcon,
  system: SparklesIcon,
};

export const getNotificationIcon = (type: Notification["type"]): Icon =>
  ICON_MAP[type] ?? BellIcon;
