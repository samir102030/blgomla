import React from "react";
import { Link } from "react-router-dom";
import Header from "../components/Header";
import Footer from "../components/Footer";
import SEO from "../components/SEO";
import { useTranslation } from "react-i18next";

const AboutUsPage: React.FC = () => {
  const { t } = useTranslation();
  const teamMembers = [
    {
      name: t("Halafawy"),
      position: t("CEO & Founder"),
      image: "uncle.enc",
      description: t(
        "Enthusiast with 15+ years of experience in the Network industry."
      ),
    },
    //{
    //  name: 'person2',
    //  position: 'Head of Product',
    //  image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=300&h=300&fit=crop',
    //  description: 'Expert in camera technology and product development with a passion for innovation.'
    //},
    //{
    //name: 'person3',
    //position: 'Technical Director',
    // image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&h=300&fit=crop',
    // description: 'Professional photographer and technical specialist with expertise in all camera types.'
    //},
    // {
    //  name: 'person4',
    // position: 'Customer Experience Manager',
    // image: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=300&h=300&fit=crop',
    // description: 'Dedicated to ensuring every customer has the best shopping experience possible.'
    // }
  ];

  const stats = [
    { number: "50,000+", label: t("Happy Customers") },
    { number: "10,000+", label: t("Products Sold") },
    { number: "15+", label: t("Years Experience") },
    { number: "24/7", label: t("Customer Support") },
  ];

  const values = [
    {
      icon: "🎯",
      title: t("Quality First"),
      description: t(
        "We only stock cameras and equipment from trusted brands known for their reliability and performance."
      ),
    },
    {
      icon: "💡",
      title: t("Expert Guidance"),
      description: t(
        "Our team of photography experts is here to help you find the perfect camera for your needs."
      ),
    },
    {
      icon: "🚚",
      title: t("Fast Delivery"),
      description: t(
        "Quick and secure shipping to get your new camera equipment to you as soon as possible."
      ),
    },
    {
      icon: "🛡️",
      title: t("Warranty Protection"),
      description: t(
        "All our products come with comprehensive warranty coverage for your peace of mind."
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-[var(--surface)]">
      <SEO
        title="About Us"
        description="Learn about Belgomla — Egypt's marketplace for IT, networking, and technology. Our story, mission, and the team behind the platform."
      />
      <Header />

      {/* Hero Section */}
      <div className="relative bg-[var(--surface-2)] py-20">
        <div className="absolute inset-0">
          <img
            src="net1.jpeg"
            alt="Camera Store"
            className="w-full h-full object-cover opacity-30"
          />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-5xl font-bold text-[var(--text)] mb-6">
            {t("About Belgomla")}
          </h1>
          <p className="text-xl text-[var(--text-muted)] max-w-3xl mx-auto mb-8">
            {t(
              "Your trusted partner in building seamless connections. For over 15 years, we've supported IT professionals and businesses with top-tier networking equipment and expert guidance to keep you connected and secure."
            )}
          </p>
          <nav className="text-sm text-[var(--text-muted)]">
            <Link to="/" className="hover:text-[var(--text)]">
              {t("Home")}
            </Link>
            <span className="mx-2">/</span>
            <span>{t("About Us")}</span>
          </nav>
        </div>
      </div>

      <main>
        {/* Our Story Section */}
        <section className="py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-3xl font-bold text-[var(--text)] mb-6">
                  {t("Our Story")}
                </h2>
                <div className="space-y-4 text-[var(--text-muted)]">
                  <p>
                    {t(
                      "Founded in 2009, Belgomla began as a small networking gear provider with a bold vision: to make high-quality network infrastructure accessible to everyone. What started as a passion project by tech enthusiasts has grown into one of the region's most trusted names in networking solutions, serving professionals, businesses, and IT teams with reliable equipment and expert support."
                    )}
                  </p>
                  <p>
                    {t(
                      "We believe that every connection should be fast, secure, and reliable. Whether you're an IT professional, a growing business, or a home user looking to upgrade your setup, we offer the right networking equipment and solutions to keep you connected and in control."
                    )}
                  </p>
                  <p>
                    {t(
                      "Our commitment to quality, customer service, and competitive pricing has earned us the trust of thousands of customers. We're not just selling cameras; we're helping people preserve their memories and express their creativity."
                    )}
                  </p>
                </div>
              </div>
              <div className="relative">
                <img
                  src="net2.jpeg"
                  alt="Camera Store Interior"
                  className="rounded-lg shadow-lg"
                />
                <div className="absolute -bottom-6 -right-6 bg-[var(--surface)] p-6 rounded-lg shadow-lg">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-blue-600">15+</div>
                    <div className="text-sm text-[var(--text-muted)]">
                      {t("Years of Excellence")}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="py-16 bg-[var(--bg)]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-[var(--text)] mb-4">
                {t("Our Achievements")}
              </h2>
              <p className="text-xl text-[var(--text-muted)]">
                {t("Numbers that speak for our commitment to excellence")}
              </p>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
              {stats.map((stat, index) => (
                <div key={index} className="text-center">
                  <div className="text-4xl font-bold text-blue-600 mb-2">
                    {stat.number}
                  </div>
                  <div className="text-[var(--text-muted)]">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Values Section */}
        <section className="py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-[var(--text)] mb-4">
                {t("Our Values")}
              </h2>
              <p className="text-xl text-[var(--text-muted)]">
                {t("What drives us to serve you better every day")}
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {values.map((value, index) => (
                <div key={index} className="text-center">
                  <div className="text-4xl mb-4">{value.icon}</div>
                  <h3 className="text-xl font-semibold text-[var(--text)] mb-3">
                    {value.title}
                  </h3>
                  <p className="text-[var(--text-muted)]">{value.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Team Section */}
        <section className="py-16 bg-[var(--bg)]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-[var(--text)] mb-4">
                {t("Meet Our Team")}
              </h2>
              <p className="text-xl text-[var(--text-muted)]">
                {t("The passionate people behind Belgomla")}
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {teamMembers.map((member, index) => (
                <div
                  key={index}
                  className="bg-[var(--surface)] rounded-lg shadow-sm overflow-hidden"
                >
                  <img
                    src={member.image}
                    alt={member.name}
                    className="w-full h-64 object-cover"
                  />
                  <div className="p-6">
                    <h3 className="text-xl font-semibold text-[var(--text)] mb-1">
                      {member.name}
                    </h3>
                    <p className="text-blue-600 font-medium mb-3">
                      {member.position}
                    </p>
                    <p className="text-[var(--text-muted)] text-sm">
                      {member.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Mission Section */}
        <section className="py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-blue-600 rounded-2xl p-12 text-center text-white">
              <h2 className="text-3xl font-bold mb-6">{t("Our Mission")}</h2>
              <p className="text-xl mb-8 max-w-4xl mx-auto">
                {t(
                  "To empower users of all levels with high-quality networking equipment, expert support, and outstanding service—enabling them to build, manage, and secure reliable connections in a fast-moving digital world."
                )}
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  to="/brands"
                  className="bg-[var(--surface)] text-blue-600 px-8 py-3 rounded-lg font-medium hover:bg-[var(--surface-2)] transition-colors"
                >
                  {t("Shop Now")}
                </Link>
                <Link
                  to="/contact"
                  className="border border-white text-white px-8 py-3 rounded-lg font-medium hover:bg-[var(--surface)] hover:text-blue-600 transition-colors"
                >
                  {t("Contact Us")}
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Why Choose Us Section */}
        <section className="py-16 bg-[var(--bg)]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-[var(--text)] mb-4">
                {t("Why Choose Belgomla?")}
              </h2>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div>
                <ul className="space-y-6">
                  <li className="flex items-start">
                    <div className="flex-shrink-0 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center mt-1">
                      <svg
                        className="w-3 h-3 text-white"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                    <div className="ml-4">
                      <h3 className="text-lg font-semibold text-[var(--text)]">
                        {t("Authentic Products Only")}
                      </h3>
                      <p className="text-[var(--text-muted)]">
                        {t(
                          "All our cameras and accessories are 100% genuine and come with official warranties."
                        )}
                      </p>
                    </div>
                  </li>
                  <li className="flex items-start">
                    <div className="flex-shrink-0 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center mt-1">
                      <svg
                        className="w-3 h-3 text-white"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                    <div className="ml-4">
                      <h3 className="text-lg font-semibold text-[var(--text)]">
                        {t("Expert Support")}
                      </h3>
                      <p className="text-[var(--text-muted)]">
                        {t(
                          "Our knowledgeable team provides personalized recommendations and technical support."
                        )}
                      </p>
                    </div>
                  </li>
                  <li className="flex items-start">
                    <div className="flex-shrink-0 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center mt-1">
                      <svg
                        className="w-3 h-3 text-white"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                    <div className="ml-4">
                      <h3 className="text-lg font-semibold text-[var(--text)]">
                        {t("Competitive Pricing")}
                      </h3>
                      <p className="text-[var(--text-muted)]">
                        {t(
                          "We offer the best prices in the market without compromising on quality or service."
                        )}
                      </p>
                    </div>
                  </li>
                  <li className="flex items-start">
                    <div className="flex-shrink-0 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center mt-1">
                      <svg
                        className="w-3 h-3 text-white"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                    <div className="ml-4">
                      <h3 className="text-lg font-semibold text-[var(--text)]">
                        {t("Hassle-Free Returns")}
                      </h3>
                      <p className="text-[var(--text-muted)]">
                        {t(
                          "30-day return policy with no questions asked if you're not completely satisfied."
                        )}
                      </p>
                    </div>
                  </li>
                </ul>
              </div>
              <div>
                <img
                  src="net3.jpeg"
                  alt="Customer Service"
                  className="rounded-lg shadow-lg"
                />
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default AboutUsPage;
