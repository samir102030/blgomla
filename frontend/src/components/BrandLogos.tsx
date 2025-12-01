import React from "react";

const BrandLogos: React.FC = () => {
  const brands = [
    {
      name: "Infinix",
      logo: "https://logos-world.net/wp-content/uploads/2021/02/Infinix-Logo.png",
    },
    {
      name: "Honor",
      logo: "https://logos-world.net/wp-content/uploads/2020/05/Honor-Logo.png",
    },
    {
      name: "HP",
      logo: "https://logos-world.net/wp-content/uploads/2020/09/HP-Logo.png",
    },
    {
      name: "Dell",
      logo: "https://logos-world.net/wp-content/uploads/2020/09/Dell-Logo.png",
    },
    {
      name: "Canon",
      logo: "https://logos-world.net/wp-content/uploads/2020/04/Canon-Logo.png",
    },
    {
      name: "Huawei",
      logo: "https://logos-world.net/wp-content/uploads/2020/07/Huawei-Logo.png",
    },
    {
      name: "Oppo",
      logo: "https://logos-world.net/wp-content/uploads/2020/05/Oppo-Logo.png",
    },
    {
      name: "Lenovo",
      logo: "https://logos-world.net/wp-content/uploads/2020/09/Lenovo-Logo.png",
    },
    {
      name: "Xiaomi",
      logo: "https://logos-world.net/wp-content/uploads/2020/05/Xiaomi-Logo.png",
    },
    {
      name: "Samsung",
      logo: "https://logos-world.net/wp-content/uploads/2020/04/Samsung-Logo.png",
    },
    {
      name: "Apple",
      logo: "https://logos-world.net/wp-content/uploads/2020/04/Apple-Logo.png",
    },
  ];

  const duplicatedBrands = [...brands, ...brands];

  const scrollStyle = `
    @keyframes scroll {
      0% { transform: translateX(0); }
      100% { transform: translateX(-50%); }
    }
    .animate-scroll {
      animation: scroll 5s linear infinite alternate;
    }
    .animate-scroll:hover {
      animation-play-state: paused;
    }
  `;

  return (
    <section className="bg-gray-50 py-12">
      <style>{scrollStyle}</style>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Shop by Brand
          </h2>
          <p className="text-gray-600">
            Discover products from top technology brands
          </p>
        </div>

        <div className="relative overflow-hidden md:overflow-visible">
          <div className="flex gap-4 animate-scroll md:hidden pb-4">
            {duplicatedBrands?.map((brand, index) => (
              <div
                key={`${brand.name}-${index}`}
                className="bg-white rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow duration-300 cursor-pointer group flex-shrink-0 w-24"
              >
                <div className="flex flex-col items-center">
                  <div className="w-16 h-16 mb-2 flex items-center justify-center">
                    <img
                      src={brand.logo}
                      alt={brand.name}
                      className="max-w-full max-h-full object-contain group-hover:scale-110 transition-transform duration-300"
                      onError={(e) => {
                        // Fallback to a simple text logo if image fails to load
                        const target = e.target as HTMLImageElement;
                        target.style.display = "none";
                        const parent = target.parentElement;
                        if (parent) {
                          parent.innerHTML = `<div class="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center text-xs font-bold text-gray-600">${brand.name}</div>`;
                        }
                      }}
                    />
                  </div>
                  <span className="text-xs font-medium text-gray-700 text-center">
                    {brand.name}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="hidden md:grid md:grid-cols-6 lg:grid-cols-11 gap-4">
            {brands?.map((brand, index) => (
              <div
                key={index}
                className="bg-white rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow duration-300 cursor-pointer group"
              >
                <div className="flex flex-col items-center">
                  <div className="w-16 h-16 mb-2 flex items-center justify-center">
                    <img
                      src={brand.logo}
                      alt={brand.name}
                      className="max-w-full max-h-full object-contain group-hover:scale-110 transition-transform duration-300"
                      onError={(e) => {
                        // Fallback to a simple text logo if image fails to load
                        const target = e.target as HTMLImageElement;
                        target.style.display = "none";
                        const parent = target.parentElement;
                        if (parent) {
                          parent.innerHTML = `<div class="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center text-xs font-bold text-gray-600">${brand.name}</div>`;
                        }
                      }}
                    />
                  </div>
                  <span className="text-xs font-medium text-gray-700 text-center">
                    {brand.name}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default BrandLogos;
