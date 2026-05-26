export interface Category {
  _id: string;
  name: string;
  nameAr?: string;
  description?: string;
  descriptionAr?: string;
  image?: string;
  parentCategory?: string | Category; // ObjectId as string or populated Category
  subCategories?: Category[];
  productCount?: number;
  isActive: boolean;
  deleted: boolean;
  slug?: string;
  metaTitle?: string;
  metaDescription?: string;
  sortOrder?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CategoryTree extends Category {
  children: CategoryTree[];
  level: number;
}

export interface CategoryStats {
  totalCategories: number;
  activeCategories: number;
  deletedCategories: number;
  categoriesWithProducts: number;
  topCategories: Array<{
    category: Category;
    productCount: number;
  }>;
}
