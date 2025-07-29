import { Product } from '../stores/product.store';

// Updated Product interface to align with backend model
export interface ProductModel {
  _id: string;
  name: {
    en: string;
    ar?: string;
    fr?: string;
    de?: string;
    zh?: string;
    es?: string;
    ru?: string;
    ja?: string;
  };
  image?: string;
  brand: string; // This would be ObjectId in the backend
  category: string; // This would be ObjectId in the backend
  description: {
    en: string;
    ar?: string;
    fr?: string;
    de?: string;
    zh?: string;
    es?: string;
    ru?: string;
    ja?: string;
  };
  reviews?: {
    name: string;
    rating: number;
    comment: string;
    user: string;
  }[];
  rating: number;
  numReviews: number;
  isOnSale: boolean;
  saleStartDate?: Date | null;
  saleEndDate?: Date | null;
  tds?: string | null;
  msds?: string | null;
  coa?: string | null;
  specializedCertificate?: string | null;
  chemicalName?: {
    en?: string | null;
    ar?: string;
    fr?: string;
    de?: string;
    zh?: string;
    es?: string;
    ru?: string;
    ja?: string;
  };
  grade?: {
    en?: string | null;
    ar?: string;
    fr?: string;
    de?: string;
    zh?: string;
    es?: string;
    ru?: string;
    ja?: string;
  };
  commercialName?: {
    en?: string | null;
    ar?: string;
    fr?: string;
    de?: string;
    zh?: string;
    es?: string;
    ru?: string;
    ja?: string;
  };
  hsCode?: string | null;
  casNo?: string | null;
  usageApplications?: {
    en?: string | null;
    ar?: string;
    fr?: string;
    de?: string;
    zh?: string;
    es?: string;
    ru?: string;
    ja?: string;
  };
  packingType?: string | null;
  packagingType?: string | null;
  hdPhotos?: string[];
  storage?: {
    en?: string | null;
    ar?: string;
    fr?: string;
    de?: string;
    zh?: string;
    es?: string;
    ru?: string;
    ja?: string;
  };
  safetyStandard?: {
    en?: string | null;
    ar?: string;
    fr?: string;
    de?: string;
    zh?: string;
    es?: string;
    ru?: string;
    ja?: string;
  };
  minimumQuantities?: number | null;
}

// Legacy Product type remains for compatibility with existing components
export const dummyProducts: Product[] = [
  {
    _id: "1",
    name: "paint colors boxes (weighs 5 kilos)",
    price: 299.99,
    category: "Paints",
    brand: "ColorMaster",
    onSale: true,
    description: "A wide variety of industrial and architectural paint colors, with weather and heat resistant formulas.",
    image: "/images/prod1.jpg"
  },
  {
    _id: "2",
    name: "Single-sided adhesive roll (80 laps)",
    price: 149.99,
    category: "Adhesives",
    brand: "StickPro",
    onSale: false,
    description: "A wide variety of industrial and architectural paint colors, with weather and heat resistant formulas.",
    image: "/images/prod2.jpg"
  },
  {
    _id: "3",
    name: "paint brush (250cm)",
    price: 29.99,
    category: "Tools",
    brand: "BrushMaster",
    onSale: true,
    description: "A wide variety of industrial and architectural paint colors, with weather and heat resistant formulas.",
    image: "/images/prod3.png"
  },
  {
    _id: "4",
    name: "paint colors boxes (weighs 1 kilo)",
    price: 79.99,
    category: "Paints",
    brand: "ColorMaster",
    onSale: false,
    description: "A wide variety of industrial and architectural paint colors, with weather and heat resistant formulas.",
    image: "/images/prod4.jpg"
  },
  {
    _id: "5",
    name: "Automotive putty (weighs 1 kilo)",
    price: 89.99,
    category: "Automotive",
    brand: "AutoFix",
    onSale: true,
    description: "A two-component lightweight polyester putty for cars.",
    image: "/images/prod5.jpg"
  }
];

