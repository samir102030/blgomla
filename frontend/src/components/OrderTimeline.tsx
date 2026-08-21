import React from "react";
import type { ComponentType, SVGProps } from "react";
import { BanknotesIcon, CheckCircleIcon, ClipboardDocumentListIcon, ClockIcon, Cog6ToothIcon, CreditCardIcon, CubeIcon, SparklesIcon, TruckIcon, XCircleIcon } from "@heroicons/react/24/outline";
import { useTranslation } from "react-i18next";

interface TimelineEvent {
  status: string;
  note?: string;
  createdAt: string;
  updatedBy?: { name?: string };
}

interface OrderTimelineProps {
  events: TimelineEvent[];
  currentStatus: string;
}

const statusConfig: Record<string, { icon: ComponentType<SVGProps<SVGSVGElement>>; color: string; bgColor: string }> = {
  pending: { icon: ClockIcon, color: "text-amber-600", bgColor: "bg-amber-100 dark:bg-amber-900/30" },
  paid: { icon: CreditCardIcon, color: "text-blue-600", bgColor: "bg-blue-100 dark:bg-blue-900/30" },
  confirmed: { icon: CheckCircleIcon, color: "text-emerald-600", bgColor: "bg-emerald-100 dark:bg-emerald-900/30" },
  processing: { icon: Cog6ToothIcon, color: "text-indigo-600", bgColor: "bg-indigo-100 dark:bg-indigo-900/30" },
  shipped: { icon: TruckIcon, color: "text-purple-600", bgColor: "bg-purple-100 dark:bg-purple-900/30" },
  out_for_delivery: { icon: CubeIcon, color: "text-orange-600", bgColor: "bg-orange-100 dark:bg-orange-900/30" },
  delivered: { icon: SparklesIcon, color: "text-emerald-600", bgColor: "bg-emerald-100 dark:bg-emerald-900/30" },
  cancelled: { icon: XCircleIcon, color: "text-red-600", bgColor: "bg-red-100 dark:bg-red-900/30" },
  refunded: { icon: BanknotesIcon, color: "text-gray-600", bgColor: "bg-gray-100 dark:bg-gray-900/30" },
};

const OrderTimeline: React.FC<OrderTimelineProps> = ({ events, currentStatus: _currentStatus }) => {
  const { t } = useTranslation();

  if (!events || events.length === 0) {
    return (
      <div className="text-center py-6 text-[var(--text-muted)]">
        <p className="text-lg mb-1"><ClipboardDocumentListIcon className="w-5 h-5" aria-hidden="true" /></p>
        <p className="text-sm">{t("No tracking updates yet")}</p>
      </div>
    );
  }

  // Sort events newest-first for display
  const sortedEvents = [...events].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return (
    <div className="relative space-y-0">
      {sortedEvents.map((event, index) => {
        const config = statusConfig[event.status] || statusConfig.pending;
        const isLast = index === sortedEvents.length - 1;
        const isFirst = index === 0;
        const date = new Date(event.createdAt);

        return (
          <div key={index} className="relative flex gap-4 pb-6 last:pb-0">
            {/* Connector line */}
            {!isLast && (
              <div className="absolute left-[18px] top-10 w-0.5 h-[calc(100%-2rem)] bg-[var(--border)]" />
            )}

            {/* Status icon bubble */}
            <div
              className={`relative z-10 flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-sm ${config.bgColor} ${
                isFirst ? "ring-2 ring-offset-2 ring-offset-[var(--surface)] ring-[var(--brand-nav)]" : ""
              }`}
            >
              <config.icon className="w-5 h-5" aria-hidden="true" />
            </div>

            {/* Content */}
            <div className={`flex-grow min-w-0 ${isFirst ? "animate-fadeIn" : ""}`}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className={`font-semibold capitalize ${isFirst ? "text-[var(--text)]" : "text-[var(--text-muted)]"}`}>
                    {t(event.status.replace(/_/g, " "))}
                  </p>
                  {event.note && (
                    <p className="text-sm text-[var(--text-subtle)] mt-0.5">{event.note}</p>
                  )}
                </div>
                <time className="text-xs text-[var(--text-subtle)] whitespace-nowrap flex-shrink-0">
                  {date.toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "short",
                    year: date.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined,
                  })}
                  <span className="ml-1">
                    {date.toLocaleTimeString("en-GB", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </time>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default OrderTimeline;
