import React from 'react';

interface Service {
  id: number;
  icon: string;
  title: string;
  description: string;
}

const services: Service[] = [
  {
    id: 1,
    icon: "✈️",
    title: "Free home delivery",
    description: "Provide free home delivery for the all product over $100"
  },
  {
    id: 2,
    icon: "🏆",
    title: "Quality Products",
    description: "We ensure the product quality that is our main goal"
  },
  {
    id: 3,
    icon: "↩️",
    title: "3 Days Return",
    description: "Our Return Policy is very simple and easy for all"
  },
  {
    id: 4,
    icon: "🎧",
    title: "Online Support",
    description: "Provide 24/7 online support for any information"
  }
];

const Services: React.FC = () => {
  return (
    <section className="py-16 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {services.map((service) => (
            <div 
              key={service.id} 
              className="text-center group hover:bg-white hover:shadow-lg rounded-lg p-6 transition-all duration-300"
            >
              {/* Icon */}
              <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4 group-hover:bg-blue-200 transition-colors duration-300">
                <span className="text-2xl">{service.icon}</span>
              </div>

              {/* Title */}
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                {service.title}
              </h3>

              {/* Description */}
              <p className="text-sm text-gray-600 leading-relaxed">
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