// New aligned products that match the backend schema
export const dummyProductsAligned: ProductModel[] = [
  {
    _id: "1",
    name: {
      en: "paint colors boxes (weighs 5 kilos)",
      ar: "علب ألوان طلاء (وزن 5 كيلو)",
    },
    image: "/images/prod1.jpg",
    brand: "ColorMaster", // In real app this would be ObjectId
    category: "Paints", // In real app this would be ObjectId
    description: {
      en: "A wide variety of industrial and architectural paint colors, with weather and heat resistant formulas.",
      ar: "مجموعة متنوعة من ألوان الطلاء الصناعية والمعمارية، مع تركيبات مقاومة للطقس والحرارة."
    },
    reviews: [
      {
        name: "Muhammad Radwan",
        rating: 5,
        comment: "This is not the first collaboration between Oleo Misr and EGYCHEMHUB to receive and receive products in the shortest time and the easiest way to receive them, so I recommend dealing with them.",
        user: "user123" // This would be ObjectId in real app
      }
    ],
    rating: 5,
    numReviews: 1,
    isOnSale: true,
    saleStartDate: new Date("2024-01-01"),
    saleEndDate: new Date("2024-12-31"),
    tds: "/documents/tds1.pdf",
    msds: "/documents/msds1.pdf",
    coa: "/documents/coa1.pdf",
    specializedCertificate: "/documents/cert1.pdf",
    chemicalName: {
      en: "Paint Color Mix"
    },
    grade: {
      en: "Industrial"
    },
    commercialName: {
      en: "ColorMaster Premium"
    },
    hsCode: "282739",
    casNo: "7705-08-0",
    usageApplications: {
      en: "Construction and Industrial"
    },
    packingType: "Box",
    packagingType: "Box 5 kg",
    hdPhotos: ["/images/hd_prod1_1.jpg", "/images/hd_prod1_2.jpg"],
    storage: {
      en: "Keep in cool, dry place"
    },
    safetyStandard: {
      en: "Low hazard"
    },
    minimumQuantities: 100
  },
  {
    _id: "2",
    name: {
      en: "Single-sided adhesive roll (80 laps)",
      ar: "لفة لاصقة أحادية الجانب (80 دورة)"
    },
    image: "/images/prod2.jpg",
    brand: "StickPro",
    category: "Adhesives",
    description: {
      en: "A wide variety of industrial and architectural paint colors, with weather and heat resistant formulas.",
      ar: "مجموعة متنوعة من المواد اللاصقة الصناعية ذات الجودة العالية."
    },
    reviews: [],
    rating: 0,
    numReviews: 0,
    isOnSale: false,
    chemicalName: {
      en: "Adhesive Compound"
    },
    hsCode: "350691",
    usageApplications: {
      en: "Industrial Binding"
    },
    packagingType: "Roll - 80 laps",
    minimumQuantities: 50
  }
];

export const dummyIndustries = [
  {
    _id: "i1",
    name: "Alkyd",
    category: "Chemical",
    brand: "ChemCorp",
    description: "Modern university alkyd emulsions for paints and industrial applications, featuring fast and irreversible application, and high jackpot potential.",
    image: "/images/industries/chemical.jpg"
  },
  {
    _id: "i2",
    name: "USP – Pharmaceutical Raw Materials",
    category: "Pharmaceutical",
    brand: "PharmaChem",
    description: "Pure chemicals according to the United States Pharmacopoeia (USP) specifications, used in pharmaceuticals and cosmetics",
    image: "/images/industries/pharma.jpg"
  },
  {
    _id: "i3",
    name: "Polyurethanes and Polyisocyanates",
    category: "Chemical",
    brand: "PolyTech",
    description: "Options for coatings and insulation, offering excellent resistance to abrasion and micro-aggressions. New for industrial flooring with ejection.",
    image: "/images/industries/chemical2.jpg"
  },
  {
    _id: "i4",
    name: "Acrylics",
    category: "Chemical",
    brand: "AcrylTech",
    description: "Multi-colored, durable acrylic resins for high-quality paints and coatings, with excellent viscosity and variability.",
    image: "/images/industries/chemical3.jpg"
  },
  {
    _id: "i5",
    name: "Specialty Additives",
    category: "Additives",
    brand: "AdditivePro",
    description: "Approved to improve paint properties such as gloss, colorfastness, and scratch resistance",
    image: "/images/industries/additives.jpg"
  },
  {
    _id: "i6",
    name: "Hydroxyacrylic Acrylic resin",
    category: "Chemical",
    brand: "HydroTech",
    description: "Hydroxylic acid for the final formulations of metal elements, the next generation of high-performance industrial finishes.",
    image: "/images/industries/chemical4.jpg"
  },
  {
    _id: "i7",
    name: "Thermosetting Acrylic",
    category: "Chemical",
    brand: "ThermoTech",
    description: "Thermosetting acrylics are highly malleable and require high heat and flexibility, making them ideal for automotive paints.",
    image: "/images/industries/chemical5.jpg"
  },
  {
    _id: "i8",
    name: "Water Treatment Chemicals",
    category: "Water Treatment",
    brand: "AquaPure",
    description: "Specialized chemicals for water treatment, purification, and maintenance of water systems.",
    image: "/images/industries/water.jpg"
  },
  {
    _id: "i9",
    name: "Oleo Chemicals",
    category: "Oleo",
    brand: "OleoTech",
    description: "Natural-based chemicals derived from plant and animal fats, used in various industrial applications.",
    image: "/images/industries/oleo.jpg"
  },
  {
    _id: "i10",
    name: "Mining Reagents",
    category: "Mining",
    brand: "MineralPro",
    description: "Specialized chemicals used in mineral extraction and processing in the mining industry.",
    image: "/images/industries/mining.jpg"
  },
  {
    _id: "i11",
    name: "Printing Inks",
    category: "Printing",
    brand: "InkMaster",
    description: "High-quality inks and dyes for printing applications, from commercial to specialized industrial printing.",
    image: "/images/industries/printing.jpg"
  },
  {
    _id: "i12",
    name: "Industrial Paint Bases",
    category: "Paints",
    brand: "PaintBase",
    description: "Industrial strength paint bases and components for manufacturing various types of paints and coatings.",
    image: "/images/industries/paints.jpg"
  }
];

