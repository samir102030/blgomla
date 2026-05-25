import React from "react";
import { useTranslation } from "react-i18next";
import {
  TruckIcon,
  CheckBadgeIcon,
  ArrowUturnLeftIcon,
  ChatBubbleLeftRightIcon,
} from "@heroicons/react/24/outline";
import { cldImg } from "../lib/cldImage";

interface Service {
  id: number;
  Icon: React.ComponentType<{ className?: string }>;
  // Optional badge image (Cloudinary). When set, renders instead of the icon.
  image?: string;
  title: string;
  description: string;
}

const Services: React.FC = () => {
  const { t } = useTranslation();

  const services: Service[] = [
    {
      id: 1,
      Icon: TruckIcon,
      image:
        "https://res.cloudinary.com/dcj3j5xn1/image/upload/v1779670480/belgomla/trust/free-delivery-badge.png",
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
    <section className="py-12 sm:py-16 border-t border-[var(--border)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 stagger-children">
          {services.map((service) => (
            <div
              key={service.id}
              className="group text-center p-5 sm:p-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] hover:border-[var(--brand-primary)]/30 hover:shadow-md transition-all duration-300"
            >
              {service.image ? (
                <img
                  src={cldImg(service.image, { w: 200 })}
                  alt={service.title}
                  loading="lazy"
                  decoding="async"
                  className="w-16 h-16 sm:w-20 sm:h-20 object-contain mx-auto mb-3 sm:mb-4 group-hover:scale-110 transition-transform duration-300"
                />
              ) : (
                <div className="inline-flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-[var(--brand-primary)]/8 mb-3 sm:mb-4 group-hover:bg-[var(--brand-primary)]/15 group-hover:scale-110 transition-all duration-300">
                  <service.Icon className="w-6 h-6 sm:w-7 sm:h-7 text-[var(--brand-primary)]" />
                </div>
              )}
              <h3 className="text-sm sm:text-base font-semibold text-[var(--text)] mb-1.5">
                {service.title}
              </h3>
              <p className="text-xs sm:text-sm text-[var(--text-muted)] leading-relaxed">
                {service.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Services;
