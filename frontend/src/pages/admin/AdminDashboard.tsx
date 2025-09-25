import React from 'react';
import { ArrowUpIcon, ArrowDownIcon } from '@heroicons/react/24/outline';

const AdminDashboard: React.FC = () => {
  const statsCards = [
    {
      title: 'Total Sales',
      value: '34,945',
      change: '1.56%',
      isPositive: true,
      icon: '🛍️',
      bgColor: 'bg-[#FAFAFA]',
      iconBg: 'bg-[#009688]',
      chartColor: 'stroke-[#009688]'
    },
    {
      title: 'Total Income',
      value: '$37,802',
      change: '1.56%',
      isPositive: true,
      icon: '$',
      bgColor: 'bg-[#FAFAFA]',
      iconBg: 'bg-[#FFD600]',
      chartColor: 'stroke-[#FFD600]'
    },
    {
      title: 'Orders Paid',
      value: '34,945',
      change: '0.00%',
      isPositive: false,
      icon: '📋',
      bgColor: 'bg-[#FAFAFA]',
      iconBg: 'bg-[#9E9E9E]',
      chartColor: 'stroke-[#9E9E9E]'
    },
    {
      title: 'Total Visitor',
      value: '34,945',
      change: '1.56%',
      isPositive: true,
      icon: '👥',
      bgColor: 'bg-[#FAFAFA]',
      iconBg: 'bg-[#002B5B]',
      chartColor: 'stroke-[#002B5B]'
    }
  ];

  const topProducts = [
    {
      name: 'Patimax Fragrance Long...',
      items: '100 Items',
      coupon: 'Coupon Code',
      status: 'Sfiat',
      discount: '-15%',
      price: '$27.00',
      image: '🧴',
      flag: '🇹🇳'
    },
    {
      name: 'Nulo MedalSeries Adult Cat...',
      items: '100 Items',
      coupon: 'Coupon Code',
      status: 'Sfiat',
      discount: '-15%',
      price: '$27.00',
      image: '🐱',
      flag: '🇬🇧'
    },
    {
      name: 'Pedigree Puppy Dry Dog...',
      items: '100 Items',
      coupon: 'Coupon Code',
      status: 'Sfiat',
      discount: '-15%',
      price: '$27.00',
      image: '🐕',
      flag: '🇬🇧'
    },
    {
      name: 'Biscotto Premier Cookie...',
      items: '100 Items',
      coupon: 'Coupon Code',
      status: 'Sfiat',
      discount: '-15%',
      price: '$27.00',
      image: '🍪',
      flag: '🇩🇿'
    },
    {
      name: 'Pedigree Adult Dry Dog...',
      items: '100 Items',
      coupon: 'Coupon Code',
      status: 'Sfiat',
      discount: '-15%',
      price: '$27.00',
      image: '🐕',
      flag: '🇫🇷'
    }
  ];

  const topCountries = [
    { country: 'Turkish Flag', flag: '🇹🇷', sales: '6,972', change: '', isPositive: true, trend: 'up' },
    { country: 'Belgium', flag: '🇧🇪', sales: '6,972', change: '', isPositive: true, trend: 'up' },
    { country: 'Sweden', flag: '🇸🇪', sales: '6,972', change: '', isPositive: false, trend: 'down' },
    { country: 'Vietnamese', flag: '🇻🇳', sales: '6,972', change: '', isPositive: true, trend: 'up' },
    { country: 'Australia', flag: '🇦🇺', sales: '6,972', change: '', isPositive: false, trend: 'down' },
    { country: 'Saudi Arabia', flag: '🇸🇦', sales: '6,972', change: '', isPositive: false, trend: 'down' }
  ];

  const bestSellers = [
    {
      name: 'Robert',
      avatar: '👤',
      purchases: '23 Purchases',
      categories: 'Kitchen, Pets',
      total: '$1,000',
      status: 'Active',
      progress: 100,
      progressColor: 'bg-green-500'
    },
    {
      name: 'Calvin',
      avatar: '👤',
      purchases: '18 Purchases',
      categories: 'Health, Grocery',
      total: '$4,000',
      status: 'Active',
      progress: 100,
      progressColor: 'bg-orange-500'
    },
    {
      name: 'Dwight',
      avatar: '👤',
      purchases: '14 Purchases',
      categories: 'Electronics',
      total: '$2,700',
      status: 'Active',
      progress: 100,
      progressColor: 'bg-blue-500'
    },
  ];

  const statistics = [
    { label: 'Total Users', value: '40,689', change: '8.5%', isPositive: true, color: 'text-blue-600' },
    { label: 'Total Order', value: '10,293', change: '1.3%', isPositive: true, color: 'text-green-600' },
    { label: 'Total Sales', value: '$89,000', change: '4.3%', isPositive: false, color: 'text-red-600' },
    { label: 'Total Pending', value: '2,040', change: '1.8%', isPositive: true, color: 'text-orange-600' }
  ];

  const productOverview = [
    {
      name: 'Soft Fluffy Cats',
      id: '#327',
      price: '$11.70',
      quantity: 28,
      status: 'On sale',
      revenue: '$328.85',
      rating: 'Not Available',
      image: '🐱'
    },
    {
      name: 'Taste of the Wild Formula Finder',
      id: '#380',
      price: '$6.99',
      quantity: 10,
      status: 'On sale',
      revenue: '$106.55',
      rating: 'Not Available',
      image: '🍖'
    },
    {
      name: 'Wellness Natural Food',
      id: '#126',
      price: '$5.22',
      quantity: 578,
      status: '---',
      revenue: '$202.87',
      rating: 'Not Available',
      image: '🥗'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statsCards.map((stat, index) => (
          <div key={index} className={`${stat.bgColor} rounded-xl p-6 border border-gray-100`}>
            <div className="flex items-start justify-between mb-4">
              <div className={`w-12 h-12 ${stat.iconBg} rounded-xl flex items-center justify-center text-white text-xl`}>
                {stat.icon}
              </div>
              <div className="flex items-center space-x-1">
                {stat.isPositive ? (
                  <ArrowUpIcon className="w-4 h-4 text-green-500" />
                ) : (
                  <ArrowDownIcon className="w-4 h-4 text-red-500" />
                )}
                <span className={`text-sm font-medium ${stat.isPositive ? 'text-green-600' : 'text-red-600'}`}>
                  {stat.change}
                </span>
              </div>
            </div>
            <div className="mb-4">
              <p className="text-sm font-medium text-[#9E9E9E] mb-1">{stat.title}</p>
              <p className="text-2xl font-bold text-[#333333]">{stat.value}</p>
            </div>
            {/* Mini Chart */}
            <div className="h-12">
              <svg className="w-full h-full" viewBox="0 0 120 40" preserveAspectRatio="none">
                <path
                  d="M0,30 Q10,20 20,25 T40,20 T60,15 T80,25 T100,10 L120,15"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className={stat.chartColor}
                />
                <path
                  d="M0,30 Q10,20 20,25 T40,20 T60,15 T80,25 T100,10 L120,15 L120,40 L0,40 Z"
                  fill="currentColor"
                  className={`${stat.chartColor} opacity-20`}
                />
              </svg>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Orders Chart */}
        <div className="lg:col-span-2 bg-[#FAFAFA] rounded-xl p-6 shadow-sm border border-[#9E9E9E]/20">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-[#333333]">Recent Order</h3>
            <button className="text-[#9E9E9E] hover:text-[#333333]">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
              </svg>
            </button>
          </div>
          <div className="h-64 relative">
            {/* Chart Area */}
            <svg className="w-full h-full" viewBox="0 0 400 200" preserveAspectRatio="none">
              {/* Grid lines */}
              <defs>
                <pattern id="grid" width="40" height="20" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 20" fill="none" stroke="#f3f4f6" strokeWidth="1"/>
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />

              {/* Main chart line */}
              <path
                d="M20,150 Q60,120 80,140 T140,100 T180,80 T220,120 T260,60 T300,90 T340,40 L380,70"
                fill="none"
                stroke="#002B5B"
                strokeWidth="3"
                strokeLinecap="round"
              />

              {/* Fill area */}
              <path
                d="M20,150 Q60,120 80,140 T140,100 T180,80 T220,120 T260,60 T300,90 T340,40 L380,70 L380,200 L20,200 Z"
                fill="url(#midnightBlueGradient)"
                opacity="0.1"
              />

              <defs>
                <linearGradient id="midnightBlueGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#002B5B" stopOpacity="0.3"/>
                  <stop offset="100%" stopColor="#002B5B" stopOpacity="0"/>
                </linearGradient>
              </defs>
            </svg>

            {/* Month labels */}
            <div className="absolute bottom-0 left-0 right-0 flex justify-between text-xs text-[#9E9E9E] px-4">
              <span>Jan</span>
              <span>Feb</span>
              <span>Mar</span>
              <span>Apr</span>
              <span>May</span>
              <span>Jun</span>
              <span>Jul</span>
              <span>Aug</span>
              <span>Sep</span>
              <span>Oct</span>
              <span>Nov</span>
              <span>Dec</span>
            </div>
          </div>
        </div>

        {/* Top Products */}
        <div className="bg-[#FAFAFA] rounded-xl p-6 shadow-sm border border-[#9E9E9E]/20">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-[#333333]">Top Products</h3>
            <button className="text-sm text-[#002B5B] hover:text-[#001a3d]">View all ↗</button>
          </div>
          <div className="space-y-4">
            {topProducts.map((product, index) => (
              <div key={index} className="flex items-center justify-between py-2">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center text-lg">
                    {product.image}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[#333333]">{product.name}</p>
                    <p className="text-xs text-[#9E9E9E]">{product.items}</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="text-xs text-[#9E9E9E]">{product.coupon}</span>
                    <span className="text-lg">{product.flag}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-[#9E9E9E]">{product.status}</span>
                    <div className="flex items-center space-x-1">
                      <span className="text-xs font-medium text-[#D32F2F]">{product.discount}</span>
                      <span className="text-xs text-[#333333]">{product.price}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Statistics Section */}
      <div className="bg-[#FAFAFA] rounded-xl p-6 shadow-sm border border-[#9E9E9E]/20">
        <h3 className="text-lg font-semibold text-[#333333] mb-6">Statistics</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statistics.map((stat, index) => (
            <div key={index} className="text-center">
              <div className="mb-2">
                <span className="text-2xl font-bold text-[#333333]">{stat.value}</span>
              </div>
              <div className="mb-2">
                <span className="text-sm text-[#9E9E9E]">{stat.label}</span>
              </div>
              <div className="flex items-center justify-center space-x-1">
                {stat.isPositive ? (
                  <ArrowUpIcon className="w-4 h-4 text-[#009688]" />
                ) : (
                  <ArrowDownIcon className="w-4 h-4 text-[#D32F2F]" />
                )}
                <span className={`text-sm font-medium ${stat.isPositive ? 'text-[#009688]' : 'text-[#D32F2F]'}`}>
                  {stat.change}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Countries */}
        <div className="bg-[#FAFAFA] rounded-xl p-6 shadow-sm border border-[#9E9E9E]/20">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-[#333333]">Top Countries By Sales</h3>
            <button className="text-sm text-[#002B5B] hover:text-[#001a3d]">View all</button>
          </div>

          {/* Main sales figure */}
          <div className="mb-6">
            <div className="flex items-center space-x-2 mb-2">
              <span className="text-2xl font-bold text-[#333333]">$37,802</span>
              <div className="flex items-center text-[#009688]">
                <ArrowUpIcon className="w-4 h-4" />
                <span className="text-sm font-medium">1.56%</span>
              </div>
            </div>
            <p className="text-xs text-[#9E9E9E]">Since last weekend</p>
          </div>

          <div className="space-y-3">
            {topCountries.map((country, index) => (
              <div key={index} className="flex items-center justify-between py-2">
                <div className="flex items-center space-x-3">
                  <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center">
                    <span className="text-sm">{country.flag}</span>
                  </div>
                  <span className="text-sm font-medium text-[#333333]">{country.country}</span>
                </div>
                <div className="flex items-center space-x-3">
                  <span className="text-sm font-semibold text-[#333333]">{country.sales}</span>
                  <div className={`w-4 h-4 ${country.trend === 'up' ? 'text-[#009688]' : 'text-[#D32F2F]'}`}>
                    {country.trend === 'up' ? (
                      <ArrowUpIcon className="w-4 h-4" />
                    ) : (
                      <ArrowDownIcon className="w-4 h-4" />
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Best Shop Sellers */}
        <div className="bg-[#FAFAFA] rounded-xl p-6 shadow-sm border border-[#9E9E9E]/20">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-[#333333]">Best Shop Sellers</h3>
            <button className="text-sm text-[#002B5B] hover:text-[#001a3d]">View all ↗</button>
          </div>

          {/* Table Header */}
          <div className="grid grid-cols-4 gap-4 pb-3 mb-4 border-b border-[#9E9E9E]/20 text-xs font-medium text-[#9E9E9E]">
            <div>Shop</div>
            <div>Categories</div>
            <div>Total</div>
            <div>Status</div>
          </div>

          {/* Table Rows */}
          <div className="space-y-4">
            {bestSellers.map((seller, index) => (
              <div key={index} className="grid grid-cols-4 gap-4 items-center">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-sm">
                    {seller.avatar}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[#333333]">{seller.name}</p>
                    <p className="text-xs text-[#9E9E9E]">{seller.purchases}</p>
                  </div>
                </div>
                <div className="text-sm text-[#9E9E9E]">{seller.categories}</div>
                <div className="text-sm font-semibold text-[#333333]">{seller.total}</div>
                <div className="flex items-center space-x-2">
                  <div className={`w-16 h-2 bg-[#9E9E9E]/20 rounded-full overflow-hidden`}>
                    <div
                      className={`h-full ${seller.progressColor} rounded-full`}
                      style={{ width: `${seller.progress}%` }}
                    ></div>
                  </div>
                  <span className="text-xs text-[#9E9E9E]">{seller.progress}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Product Overview */}
        <div className="bg-[#FAFAFA] rounded-xl p-6 shadow-sm border border-[#9E9E9E]/20">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-[#333333]">Product overview</h3>
            <button className="text-sm text-[#002B5B] hover:text-[#001a3d]">View all ↗</button>
          </div>

          {/* Table Header */}
          <div className="grid grid-cols-7 gap-4 pb-3 mb-4 border-b border-[#9E9E9E]/20 text-xs font-medium text-[#9E9E9E]">
            <div>Name</div>
            <div>Product ID</div>
            <div>Price</div>
            <div>Quantity</div>
            <div>Sale</div>
            <div>Revenue</div>
            <div>Status</div>
          </div>

          {/* Table Rows */}
          <div className="space-y-4">
            {productOverview.map((product, index) => (
              <div key={index} className="grid grid-cols-7 gap-4 items-center text-xs">
                <div className="flex items-center space-x-2">
                  <div className="w-6 h-6 bg-gray-100 rounded flex items-center justify-center text-sm">
                    {product.image}
                  </div>
                  <span className="font-medium text-[#333333]">{product.name}</span>
                </div>
                <div className="text-[#9E9E9E]">{product.id}</div>
                <div className="text-[#333333] font-medium">{product.price}</div>
                <div className="text-[#9E9E9E]">{product.quantity}</div>
                <div className={`px-2 py-1 rounded text-xs ${
                  product.status === 'On sale' ? 'bg-[#009688]/10 text-[#009688]' :
                  product.status === '---' ? 'text-[#9E9E9E]' : 'bg-[#FFD600]/10 text-[#333333]'
                }`}>
                  {product.status}
                </div>
                <div className="text-[#333333] font-medium">{product.revenue}</div>
                <div className="text-[#673AB7] font-medium">{product.rating}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