// Extended dummy interfaces for product details
interface ProductDetails {
  productName: string;
  chemicalsName: string;
  hsCode: string;
  casNo: string;
  application: string;
  grade: string;
  package: string;
  usage: string;
  certificates: string;
  minimumQuantity: string;
  storage: string;
  hazard: string;
}

export interface Supplier {
  id: string;
  name: string;
  code: string;
  location: string;
  isVerified: boolean;
  hasWorldwideShipping: boolean;
}

export interface Review {
  id: string;
  userName: string;
  position: string;
  company: string;
  content: string;
  avatar: string;
  rating: number;
  date: string;
}

export interface ProductDocument {
  id: string;
  name: string;
  type: 'TDS' | 'MSDS' | 'COA';
  description: string;
}

export interface ExtendedProduct extends Product {
  inStock: boolean;
  rating: number;
  reviewCount: number;
  details: ProductDetails;
  supplier: Supplier;
  reviews: Review[];
  documents: ProductDocument[];
  relatedProductIds: string[];
}

// Create a compatibility function to convert from new schema to old
export const convertToLegacyProduct = (modelProduct: ProductModel): Product => {
  return {
    _id: modelProduct._id,
    name: modelProduct.name.en,
    price: 0, // Price not in backend model, needs to be added separately
    category: modelProduct.category.toString(),
    brand: modelProduct.brand.toString(),
    onSale: modelProduct.isOnSale,
    description: modelProduct.description.en,
    image: modelProduct.image
  };
};

