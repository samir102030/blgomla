import React, { useState, useEffect } from 'react';

interface Slide {
  id: number;
  title: string;
  subtitle: string;
  buttonText: string;
  buttonLink: string;
  image: string;
  bgColor: string;
}

const slides: Slide[] = [
  {
    id: 1,
    title: "Connect your",
    subtitle: "Smart Home",
    buttonText: "BUY NOW",
    buttonLink: "/brands",
    image: "/api/placeholder/600/400", 
    bgColor: "bg-gradient-to-r from-gray-100 to-gray-200"
  },
  {
    id: 2,
    title: "Professional",
    subtitle: "Networking Equipment",
    buttonText: "SHOP NOW",
    buttonLink: "/brands",
    image: "/api/placeholder/600/400", // Placeholder for router image
    bgColor: "bg-gradient-to-r from-blue-50 to-blue-100"
  },
  {
    id: 3,
    title: "Advanced",
    subtitle: "Security Cameras",
    buttonText: "EXPLORE",
    buttonLink: "/brands",
    image: "/api/placeholder/600/400", 
    bgColor: "bg-gradient-to-r from-purple-50 to-purple-100"
  }
];

const HeroSlider: React.FC = () => {
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);

    return () => clearInterval(timer);
  }, []);

  const goToSlide = (index: number) => {
    setCurrentSlide(index);
  };

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  };

  return (
    <div className="relative h-96 md:h-[500px] lg:h-[600px] overflow-hidden">
      {slides.map((slide, index) => (
        <div
          key={slide.id}
          className={`absolute inset-0 transition-transform duration-500 ease-in-out ${
            index === currentSlide ? 'translate-x-0' : 
            index < currentSlide ? '-translate-x-full' : 'translate-x-full'
          }`}
        >
          <div className={`w-full h-full ${slide.bgColor} flex items-center`}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
                {/* Content */}
                <div className="text-left space-y-6">
                  <div>
                    <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight">
                      {slide.title}
                    </h1>
                    <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight">
                      {slide.subtitle}
                    </h2>
                  </div>
                  <a
                    href={slide.buttonLink}
                    className="inline-block bg-black text-white px-8 py-3 rounded-full font-medium hover:bg-gray-800 transition-colors duration-300 text-sm md:text-base"
                  >
                    {slide.buttonText}
                  </a>
                </div>

                {/* Image */}
                <div className="flex justify-center lg:justify-end">
                  <div className="relative">
                    {/* Placeholder camera image */}
                    <div className="w-80 h-64 md:w-96 md:h-80 bg-gray-300 rounded-lg flex items-center justify-center">
                      <div className="text-center text-gray-600">
                        <div className="text-6xl mb-4">📷</div>
                        <p className="text-lg font-medium">Professional Camera</p>
                        <p className="text-sm">High Quality Equipment</p>
                      </div>
                    </div>
                    
                    {/* Decorative elements */}
                    <div className="absolute -top-4 -right-4 w-8 h-8 bg-blue-500 rounded-full opacity-20"></div>
                    <div className="absolute -bottom-4 -left-4 w-12 h-12 bg-purple-500 rounded-full opacity-20"></div>
                    <div className="absolute top-1/2 -right-8 w-6 h-6 bg-yellow-500 rounded-full opacity-30"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}

      {/* Navigation Arrows */}
      <button
        onClick={prevSlide}
        className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-white bg-opacity-80 hover:bg-opacity-100 rounded-full p-2 shadow-lg transition-all duration-300 z-10"
      >
        <svg className="w-6 h-6 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      
      <button
        onClick={nextSlide}
        className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-white bg-opacity-80 hover:bg-opacity-100 rounded-full p-2 shadow-lg transition-all duration-300 z-10"
      >
        <svg className="w-6 h-6 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>

      {/* Dots Indicator */}
      <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex space-x-2 z-10">
        {slides.map((_, index) => (
          <button
            key={index}
            onClick={() => goToSlide(index)}
            className={`w-3 h-3 rounded-full transition-all duration-300 ${
              index === currentSlide 
                ? 'bg-white scale-110' 
                : 'bg-white bg-opacity-50 hover:bg-opacity-75'
            }`}
          />
        ))}
      </div>
    </div>
  );
};

export default HeroSlider;
