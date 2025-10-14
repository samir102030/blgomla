export interface Product {
  id: string;
  name: string;
  model: string;
  brand: string;
  category: string;
  price: number;
  currency: string;
  image: string;
  rating: number;
  reviews: number;
  description: string;
  isNew?: boolean;
  isOnSale?: boolean;
  isFeatured?: boolean;
  salePercentage?: number;
  inStock: boolean;
}

export interface Brand {
  id: string;
  name: string;
  logo: string;
  description: string;
  productCount: number;
}

export interface Category {
  id: string;
  name: string;
  brandId: string;
  productCount: number;
}

// Brands
export const brands: Brand[] = [
  {
    id: "apple",
    name: "Apple",
    logo: "https://logos-world.net/wp-content/uploads/2020/04/Apple-Logo.png",
    description: "Premium technology products and innovation",
    productCount: 45,
  },
  {
    id: "samsung",
    name: "Samsung",
    logo: "https://logos-world.net/wp-content/uploads/2020/04/Samsung-Logo.png",
    description: "Leading electronics and mobile technology",
    productCount: 38,
  },
  {
    id: "hp",
    name: "HP",
    logo: "https://logos-world.net/wp-content/uploads/2020/09/HP-Logo.png",
    description: "Computing and printing solutions",
    productCount: 32,
  },
  {
    id: "dell",
    name: "Dell",
    logo: "https://logos-world.net/wp-content/uploads/2020/09/Dell-Logo.png",
    description: "Business and personal computing",
    productCount: 28,
  },
  {
    id: "lenovo",
    name: "Lenovo",
    logo: "https://logos-world.net/wp-content/uploads/2020/09/Lenovo-Logo.png",
    description: "Innovative technology solutions",
    productCount: 25,
  },
  {
    id: "canon",
    name: "Canon",
    logo: "https://logos-world.net/wp-content/uploads/2020/04/Canon-Logo.png",
    description: "Imaging and optical products",
    productCount: 22,
  },
  {
    id: "huawei",
    name: "Huawei",
    logo: "https://logos-world.net/wp-content/uploads/2020/07/Huawei-Logo.png",
    description: "Telecommunications and consumer electronics",
    productCount: 18,
  },
  {
    id: "xiaomi",
    name: "Xiaomi",
    logo: "https://logos-world.net/wp-content/uploads/2020/05/Xiaomi-Logo.png",
    description: "Smart devices and mobile technology",
    productCount: 15,
  },
  {
    id: "oppo",
    name: "Oppo",
    logo: "https://logos-world.net/wp-content/uploads/2020/05/Oppo-Logo.png",
    description: "Mobile devices and accessories",
    productCount: 12,
  },
  {
    id: "honor",
    name: "Honor",
    logo: "https://logos-world.net/wp-content/uploads/2020/05/Honor-Logo.png",
    description: "Smartphone and technology brand",
    productCount: 10,
  },
];

// Categories
export const categories: Category[] = [
  {
    id: "electronics-computers",
    name: "Electronics & Computers",
    brandId: "apple",
    productCount: 245,
  },
  {
    id: "all-electronics",
    name: "All Electronics & Computers",
    brandId: "samsung",
    productCount: 245,
  },
  {
    id: "computers-accessories",
    name: "Computers & Accessories",
    brandId: "hp",
    productCount: 156,
  },
  {
    id: "all-computers",
    name: "All Computers & Accessories",
    brandId: "dell",
    productCount: 156,
  },
  {
    id: "computers",
    name: "Computers",
    brandId: "lenovo",
    productCount: 89,
  },
  {
    id: "all-computers-only",
    name: "All Computers",
    brandId: "hp",
    productCount: 89,
  },
  {
    id: "smartphones",
    name: "Smart Phones",
    brandId: "samsung",
    productCount: 67,
  },
  {
    id: "tablets",
    name: "Tablets",
    brandId: "apple",
    productCount: 45,
  },
  {
    id: "laptops",
    name: "Laptops",
    brandId: "dell",
    productCount: 78,
  },
  {
    id: "cameras",
    name: "Cameras",
    brandId: "canon",
    productCount: 34,
  },
  {
    id: "headphones",
    name: "Headphones & Audio",
    brandId: "apple",
    productCount: 56,
  },
  {
    id: "gaming",
    name: "Gaming Accessories",
    brandId: "samsung",
    productCount: 23,
  },
];