// Keep existing ExtendedProduct data for backward compatibility
export const extendedDummyProducts: ExtendedProduct[] = [
  // First product - paint colors boxes
  {
    _id: "1",
    name: "paint colors boxes (weighs 5 kilos)",
    price: 299.99,
    category: "Paints",
    brand: "ColorMaster",
    onSale: true,
    description: "A wide variety of industrial and architectural paint colors, with weather and heat resistant formulas.",
    image: "/images/prod1.jpg",
    inStock: true,
    rating: 4.3,
    reviewCount: 32,
    details: {
      productName: "paint colors boxes (weighs 5 kilos)",
      chemicalsName: "Paint Color Mix",
      hsCode: "282739",
      casNo: "7705-08-0",
      application: "Construction and Industrial",
      grade: "Industrial",
      package: "Box 5 kg",
      usage: "Paint application",
      certificates: "ISO standard",
      minimumQuantity: "100 boxes",
      storage: "Keep in cool, dry place",
      hazard: "Low hazard"
    },
    supplier: {
      id: "s1",
      name: "ColorMaster Limited",
      code: "CM",
      location: "Egypt, Cairo",
      isVerified: true,
      hasWorldwideShipping: true
    },
    reviews: [
      {
        id: "r1",
        userName: "Muhammad Radwan",
        position: "CEO",
        company: "Oleo Misr Company",
        content: "This is not the first collaboration between Oleo Misr and EGYCHEMHUB to receive and receive products in the shortest time and the easiest way to receive them, so I recommend dealing with them.",
        avatar: "/images/uncle-mohamed.jpg",
        rating: 5,
        date: "2024-02-15"
      }
    ],
    documents: [
      {
        id: "d1",
        name: "Technical Data Sheet",
        type: "TDS",
        description: "Technical specifications and usage guidelines"
      },
      {
        id: "d2",
        name: "Material Safety Data Sheet",
        type: "MSDS",
        description: "Safety information and handling instructions"
      },
      {
        id: "d3",
        name: "Certificate Of Analysis",
        type: "COA",
        description: "Quality analysis and certification"
      }
    ],
    relatedProductIds: ["2", "3", "4"]
  },
  // Second product - adhesive roll
  {
    _id: "2",
    name: "Single-sided adhesive roll (80 laps)",
    price: 149.99,
    category: "Adhesives",
    brand: "StickPro",
    onSale: false,
    description: "A wide variety of industrial and architectural paint colors, with weather and heat resistant formulas.",
    image: "/images/prod2.jpg",
    inStock: true,
    rating: 4.1,
    reviewCount: 28,
    details: {
      productName: "Single-sided adhesive roll (80 laps)",
      chemicalsName: "Adhesive Compound",
      hsCode: "350691",
      casNo: "N/A",
      application: "Industrial Binding",
      grade: "Professional",
      package: "Roll - 80 laps",
      usage: "Industrial adhesive applications",
      certificates: "ISO standard",
      minimumQuantity: "50 rolls",
      storage: "Room temperature, away from direct sunlight",
      hazard: "Low hazard"
    },
    supplier: {
      id: "s2",
      name: "StickPro Industries",
      code: "SP",
      location: "Egypt, Alexandria",
      isVerified: true,
      hasWorldwideShipping: true
    },
    reviews: [
      {
        id: "r2",
        userName: "Ahmed Hassan",
        position: "Production Manager",
        company: "Cairo Industrial",
        content: "Excellent adhesive quality and consistent performance. The delivery was prompt and packaging was secure.",
        avatar: "/images/avatar2.jpg",
        rating: 4,
        date: "2024-02-10"
      }
    ],
    documents: [
      {
        id: "d1",
        name: "Technical Data Sheet",
        type: "TDS",
        description: "Technical specifications and usage guidelines"
      },
      {
        id: "d2",
        name: "Material Safety Data Sheet",
        type: "MSDS",
        description: "Safety information and handling instructions"
      },
      {
        id: "d3",
        name: "Certificate Of Analysis",
        type: "COA",
        description: "Quality analysis and certification"
      }
    ],
    relatedProductIds: ["1", "3", "5"]
  },
  // Third product - paint brush
  {
    _id: "3",
    name: "paint brush (250cm)",
    price: 29.99,
    category: "Tools",
    brand: "BrushMaster",
    onSale: true,
    description: "A wide variety of industrial and architectural paint colors, with weather and heat resistant formulas.",
    image: "/images/prod3.png",
    inStock: true,
    rating: 4.7,
    reviewCount: 42,
    details: {
      productName: "paint brush (250cm)",
      chemicalsName: "N/A",
      hsCode: "960350",
      casNo: "N/A",
      application: "Painting and Coating",
      grade: "Professional",
      package: "Single unit",
      usage: "For applying paint and coating materials",
      certificates: "Quality Certified",
      minimumQuantity: "10 units",
      storage: "Dry storage, clean after use",
      hazard: "None"
    },
    supplier: {
      id: "s3",
      name: "BrushMaster Tools",
      code: "BM",
      location: "Egypt, 6th of October",
      isVerified: true,
      hasWorldwideShipping: false
    },
    reviews: [
      {
        id: "r3",
        userName: "Mahmoud Ali",
        position: "Contractor",
        company: "Ali Construction",
        content: "Excellent quality brush. The bristles don't fall out like cheaper brands and it holds paint well. Perfect for detailed work.",
        avatar: "/images/avatar3.jpg",
        rating: 5,
        date: "2024-01-20"
      },
      {
        id: "r4",
        userName: "Sara Ibrahim",
        position: "Interior Designer",
        company: "Modern Designs",
        content: "The brush performs well on both rough and smooth surfaces. I've used it for several projects and it maintains its shape well.",
        avatar: "/images/avatar4.jpg",
        rating: 4,
        date: "2024-02-05"
      }
    ],
    documents: [
      {
        id: "d1",
        name: "Technical Data Sheet",
        type: "TDS",
        description: "Technical specifications and usage guidelines"
      },
      {
        id: "d2",
        name: "Quality Certificate",
        type: "COA",
        description: "Quality certification and testing results"
      }
    ],
    relatedProductIds: ["1", "4", "5"]
  },
  // Fourth product - small paint colors box
  {
    _id: "4",
    name: "paint colors boxes (weighs 1 kilo)",
    price: 79.99,
    category: "Paints",
    brand: "ColorMaster",
    onSale: false,
    description: "A wide variety of industrial and architectural paint colors, with weather and heat resistant formulas.",
    image: "/images/prod4.jpg",
    inStock: true,
    rating: 4.5,
    reviewCount: 18,
    details: {
      productName: "paint colors boxes (weighs 1 kilo)",
      chemicalsName: "Paint Color Mix - Small",
      hsCode: "282739",
      casNo: "7705-08-0",
      application: "Interior and Small Projects",
      grade: "Standard",
      package: "Box 1 kg",
      usage: "Paint application for smaller projects",
      certificates: "ISO standard",
      minimumQuantity: "200 boxes",
      storage: "Keep in cool, dry place",
      hazard: "Low hazard"
    },
    supplier: {
      id: "s1",
      name: "ColorMaster Limited",
      code: "CM",
      location: "Egypt, Cairo",
      isVerified: true,
      hasWorldwideShipping: true
    },
    reviews: [
      {
        id: "r5",
        userName: "Nour Youssef",
        position: "DIY Enthusiast",
        company: "N/A",
        content: "Perfect size for home projects. The colors mix well and the coverage is excellent even on darker surfaces.",
        avatar: "/images/avatar5.jpg",
        rating: 5,
        date: "2024-03-01"
      },
      {
        id: "r6",
        userName: "Tamer Fouad",
        position: "Maintenance Supervisor",
        company: "Grand Hotel",
        content: "We use these for touch-ups throughout our facilities. Quality is consistent and they store well for long periods.",
        avatar: "/images/avatar6.jpg",
        rating: 4,
        date: "2024-02-18"
      }
    ],
    documents: [
      {
        id: "d1",
        name: "Technical Data Sheet",
        type: "TDS",
        description: "Technical specifications and usage guidelines"
      },
      {
        id: "d2",
        name: "Material Safety Data Sheet",
        type: "MSDS",
        description: "Safety information and handling instructions"
      },
      {
        id: "d3",
        name: "Certificate Of Analysis",
        type: "COA",
        description: "Quality analysis and certification"
      }
    ],
    relatedProductIds: ["1", "3"]
  },
  // Fifth product - automotive putty
  {
    _id: "5",
    name: "Automotive putty (weighs 1 kilo)",
    price: 89.99,
    category: "Automotive",
    brand: "AutoFix",
    onSale: true,
    description: "A two-component lightweight polyester putty for cars.",
    image: "/images/prod5.jpg",
    inStock: true,
    rating: 4.8,
    reviewCount: 37,
    details: {
      productName: "Automotive putty (weighs 1 kilo)",
      chemicalsName: "Polyester Putty",
      hsCode: "321410",
      casNo: "471-34-1",
      application: "Automotive Body Repair",
      grade: "Professional",
      package: "Can 1 kg",
      usage: "Body filler for automotive repairs",
      certificates: "Automotive Industry Standard",
      minimumQuantity: "50 cans",
      storage: "Cool, dry place. Keep tightly sealed",
      hazard: "Medium - Contains volatile compounds"
    },
    supplier: {
      id: "s4",
      name: "AutoFix Chemicals",
      code: "AF",
      location: "Egypt, Suez",
      isVerified: true,
      hasWorldwideShipping: true
    },
    reviews: [
      {
        id: "r7",
        userName: "Khaled Omar",
        position: "Auto Body Technician",
        company: "Elite Auto Shop",
        content: "Best automotive putty on the market. Easy to mix, apply, and sand. Sets quickly and provides excellent adhesion to metal surfaces.",
        avatar: "/images/avatar7.jpg",
        rating: 5,
        date: "2024-01-25"
      },
      {
        id: "r8",
        userName: "Hossam Adel",
        position: "Shop Owner",
        company: "Adel's Garage",
        content: "We've tried many brands and this one consistently performs the best. Very little shrinkage and excellent finish.",
        avatar: "/images/avatar8.jpg",
        rating: 5,
        date: "2024-02-22"
      }
    ],
    documents: [
      {
        id: "d1",
        name: "Technical Data Sheet",
        type: "TDS",
        description: "Technical specifications and usage guidelines"
      },
      {
        id: "d2",
        name: "Material Safety Data Sheet",
        type: "MSDS",
        description: "Safety information and handling instructions"
      },
      {
        id: "d3",
        name: "Certificate Of Analysis",
        type: "COA",
        description: "Quality analysis and certification"
      },
      {
        id: "d4",
        name: "Automotive Certification",
        type: "COA",
        description: "Automotive industry certification"
      }
    ],
    relatedProductIds: ["2", "3"]
  }
];

