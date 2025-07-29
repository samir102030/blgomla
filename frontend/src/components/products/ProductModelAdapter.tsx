import { ReactNode } from 'react';
import { Product } from '../../stores/product.store';
import { ProductModel, convertToLegacyProduct } from '../../data/dummyData';

type ProductProps<T> = {
  product: T;
  children: (product: Product) => ReactNode;
};

/**
 * ProductModelAdapter - A component that can adapt between different product models
 * 
 * This component provides compatibility between the backend model (ProductModel) and
 * the frontend model (Product) that's used by existing components.
 * 
 * Usage example:
 * <ProductModelAdapter product={productModelData}>
 *   {(adaptedProduct) => <ProductListItem item={adaptedProduct} type="product" />}
 * </ProductModelAdapter>
 */
export const ProductModelAdapter = <T extends ProductModel | Product>({ 
  product, 
  children 
}: ProductProps<T>) => {
  // Check if we need to adapt the product (if it's the new model)
  const isNewModel = product && 'name' in product && typeof product.name === 'object';
  
  if (isNewModel) {
    // Convert from new model to old model that components expect
    const adaptedProduct = convertToLegacyProduct(product as ProductModel);
    return <>{children(adaptedProduct)}</>;
  }
  
  // Already in the expected format
  return <>{children(product as Product)}</>;
};

export default ProductModelAdapter; 