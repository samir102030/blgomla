import { Box, Heading, Divider, Text } from '@chakra-ui/react';
import ProductListItem from './ProductListItem';
import { dummyProducts, dummyProductsAligned, convertToLegacyProduct } from '../../data/dummyData';

/**
 * Example component showing how to use both the old and new product models
 */
const ProductUsageExample = () => {
  // Using the old product model (directly)
  const oldProductExample = dummyProducts[0];
  
  // Using the new product model (with conversion)
  const newProductExample = dummyProductsAligned[0];
  const convertedProduct = convertToLegacyProduct(newProductExample);

  return (
    <Box p={4}>
      <Heading size="lg" mb={4}>Product Models Examples</Heading>
      
      <Text fontWeight="bold" mb={2}>Original Product Model:</Text>
      <ProductListItem item={oldProductExample} type="product" />
      
      <Divider my={4} />
      
      <Text fontWeight="bold" mb={2}>New Backend-aligned Product Model (converted):</Text>
      <ProductListItem item={convertedProduct} type="product" />
      
      <Divider my={4} />
      
      <Text mb={4}>
        This example demonstrates how to work with both the legacy Product model and 
        the new ProductModel that aligns with the backend schema. The adapter pattern
        allows us to use the same UI components with both data models.
      </Text>
    </Box>
  );
};

export default ProductUsageExample; 