// Helper functions remain the same
// Helper function to get related products
export const getRelatedProducts = (productId: string): ExtendedProduct[] => {
  const product = extendedDummyProducts.find(p => p._id === productId);
  if (!product) return [];
  
  return product.relatedProductIds
    .map(id => extendedDummyProducts.find(p => p._id === id))
    .filter((p): p is ExtendedProduct => p !== undefined);
};

// Helper function to get product by ID
export const getProductById = (productId: string): ExtendedProduct | undefined => {
  return extendedDummyProducts.find(p => p._id === productId);
};

// Get unique categories from products
export const getUniqueCategories = () => {
  const productCategories = dummyProducts.map(p => p.category);
  
  // Filter to remove duplicates
  return productCategories.filter(
    (category, index, self) => self.indexOf(category) === index
  );
};

// Get unique categories from industries
export const getIndustryCategories = () => {
  const industryCategories = dummyIndustries.map(i => i.category);
  
  // Filter to remove duplicates
  return industryCategories.filter(
    (category, index, self) => self.indexOf(category) === index
  );
};

// Map industry categories to product categories
export const industryToProductCategoryMap: Record<string, string[]> = {
  "Chemical": ["Paints", "Adhesives"],
  "Pharmaceutical": ["Paints"],
  "Additives": ["Paints", "Automotive"],
  "Water Treatment": ["Paints", "Tools"],
  "Oleo": ["Paints", "Adhesives"],
  "Mining": ["Tools"],
  "Printing": ["Paints", "Adhesives"],
  "Paints": ["Paints", "Tools"]
};

