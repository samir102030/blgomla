export interface Category {
  _id: string;
  name: string;
  nameAr?: string;
  description?: string;
  descriptionAr?: string;
  image?: string;
  /*
    An id, a populated category, or null.

    `null` is what a root category actually carries — it is the schema's
    default, and every list response says so — and it is also the value the
    editor sends to clear a parent. Leaving it out of the type meant the one
    assignment that promotes a subcategory back to a department did not
    typecheck, which is a fair warning about a value the API returns on most
    of its rows.

    Every reader here already handles it: they test the value for truthiness
    before deciding whether it is an id or an object, which is necessary
    anyway because `typeof null` is `"object"`.
  */
  parentCategory?: string | Category | null;
  subCategories?: Category[];
  productCount?: number;
  isActive: boolean;
  // Whether the storefront's category menu lists it. Independent of isActive:
  // a live, browsable category can still be kept out of the menu.
  showInMenu?: boolean;
  /** A slot on the department strip under the navbar. Off unless switched on. */
  showInBar?: boolean;
  /** Where it sits on that strip. Independent of sortOrder, which arranges the
   *  menus; 0 means "unset" and falls back to sortOrder. */
  barOrder?: number;
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
