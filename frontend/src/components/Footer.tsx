import React from "react";
import { useTranslation } from "react-i18next";

const Footer: React.FC = () => {
  const { t } = useTranslation();
  return (
    <footer className="bg-[#002B5B] dark:bg-slate-950 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 lg:py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
          {/* About Us */}
          <div>
            <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 text-[#FFD600] dark:text-amber-300">
              {t("About us")}
            </h3>
            <p className="text-[#9E9E9E] dark:text-slate-400 text-xs sm:text-sm leading-relaxed mb-4 sm:mb-6">
              {t("Belgomla, Your Trusted Partner for Networking Solutions")}
            </p>
            <div>
              <h4 className="text-xs sm:text-sm font-medium mb-2 sm:mb-3">{t("Follow us")}</h4>
              <div className="flex space-x-2 sm:space-x-3">
                <a
                  href="#"
                  className="w-7 h-7 sm:w-8 sm:h-8 bg-[#9E9E9E]/20 dark:bg-white/10 rounded-full flex items-center justify-center hover:bg-[#FFD600] hover:text-[#333333] dark:hover:bg-amber-300 dark:hover:text-slate-900 transition-colors text-xs sm:text-sm"
                >
                  <span>f</span>
                </a>
                <a
                  href="#"
                  className="w-7 h-7 sm:w-8 sm:h-8 bg-gray-700 dark:bg-white/10 rounded-full flex items-center justify-center hover:bg-blue-400 transition-colors text-xs sm:text-sm"
                >
                  <span>t</span>
                </a>
                <a
                  href="#"
                  className="w-7 h-7 sm:w-8 sm:h-8 bg-gray-700 dark:bg-white/10 rounded-full flex items-center justify-center hover:bg-orange-500 transition-colors text-xs sm:text-sm"
                >
                  <span>📧</span>
                </a>
                <a
                  href="#"
                  className="w-7 h-7 sm:w-8 sm:h-8 bg-gray-700 dark:bg-white/10 rounded-full flex items-center justify-center hover:bg-red-600 transition-colors text-xs sm:text-sm"
                >
                  <span>g+</span>
                </a>
                <a
                  href="#"
                  className="w-7 h-7 sm:w-8 sm:h-8 bg-gray-700 dark:bg-white/10 rounded-full flex items-center justify-center hover:bg-blue-700 transition-colors text-xs sm:text-sm"
                >
                  <span>in</span>
                </a>
              </div>
            </div>
          </div>

          {/* Information */}
          <div>
            <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 text-[#FFD600] dark:text-amber-300">
              {t("Information")}
            </h3>
            <ul className="space-y-1 sm:space-y-2 text-xs sm:text-sm">
              <li>
                <a
                  href="/about"
                  className="text-[#9E9E9E] dark:text-slate-400 hover:text-[#FFD600] dark:hover:text-amber-300 transition-colors"
                >
                  {t("About Us")}
                </a>
              </li>
              <li>
                <a
                  href="/services"
                  className="text-[#9E9E9E] dark:text-slate-400 hover:text-[#FFD600] dark:hover:text-amber-300 transition-colors"
                >
                  {t("Services")}
                </a>
              </li>
              <li>
                <a
                  href="/delivery"
                  className="text-[#9E9E9E] dark:text-slate-400 hover:text-[#FFD600] dark:hover:text-amber-300 transition-colors"
                >
                  {t("Delivery Information")}
                </a>
              </li>
              <li>
                <a
                  href="/privacy"
                  className="text-[#9E9E9E] dark:text-slate-400 hover:text-[#FFD600] dark:hover:text-amber-300 transition-colors"
                >
                  {t("Privacy Policy")}
                </a>
              </li>
              <li>
                <a
                  href="/terms"
                  className="text-[#9E9E9E] dark:text-slate-400 hover:text-[#FFD600] dark:hover:text-amber-300 transition-colors"
                >
                  {t("Terms & Conditions")}
                </a>
              </li>
              <li>
                <a
                  href="/returns"
                  className="text-[#9E9E9E] dark:text-slate-400 hover:text-[#FFD600] dark:hover:text-amber-300 transition-colors"
                >
                  {t("Return Policy")}
                </a>
              </li>
            </ul>
          </div>

          {/* My Account */}
          <div>
            <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 text-white">{t("My Account")}</h3>
            <ul className="space-y-1 sm:space-y-2 text-xs sm:text-sm">
              <li>
                <a
                  href="/account"
                  className="text-gray-300 dark:text-slate-400 hover:text-white transition-colors"
                >
                  {t("My Account")}
                </a>
              </li>
              <li>
                <a
                  href="/cart"
                  className="text-gray-300 dark:text-slate-400 hover:text-white transition-colors"
                >
                  {t("Cart")}
                </a>
              </li>
              <li>
                <a
                  href="/checkout"
                  className="text-gray-300 dark:text-slate-400 hover:text-white transition-colors"
                >
                  {t("Checkout")}
                </a>
              </li>
              <li>
                <a
                  href="/contact"
                  className="text-gray-300 dark:text-slate-400 hover:text-white transition-colors"
                >
                  {t("Contact")}
                </a>
              </li>
              <li>
                <a
                  href="/validation"
                  className="text-gray-300 dark:text-slate-400 hover:text-white transition-colors"
                >
                  {t("Validation")}
                </a>
              </li>
              <li>
                <a
                  href="/wishlist"
                  className="text-gray-300 dark:text-slate-400 hover:text-white transition-colors"
                >
                  {t("Wishlist")}
                </a>
              </li>
            </ul>
          </div>

          {/* Get In Touch */}
          <div>
            <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 text-white">{t("Get In Touch")}</h3>
            <div className="space-y-2 sm:space-y-3 text-xs sm:text-sm">
              <div className="flex items-start">
                <span className="text-gray-400 dark:text-slate-500 mr-2">📍</span>
                <span className="text-gray-300 dark:text-slate-400">6 October.</span>
              </div>
              <div className="flex items-center">
                <span className="text-gray-400 dark:text-slate-500 mr-2">📞</span>
                <span className="text-gray-300 dark:text-slate-400">(+20) 1009353639</span>
              </div>
              <div className="flex items-center">
                <span className="text-gray-400 dark:text-slate-500 mr-2">✉️</span>
                <span className="text-gray-300 dark:text-slate-400 break-all">Halafawy@gmail.com</span>
              </div>
            </div>

            {/* Payment Methods */}
            <div className="mt-4 sm:mt-6">
              <div className="flex space-x-2">
                <div className="w-10 h-6 sm:w-12 sm:h-7 bg-[#002B5B] dark:bg-slate-900 rounded text-xs flex items-center justify-center text-[#FFD600] dark:text-amber-300 font-bold border border-[#FFD600] dark:border-amber-400">
                  VISA
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-[#9E9E9E]/30 dark:border-slate-800 mt-6 sm:mt-8 lg:mt-8 pt-4 sm:pt-6">
          <div className="flex flex-col sm:flex-row justify-between items-center text-xs sm:text-sm text-[#9E9E9E] dark:text-slate-500 text-center sm:text-left">
            <p>{t("© 2025 Garcia. Made with ❤️ By MMS Theme")}</p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