// Get product categories related to an industry category
export const getRelatedProductCategories = (industryCategory: string) => {
  return industryToProductCategoryMap[industryCategory] || [];
};

// Get products related to an industry category
export const getProductsByIndustryCategory = (industryCategory: string) => {
  const relatedCategories = getRelatedProductCategories(industryCategory);
  return dummyProducts.filter(product => 
    relatedCategories.includes(typeof product.category === "object" ? product.category.name : product.category)
  );
};

// Get a sample product/industry for each category to use its image
export const getCategoryData = (category: string) => {
  const productSample = dummyProducts.find(p => p.category === category);
  const industrySample = dummyIndustries.find(i => i.category === category);
  return {
    image: productSample?.image || industrySample?.image || '/images/default-category.jpg',
    description: productSample?.description || industrySample?.description || ''
  };
};

// New helper functions to work with the updated model
export const getProductModelById = (productId: string): ProductModel | undefined => {
  return dummyProductsAligned.find(p => p._id === productId);
};

// News and Articles Data
export interface NewsItem {
  id: string;
  type: 'event' | 'news' | 'article';
  title: string;
  description: string;
  shortDescription: string;
  date: string;
  image: string;
  content: string;
  images: string[];
  location?: string;
}

export const dummyNewsAndEvents: NewsItem[] = [
  {
    id: '1',
    type: 'event',
    title: 'EGY CHEM HUB Launches a New Production Line for Heat‑Resistant Paints',
    shortDescription: 'New Step Towards Leadership in the Industrial Market',
    description: 'EGY CHEM HUB has established a strategic partnership with German industry leaders, a significant step in expanding our global footprint.',
    date: 'April 5, 2025',
    image: '/images/news2.jpg',
    content: 'It was a long journey of learning and work that began in 2023. Throughout this journey, we gained deep insights into the German market culture, learned how to access global markets, and also explored the intercultural dynamics between the Arab Republic of Egypt and the Federal Republic of Germany. In Aachen, Germany, at RWTH Aachen University – International Academy, our study and work efforts culminated in outstanding results that exceeded our expectations. Success was achieved, and we gathered at the graduation ceremony, where the team of graduates showcased the real-world successes accomplished since the launch of this program.',
    images: [
      '/images/news2.jpg',
      '/images/event1-1.jpg',
      '/images/event1-2.jpg',
      '/images/event1-3.jpg'
    ],
    location: 'Cairo, Egypt'
  },
  {
    id: '2',
    type: 'news',
    title: 'Partnering in business with Germany (Alumni day)',
    shortDescription: 'Building strong partnerships with international markets',
    description: 'EGY CHEM HUB is proud to announce its partnership with German experts to develop new innovative chemical solutions.',
    date: 'January 12, 2025',
    image: '/images/news1.jpg',
    content: 'It was a long journey of learning and work that began in 2023. Throughout this journey, we gained deep insights into the German market culture, learned how to access global markets, and also explored the intercultural dynamics between the Arab Republic of Egypt and the Federal Republic of Germany. In Aachen, Germany, at RWTH Aachen University – International Academy, our study and work efforts culminated in outstanding results that exceeded our expectations. Success was achieved, and we gathered at the graduation ceremony, where the team of graduates showcased the real-world successes accomplished since the launch of this program.',
    images: [
      '/images/news1.jpg',
      '/images/event2-1.jpg',
      '/images/event2-2.jpg',
      '/images/event2-3.jpg'
    ]
  },
  {
    id: '3',
    type: 'article',
    title: 'Discussion about the B2B business, besides the alumni day',
    shortDescription: 'Towards a shared future in industrial development',
    description: 'EGY CHEM HUB participated in discussions about B2B business strategies and the role of public relations in industrial sectors.',
    date: 'February 5, 2025',
    image: '/images/news3.jpg',
    content: 'During the Alumni ceremony of the Egyptian-German Business Partnership Program, discussions were held regarding B2B and the role of public relations in influencing it. Public relations (PR) play a vital role in promoting industrial businesses. Industrial producers need to maximize their PR reach in terms of promotion and publicity at the lowest possible cost. PR is not just about networking within government and service circles it is also a strategic tool used in marketing and advertising. One of the most important methods for promoting industrial businesses is word-of-mouth, as it is a critical factor in an industrial enterprise\'s reputation. A good reputation can be built through product quality, after-sales service, and many other factors that can be explored in further discussion sessions.',
    images: [
      '/images/news3.jpg',
      '/images/article1-1.jpg',
      '/images/article1-2.jpg',
      '/images/article1-3.jpg'
    ]
  },
  {
    id: '4',
    type: 'event',
    title: 'Strategic Partnerships for Chemical Innovation',
    shortDescription: 'Developing cutting-edge solutions for industry',
    description: 'EGY CHEM HUB forms strategic partnership with other industry leaders in Egypt.',
    date: 'February 27, 2025',
    image: '/images/news4.jpg',
    content: 'EGY CHEM HUB has formed a strategic partnership with leading Egyptian manufacturers to develop innovative chemical solutions for the construction and automotive industries. This collaboration aims to combine expertise and research capabilities to create products that meet international standards while addressing local market needs. The partnership will focus on developing environmentally friendly alternatives to traditional chemical products, supporting Egypt\'s sustainability goals.',
    images: [
      '/images/news4.jpg',
      '/images/event3-1.jpg',
      '/images/event3-2.jpg',
      '/images/event3-3.jpg'
    ],
    location: 'Alexandria, Egypt'
  },
  {
    id: '5',
    type: 'news',
    title: 'EGY CHEM HUB Opens New Research Facility',
    shortDescription: 'Advanced research center for chemical innovation',
    description: 'EGY CHEM HUB has opened a state-of-the-art research facility focused on developing innovative chemical technologies.',
    date: 'March 20, 2025',
    image: '/images/news5.jpg',
    content: 'EGY CHEM HUB has inaugurated a new research and development center equipped with cutting-edge technology and staffed by a team of expert chemists and engineers. The facility will focus on developing new formulations for industrial paints, adhesives, and specialized chemicals. This investment represents our commitment to innovation and maintaining our position as a leader in the chemical industry in Egypt and the Middle East. The research center will also collaborate with universities and international research institutions to stay at the forefront of chemical technology advancements.',
    images: [
      '/images/news5.jpg',
      '/images/news5-1.jpg',
      '/images/news5-2.jpg',
      '/images/news5-3.jpg'
    ]
  },
  {
    id: '6',
    type: 'article',
    title: 'The Future of Sustainable Chemicals in Manufacturing',
    shortDescription: 'Exploring eco-friendly chemical solutions',
    description: 'This article explores the growing trend of sustainable chemicals in manufacturing and EGY CHEM HUB\'s approach to this market.',
    date: 'April 3, 2025',
    image: '/images/news6.jpg',
    content: 'The chemical industry is undergoing a significant transformation as sustainability becomes a central focus for manufacturers and consumers alike. This shift is driven by increasing environmental regulations, consumer demand for eco-friendly products, and corporate sustainability goals. EGY CHEM HUB is embracing this change by developing a new line of bio-based chemicals that offer comparable performance to traditional products while significantly reducing environmental impact. Our research has shown that sustainable chemical alternatives can provide competitive advantages in terms of cost, performance, and market differentiation. This article explores the challenges and opportunities in transitioning to sustainable chemical manufacturing and provides insights into how companies can navigate this evolving landscape.',
    images: [
      '/images/news6.jpg',
      '/images/article2-1.jpg',
      '/images/article2-2.jpg',
      '/images/article2-3.jpg'
    ]
  },
  {
    id: '7',
    type: 'event',
    title: 'Chemical Industry Forum 2025',
    shortDescription: 'Leading discussions on industry innovations',
    description: 'EGY CHEM HUB participated in and sponsored the Chemical Industry Forum 2025, showcasing our latest innovations.',
    date: 'May 18, 2025',
    image: '/images/news7.jpg',
    content: 'EGY CHEM HUB had a prominent presence at the Chemical Industry Forum 2025, where industry leaders gathered to discuss the latest trends, challenges, and opportunities in the chemical sector. Our team presented our new line of heat-resistant paints and environmentally friendly adhesives, which garnered significant interest from potential clients and partners. The forum provided valuable networking opportunities and insights into market demands. Key discussions centered around sustainability, digital transformation in chemical manufacturing, and adapting to changing regulatory environments. EGY CHEM HUB\'s participation reinforces our position as an innovative leader in the regional chemical industry.',
    images: [
      '/images/news7.jpg',
      '/images/event4-1.jpg',
      '/images/event4-2.jpg',
      '/images/event4-3.jpg'
    ],
    location: 'Helnan Landmark Hotel, Cairo'
  },
  {
    id: '8',
    type: 'news',
    title: 'EGY CHEM HUB Receives Industry Excellence Award',
    shortDescription: 'Recognition for innovation and quality',
    description: 'EGY CHEM HUB has been awarded the Industry Excellence Award for our innovative chemical solutions and commitment to quality.',
    date: 'April 28, 2024',
    image: '/images/news8.jpg',
    content: 'EGY CHEM HUB has been honored with the prestigious Industry Excellence Award, recognizing our commitment to innovation, quality, and customer satisfaction. The award, presented by the Egyptian Chamber of Chemical Industries, acknowledges our contributions to advancing the chemical industry through research and development of cutting-edge products. Our specialized heat-resistant paints and eco-friendly adhesives were particularly highlighted for their superior performance and environmental benefits. This recognition reflects our team\'s dedication to excellence and reinforces our position as a leading chemical manufacturer in the region.',
    images: [
      '/images/news8.jpg',
      '/images/news8-1.jpg',
      '/images/news8-2.jpg',
      '/images/news8-3.jpg'
    ]
  },
  {
    id: '9',
    type: 'article',
    title: 'The Role of Chemistry in Modern Construction',
    shortDescription: 'How chemical innovations are transforming building methods',
    description: 'This article explores the critical role of chemical products in modern construction techniques and sustainable building practices.',
    date: 'April 15, 2024',
    image: '/images/news9.jpg',
    content: 'Modern construction has been revolutionized by advancements in chemical technology, enabling buildings that are stronger, more energy-efficient, and more sustainable. From concrete admixtures that enhance durability to innovative insulation materials that improve energy performance, chemistry is at the heart of construction innovation. EGY CHEM HUB has been at the forefront of developing specialized chemical solutions for the construction industry, including water-resistant coatings, high-performance adhesives, and environmentally friendly paints. This article examines the various applications of chemical products in construction, their benefits, and the future trends that will continue to transform building methods. We also explore how these innovations contribute to meeting sustainability goals and addressing the challenges of modern urban development.',
    images: [
      '/images/news9.jpg',
      '/images/article3-1.jpg',
      '/images/article3-2.jpg',
      '/images/article3-3.jpg'
    ]
  },
];

// Helper functions for news and events
export const getAllNewsAndEvents = () => dummyNewsAndEvents;

export const getNewsItems = () => dummyNewsAndEvents.filter(item => item.type === 'news');

export const getArticles = () => dummyNewsAndEvents.filter(item => item.type === 'article');

export const getEvents = () => dummyNewsAndEvents.filter(item => item.type === 'event');

export const getNewsItemById = (id: string) => dummyNewsAndEvents.find(item => item.id === id);