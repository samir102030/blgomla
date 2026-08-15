import React from "react";
import { useTranslation } from "react-i18next";
import {
  TruckIcon,
  CheckBadgeIcon,
  ArrowUturnLeftIcon,
  ChatBubbleLeftRightIcon,
} from "@heroicons/react/24/outline";

interface Service {
  id: number;
  Icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}

const Services: React.FC = () => {
  const { t } = useTranslation();

  const services: Service[] = [
    {
      id: 1,
      Icon: TruckIcon,
      title: t("Free Delivery"),
      description: t("Free shipping on all orders over 5,000 EGP across Egypt"),
    },
    {
      id: 2,
      Icon: CheckBadgeIcon,
      title: t("Genuine Products"),
      description: t("100% authentic products with manufacturer warranty"),
    },
    {
      id: 3,
      Icon: ArrowUturnLeftIcon,
      title: t("Easy Returns"),
      description: t("Hassle-free 3-day return policy on all items"),
    },
    {
      id: 4,
      Icon: ChatBubbleLeftRightIcon,
      title: t("24/7 Support"),
      description: t("Expert technical support available around the clock"),
    },
  ];

  return (
    <section className="shell py-10 sm:py-12">
      {/* One bordered slab split into four cells instead of four floating
          cards — fewer competing outlines, and the guarantees read as a single
          statement the store makes. */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--border)] shadow-[var(--shadow-sm)] overflow-hidden">
        {/* gap-px lets the container's border-coloured background show through
            as hairline separators — correct at every breakpoint and in RTL,
            with none of the per-cell border bookkeeping. */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-px">
          {services.map((service) => (
            <div
              key={service.id}
              className="group relative flex items-start gap-4 bg-[var(--surface)] p-5 sm:p-6 transition-colors duration-300 hover:bg-[var(--surface-2)]"
            >
              <span className="icon-tile shrink-0 transition-transform duration-300 group-hover:scale-105">
                <service.Icon className="w-5 h-5 sm:w-6 sm:h-6" />
              </span>
              <div className="min-w-0">
                <h3 className="text-sm sm:text-[0.95rem] font-semibold text-[var(--text)]">
                  {service.title}
                </h3>
                <p className="mt-1 text-xs sm:text-[0.8125rem] text-[var(--text-muted)] leading-relaxed">
                  {service.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Services;
