import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer className="bg-[#002B5B] text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* About Us */}
          <div>
            <h3 className="text-lg font-semibold mb-4 text-[#FFD600]">About us</h3>
            <p className="text-[#9E9E9E] text-sm leading-relaxed mb-6">
              Belgomla, Your Trusted Partner for Networking Solutions
            </p>
            <div>
              <h4 className="text-sm font-medium mb-3">Follow us</h4>
              <div className="flex space-x-3">
                <a href="#" className="w-8 h-8 bg-[#9E9E9E]/20 rounded-full flex items-center justify-center hover:bg-[#FFD600] hover:text-[#333333] transition-colors">
                  <span className="text-sm">f</span>
                </a>
                <a href="#" className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center hover:bg-blue-400 transition-colors">
                  <span className="text-sm">t</span>
                </a>
                <a href="#" className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center hover:bg-orange-500 transition-colors">
                  <span className="text-sm">📧</span>
                </a>
                <a href="#" className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center hover:bg-red-600 transition-colors">
                  <span className="text-sm">g+</span>
                </a>
                <a href="#" className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center hover:bg-blue-700 transition-colors">
                  <span className="text-sm">in</span>
                </a>
              </div>
            </div>
          </div>

          {/* Information */}
          <div>
            <h3 className="text-lg font-semibold mb-4 text-[#FFD600]">Information</h3>
            <ul className="space-y-2 text-sm">
              <li><a href="/about" className="text-[#9E9E9E] hover:text-[#FFD600] transition-colors">About Us</a></li>
              <li><a href="/services" className="text-[#9E9E9E] hover:text-[#FFD600] transition-colors">Services</a></li>
              <li><a href="/delivery" className="text-[#9E9E9E] hover:text-[#FFD600] transition-colors">Delivery Information</a></li>
              <li><a href="/privacy" className="text-[#9E9E9E] hover:text-[#FFD600] transition-colors">Privacy Policy</a></li>
              <li><a href="/terms" className="text-[#9E9E9E] hover:text-[#FFD600] transition-colors">Terms & Conditions</a></li>
              <li><a href="/returns" className="text-[#9E9E9E] hover:text-[#FFD600] transition-colors">Return Policy</a></li>
            </ul>
          </div>

          {/* My Account */}
          <div>
            <h3 className="text-lg font-semibold mb-4">My Account</h3>
            <ul className="space-y-2 text-sm">
              <li><a href="/account" className="text-gray-300 hover:text-white transition-colors">My Account</a></li>
              <li><a href="/cart" className="text-gray-300 hover:text-white transition-colors">Cart</a></li>
              <li><a href="/checkout" className="text-gray-300 hover:text-white transition-colors">Checkout</a></li>
              <li><a href="/contact" className="text-gray-300 hover:text-white transition-colors">Contact</a></li>
              <li><a href="/validation" className="text-gray-300 hover:text-white transition-colors">Validation</a></li>
              <li><a href="/wishlist" className="text-gray-300 hover:text-white transition-colors">Wishlist</a></li>
            </ul>
          </div>

          {/* Get In Touch */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Get In Touch</h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-start">
                <span className="text-gray-400 mr-2">📍</span>
                <span className="text-gray-300">6 October.</span>
              </div>
              <div className="flex items-center">
                <span className="text-gray-400 mr-2">📞</span>
                <span className="text-gray-300">(+20) 1009353639</span>
              </div>
              <div className="flex items-center">
                <span className="text-gray-400 mr-2">✉️</span>
                <span className="text-gray-300">Halafawy@gmail.com</span>
              </div>
            </div>

            {/* Payment Methods */}
            <div className="mt-6">
              <div className="flex space-x-2">
                <div className="w-10 h-6 bg-[#002B5B] rounded text-xs flex items-center justify-center text-[#FFD600] font-bold border border-[#FFD600]">
                  VISA
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-[#9E9E9E]/30 mt-8 pt-6">
          <div className="flex flex-col md:flex-row justify-between items-center text-sm text-[#9E9E9E]">
            <p>© 2025 Garcia. Made with ❤️ By <a href="#" className="text-[#FFD600] hover:text-[#e6c100]">MMS Theme</a></p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