// Products
export const products: Product[] = [
  // MERCUSYS Products
  {
    id: "mercusys-ma30e",
    name: "MA30E USB Adapter",
    model: "MA30E",
    brand: "mercusys",
    category: "mercusys-adapters",
    price: 750,
    currency: "EGP",
    image:
      "https://static.tp-link.com/upload/product-overview/2023/202301/20230116/MA30E_01.png",
    rating: 4.2,
    reviews: 45,
    description:
      "High-speed USB Wi-Fi adapter for reliable wireless connectivity",
    isNew: false,
    isOnSale: false,
    inStock: true,
  },
  {
    id: "mercusys-ma30h",
    name: "MA30H Dual-Band Adapter",
    model: "MA30H",
    brand: "mercusys",
    category: "mercusys-adapters",
    price: 675,
    currency: "EGP",
    image:
      "https://static.tp-link.com/upload/product-overview/2023/202301/20230116/MA30H_01.png",
    rating: 4.1,
    reviews: 38,
    description: "Dual-band USB adapter with speeds up to 867 Mbps at 5 GHz",
    isNew: false,
    isOnSale: true,
    isFeatured: true,
    salePercentage: 15,
    inStock: true,
  },
  {
    id: "mercusys-halo-h30-2pack",
    name: "Halo H30 Mesh System (2-pack)",
    model: "Halo H30(2-pack)",
    brand: "mercusys",
    category: "mercusys-mesh",
    price: 3300,
    currency: "EGP",
    image:
      "https://static.tp-link.com/upload/product-overview/2023/202301/20230116/Halo_H30_2pack_01.png",
    rating: 4.5,
    reviews: 67,
    description: "Whole-home mesh Wi-Fi system with WAN/LAN auto-sensing",
    isNew: true,
    isOnSale: false,
    isFeatured: true,
    inStock: true,
  },
  {
    id: "mercusys-halo-h30-3pack",
    name: "Halo H30 Mesh System (3-pack)",
    model: "Halo H30(3-pack)",
    brand: "mercusys",
    category: "mercusys-mesh",
    price: 4420,
    currency: "EGP",
    image:
      "https://static.tp-link.com/upload/product-overview/2023/202301/20230116/Halo_H30_3pack_01.png",
    rating: 4.6,
    reviews: 89,
    description: "Extended coverage mesh Wi-Fi system for larger homes",
    isNew: true,
    isOnSale: false,
    inStock: true,
  },
  {
    id: "mercusys-me10",
    name: "ME10 Range Extender",
    model: "ME10",
    brand: "mercusys",
    category: "mercusys-extenders",
    price: 540,
    currency: "EGP",
    image:
      "https://static.tp-link.com/upload/product-overview/2023/202301/20230116/ME10_01.png",
    rating: 3.9,
    reviews: 23,
    description: "Compact Wi-Fi range extender for better coverage",
    isNew: false,
    isOnSale: false,
    inStock: true,
  },
  {
    id: "mercusys-me20",
    name: "ME20 Range Extender",
    model: "ME20",
    brand: "mercusys",
    category: "mercusys-extenders",
    price: 900,
    currency: "EGP",
    image:
      "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=400&fit=crop",
    rating: 4.0,
    reviews: 34,
    description: "Advanced Wi-Fi range extender with enhanced performance",
    isNew: false,
    isOnSale: false,
    inStock: true,
  },
  {
    id: "mercusys-ms105",
    name: "MS105 5-Port Switch",
    model: "MS105",
    brand: "mercusys",
    category: "mercusys-switches",
    price: 230,
    currency: "EGP",
    image:
      "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=400&fit=crop",
    rating: 4.3,
    reviews: 56,
    description: "5-port Fast Ethernet switch for network expansion",
    isNew: false,
    isOnSale: false,
    inStock: true,
  },
  {
    id: "mercusys-ms105g",
    name: "MS105G Gigabit Switch",
    model: "MS105G",
    brand: "mercusys",
    category: "mercusys-switches",
    price: 440,
    currency: "EGP",
    image:
      "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=400&fit=crop",
    rating: 4.4,
    reviews: 78,
    description: "5-port Gigabit Ethernet switch for high-speed networking",
    isNew: false,
    isOnSale: false,
    inStock: true,
  },
  {
    id: "mercusys-mr20",
    name: "MR20 Wi-Fi Router",
    model: "MR20",
    brand: "mercusys",
    category: "mercusys-routers",
    price: 750,
    currency: "EGP",
    image:
      "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=400&fit=crop",
    rating: 4.1,
    reviews: 92,
    description: "Wireless router with 10/100 Mbps WAN port",
    isNew: false,
    isOnSale: false,
    inStock: true,
  },
  {
    id: "mercusys-mr30g",
    name: "MR30G Gigabit Router",
    model: "MR30G",
    brand: "mercusys",
    category: "mercusys-routers",
    price: 1725,
    currency: "EGP",
    image:
      "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=400&fit=crop",
    rating: 4.3,
    reviews: 134,
    description: "Gigabit Wi-Fi router for high-speed internet",
    isNew: false,
    isOnSale: false,
    inStock: true,
  },

  // TP-Link Products
  {
    id: "tp-link-m7200",
    name: "M7200 4G LTE Mobile Wi-Fi",
    model: "M7200",
    brand: "tp-link",
    category: "tp-link-mobile",
    price: 2220,
    currency: "EGP",
    image:
      "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=400&fit=crop",
    rating: 4.4,
    reviews: 156,
    description: "150Mbps 4G LTE Mobile Wi-Fi with Qualcomm chipset",
    isNew: false,
    isOnSale: false,
    inStock: true,
  },
  {
    id: "tp-link-wa1201",
    name: "TL-WA1201 Access Point",
    model: "TL-WA1201",
    brand: "tp-link",
    category: "tp-link-access-points",
    price: 2120,
    currency: "EGP",
    image:
      "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=400&fit=crop",
    rating: 4.2,
    reviews: 89,
    description: "AC1200 Wi-Fi Access Point with Gigabit port",
    isNew: false,
    isOnSale: false,
    inStock: true,
  },
  {
    id: "tp-link-archer-t2e",
    name: "Archer T2E PCIe Adapter",
    model: "Archer T2E",
    brand: "tp-link",
    category: "tp-link-adapters",
    price: 930,
    currency: "EGP",
    image:
      "https://static.tp-link.com/upload/product-overview/2023/202301/20230116/Archer_T2E_01.png",
    rating: 4.3,
    reviews: 67,
    description: "Dual-band PCIe adapter with speeds up to 633 Mbps",
    isNew: false,
    isOnSale: false,
    inStock: true,
  },
  {
    id: "tp-link-archer-vr2100",
    name: "Archer VR2100 VDSL Router",
    model: "Archer VR2100",
    brand: "tp-link",
    category: "tp-link-dsl",
    price: 2100,
    currency: "EGP",
    image:
      "https://static.tp-link.com/upload/product-overview/2023/202301/20230116/Archer_VR2100_01.png",
    rating: 4.5,
    reviews: 123,
    description: "AC2100 Wi-Fi VDSL/ADSL Modem Router with Beamforming",
    isNew: false,
    isOnSale: false,
    inStock: true,
  },
  {
    id: "tp-link-deco-e4",
    name: "Deco E4 Mesh System",
    model: "Deco E4",
    brand: "tp-link",
    category: "tp-link-mesh",
    price: 6680,
    currency: "EGP",
    image:
      "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=400&fit=crop",
    rating: 4.6,
    reviews: 234,
    description: "Whole-home mesh Wi-Fi system (3-pack) with Deco App",
    isNew: true,
    isOnSale: false,
    inStock: true,
  },
  {
    id: "tp-link-archer-a6",
    name: "Archer A6 AC1200 Router",
    model: "Archer A6",
    brand: "tp-link",
    category: "tp-link-routers-ac",
    price: 2395,
    currency: "EGP",
    image:
      "https://static.tp-link.com/upload/product-overview/2023/202301/20230116/Archer_A6_01.png",
    rating: 4.4,
    reviews: 178,
    description: "AC1200 Wireless MU-MIMO Gigabit Router with Beamforming",
    isNew: false,
    isOnSale: false,
    inStock: true,
  },
  {
    id: "tp-link-wr820n",
    name: "TL-WR820N N300 Router",
    model: "TL-WR820N",
    brand: "tp-link",
    category: "tp-link-routers-n",
    price: 565,
    currency: "EGP",
    image:
      "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=400&fit=crop",
    rating: 4.0,
    reviews: 145,
    description: "N300 Wi-Fi Router with 300Mbps at 2.4GHz",
    isNew: false,
    isOnSale: false,
    inStock: true,
  },
  {
    id: "tp-link-ax10",
    name: "AX10 Wi-Fi 6 Router",
    model: "AX10",
    brand: "tp-link",
    category: "tp-link-routers-wifi6",
    price: 4025,
    currency: "EGP",
    image:
      "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=400&fit=crop",
    rating: 4.7,
    reviews: 289,
    description: "AX1500 Wi-Fi 6 Router with speeds up to 1201 Mbps at 5 GHz",
    isNew: true,
    isOnSale: false,
    inStock: true,
  },

  // Tapo Products
  {
    id: "tapo-a200",
    name: "A200 Smart Hub",
    model: "A200",
    brand: "tapo",
    category: "tapo-accessories",
    price: 1130,
    currency: "EGP",
    image:
      "https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=400&h=400&fit=crop",
    rating: 4.3,
    reviews: 67,
    description: "Smart hub for Tapo ecosystem connectivity",
    isNew: false,
    isOnSale: false,
    inStock: true,
  },
  {
    id: "tapo-c100",
    name: "C100 Home Security Camera",
    model: "C100",
    brand: "tapo",
    category: "tapo-cameras",
    price: 100,
    currency: "EGP",
    image:
      "https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=400&h=400&fit=crop",
    rating: 4.1,
    reviews: 234,
    description: "Basic home security Wi-Fi camera",
    isNew: false,
    isOnSale: true,
    isFeatured: false,
    salePercentage: 25,
    inStock: true,
  },
  {
    id: "tapo-c110",
    name: "C110 3MP Security Camera",
    model: "C110",
    brand: "tapo",
    category: "tapo-cameras",
    price: 1025,
    currency: "EGP",
    image:
      "https://static.tp-link.com/upload/product-overview/2023/202301/20230116/Tapo_C110_01.png",
    rating: 4.5,
    reviews: 345,
    description: "Fixed Home Security Wi-Fi Camera with 3MP resolution",
    isNew: false,
    isOnSale: false,
    inStock: true,
  },
  {
    id: "tapo-c410",
    name: "C410 Battery Camera",
    model: "C410",
    brand: "tapo",
    category: "tapo-cameras-battery",
    price: 3880,
    currency: "EGP",
    image:
      "https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=400&h=400&fit=crop",
    rating: 4.6,
    reviews: 156,
    description: "Wire-free battery security camera for outdoor use",
    isNew: true,
    isOnSale: false,
    inStock: true,
  },
  {
    id: "tapo-c200",
    name: "C200 Pan/Tilt Camera",
    model: "C200",
    brand: "tapo",
    category: "tapo-cameras-pantilt",
    price: 940,
    currency: "EGP",
    image:
      "https://static.tp-link.com/upload/product-overview/2023/202301/20230116/Tapo_C200_01.png",
    rating: 4.4,
    reviews: 278,
    description: "360-Degree Smart Wi-Fi Pan and Tilt Camera, 1080P",
    isNew: false,
    isOnSale: false,
    inStock: true,
  },
  {
    id: "tapo-c120",
    name: "C120 Indoor/Outdoor Camera",
    model: "C120",
    brand: "tapo",
    category: "tapo-cameras-wired",
    price: 2350,
    currency: "EGP",
    image:
      "https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=400&h=400&fit=crop",
    rating: 4.5,
    reviews: 189,
    description: "Smart AI Detection camera for indoor/outdoor use",
    isNew: false,
    isOnSale: false,
    inStock: true,
  },
  {
    id: "tapo-c125",
    name: "C125 Advanced Security Camera",
    model: "C125",
    brand: "tapo",
    category: "tapo-cameras-wired",
    price: 3000,
    currency: "EGP",
    image:
      "https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=400&h=400&fit=crop",
    rating: 4.6,
    reviews: 123,
    description: "Advanced indoor/outdoor camera with AI detection",
    isNew: true,
    isOnSale: false,
    inStock: true,
  },
  {
    id: "tapo-c310",
    name: "C310 Outdoor Security Camera",
    model: "C310",
    brand: "tapo",
    category: "tapo-cameras-outdoor",
    price: 2175,
    currency: "EGP",
    image:
      "https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=400&h=400&fit=crop",
    rating: 4.4,
    reviews: 234,
    description: "Outdoor Security Wi-Fi Camera with Sound and Light Alarm",
    isNew: false,
    isOnSale: false,
    inStock: true,
  },
  {
    id: "tapo-c320ws",
    name: "C320WS 2K Outdoor Camera",
    model: "C320WS",
    brand: "tapo",
    category: "tapo-cameras-outdoor",
    price: 2500,
    currency: "EGP",
    image:
      "https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=400&h=400&fit=crop",
    rating: 4.7,
    reviews: 167,
    description: "2K Outdoor Security Camera with Full Night Color",
    isNew: true,
    isOnSale: false,
    inStock: true,
  },
  {
    id: "tapo-c500",
    name: "C500 Outdoor Pan/Tilt Camera",
    model: "C500",
    brand: "tapo",
    category: "tapo-cameras-outdoor-pantilt",
    price: 2375,
    currency: "EGP",
    image:
      "https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=400&h=400&fit=crop",
    rating: 4.5,
    reviews: 145,
    description: "2MP Outdoor Pan/Tilt Security WiFi Camera",
    isNew: false,
    isOnSale: false,
    inStock: true,
  },
  {
    id: "tapo-c510w",
    name: "C510W Outdoor Camera",
    model: "C510W",
    brand: "tapo",
    category: "tapo-cameras-outdoor-pantilt",
    price: 510,
    currency: "EGP",
    image:
      "https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=400&h=400&fit=crop",
    rating: 4.2,
    reviews: 89,
    description: "Outdoor pan/tilt security camera",
    isNew: false,
    isOnSale: false,
    inStock: true,
  },
  {
    id: "tapo-d230s",
    name: "D230S Smart Doorbell",
    model: "D230S",
    brand: "tapo",
    category: "tapo-doorbells",
    price: 4400,
    currency: "EGP",
    image:
      "https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=400&h=400&fit=crop",
    rating: 4.6,
    reviews: 78,
    description: "Smart video doorbell with advanced features",
    isNew: true,
    isOnSale: false,
    inStock: true,
  },
];

// Helper functions
export const getBrandById = (brandId: string): Brand | undefined => {
  return brands.find((brand) => brand.id === brandId);
};

export const getCategoriesByBrand = (brandId: string): Category[] => {
  return categories.filter((category) => category.brandId === brandId);
};

export const getProductsByCategory = (categoryId: string): Product[] => {
  return products.filter((product) => product.category === categoryId);
};

export const getProductsByBrand = (brandId: string): Product[] => {
  return products.filter((product) => product.brand === brandId);
};

export const getProductById = (productId: string): Product | undefined => {
  return products.find((product) => product.id === productId);
};
