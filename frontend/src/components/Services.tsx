import React from "react";
import { useTranslation } from "react-i18next";

interface Service {
  id: number;
  icon: string;
  title: string;
  description: string;
}

const Services: React.FC = () => {
  const { t } = useTranslation();

  const services: Service[] = [
    {
      id: 1,
      icon: "✈️",
      title: t("Free home delivery"),
      description: t(
        "Provide free home delivery for the all product over $100"
      ),
    },
    {
      id: 2,
      icon: "🏆",
      title: t("Quality Products"),
      description: t("We ensure the product quality that is our main goal"),
    },
    {
      id: 3,
      icon: "↩️",
      title: t("3 Days Return"),
      description: t("Our Return Policy is very simple and easy for all"),
    },
    {
      id: 4,
      icon: "🎧",
      title: t("Online Support"),
      description: t("Provide 24/7 online support for any information"),
    },
  ];
  return (
    <section className="py-16 bg-[#FAFAFA]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {services.map((service) => (
            <div
              key={service.id}
              className="text-center group hover:bg-white hover:shadow-lg rounded-lg p-6 transition-all duration-300 border border-[#9E9E9E]/10"
            >
              {/* Icon */}
              <div className="inline-flex items-center justify-center w-16 h-16 bg-[#FFD600]/20 rounded-full mb-4 group-hover:bg-[#FFD600]/30 transition-colors duration-300">
                <span className="text-2xl">{service.icon}</span>
              </div>

              {/* Title */}
              <h3 className="text-lg font-semibold text-[#333333] mb-3">
                {service.title}
              </h3>

              {/* Description */}
              <p className="text-sm text-[#9E9E9E] leading-relaxed">
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
