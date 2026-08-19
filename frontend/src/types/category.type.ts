export interface Category {
  _id: string;
  name: string;
  nameAr?: string;
  description?: string;
  descriptionAr?: string;
  image?: string;
  // ObjectId as string, or the populated Category. null is what a root actually
  // carries — the model defaults the field to null and the API sends it back
  // that way — and it is also how a move to the top level is requested, since
  // undefined would be dropped from the JSON body and clear nothing.
  parentCategory?: string | Category | null;
  subCategories?: Category[];
  productCount?: number;
  isActive: boolean;
  // Whether the storefront's category menu lists it. Independent of isActive:
  // a live, browsable category can still be kept out of the menu.
  showInMenu?: boolean;
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
