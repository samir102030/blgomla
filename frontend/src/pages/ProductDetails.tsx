import { useEffect, useState } from 'react';
import {
Box,
Container,
Grid,
GridItem,
Text,
Badge,
HStack,
Image,
SimpleGrid,
Flex,
} from '@chakra-ui/react';
import { StarIcon } from '@chakra-ui/icons';
// import { useParams } from 'react-router-dom';
// import { getProductById, getRelatedProducts } from '../data/dummyData';
import ProductSpecification from '../components/products/ProductSpecification';
import ProductDocuments from '../components/products/ProductDocuments';
import ProductReview from '../components/products/ProductReview';
import SupplierInfo from '../components/products/SupplierInfo';
import ProductCard from '../components/marketplace/ProductCard';
// import { useProductStore } from '../stores/product.store';
import { getEn } from '../utils/getEn';
import { Product } from '../stores/product.store';

interface ProductDetailsProps {
  product: Product | null;
  categoryProducts: Product[];
}

const ProductDetails = ({ product, categoryProducts }: ProductDetailsProps) => {
  const [currentReviewIndex, setCurrentReviewIndex] = useState(0);

  if (!product) {
    return <Box>Product not found</Box>;
  }
  // console.log("pro1 ", pro1)

  return (
    <Container maxW="container.xl" py={8}>
      {/* Product Header Section with Two Columns */}
      <Grid templateColumns={{ base: '1fr', lg: '3fr 1fr' }} gap={8} mb={8}>
        {/* Left Column - Product Details */}
        <GridItem>
          <Flex align="start" gap={4} mb={6}>
            <Box flex={1}>
              {/* <Badge colorScheme="green" mb={2}>
                {product.inStock ? 'In stock' : 'Out of stock'}
              </Badge> */}
              <Badge colorScheme="green" mb={2}>
                {typeof product?.category === "object" && product.category.name}
              </Badge>
              {product?.saleStartDate && product?.saleEndDate && (() => {
                const now = new Date();
                const start = new Date(product.saleStartDate!);
                const end = new Date(product.saleEndDate!);
                if (now >= start && now <= end) {
                  return (
                    <Badge colorScheme="red" mb={2} ml={2}>
                      On Sale
                    </Badge>
                  );
                }
                return null;
              })()}
              <Text fontSize="2xl" fontWeight="bold" mb={2}>
                {getEn(product?.name)}
              </Text>
              <HStack spacing={2}>
                {/* <HStack spacing={1}>
                  {Array(5).fill('').map((_, i) => (
                    <StarIcon
                      key={i}
                      color={i < (pro1?.rating || 0) ? 'yellow.400' : 'gray.300'}
                    />
                  ))}
                </HStack>
                <Text color="gray.600">{pro1?.rating}</Text>
                <Text color="gray.400">|</Text>
                <Text color="gray.600">{pro1?.numReviews} reviews</Text> */}
              </HStack>
            </Box>
          </Flex>

          <Grid templateColumns={{ base: '1fr', md: '1fr 1fr' }} gap={8}>
            <Box borderRadius="lg" overflow="hidden" bg="white" p={6}>
              <Image
                src={product?.image}
                alt={getEn(product?.name)}
                width="full"
                height="auto"
              />
            </Box>
            
            <Box>
              {product && Object.entries(product).filter(([key]) => 
              !['_id', 'image', "salePercentage", "rating", "numReviews", "saleStartDate", "saleEndDate", "views"]
              .includes(key)).map(([key, value]) => (
                (typeof value ==="string" || typeof value === "number")&& <ProductSpecification
                  key={key}
                  label={key}
                  value={String(value)}
                />
              ))}
            </Box>
          </Grid>
        </GridItem>

        {/* Right Column - Supplier Information */}
        {typeof product?.brand === "object" && <GridItem>
          <SupplierInfo supplier={product.brand} /> 
        </GridItem>}
      </Grid>

      {/* Full Width Sections */}
      <Box>
        {/* Documents Section */}
        <Box mb={8}>
          {product?._id && <ProductDocuments productId={product._id} />}
        </Box>

        {/* Reviews Section */}
        {/* <Box mb={8}>
          <Text fontSize="xl" fontWeight="bold" mb={4}>
            Top reviews
          </Text>
          <ProductReview
            review={product.reviews[currentReviewIndex]}
            onPrevious={() => setCurrentReviewIndex((prev) => 
              (prev - 1 + product.reviews.length) % product.reviews.length
            )}
            onNext={() => setCurrentReviewIndex((prev) => 
              (prev + 1) % product.reviews.length
            )}
          />
        </Box> */}

        {/* Related Products */}
        <Box>
          <Text fontSize="xl" fontWeight="bold" mb={4}>
            Related products
          </Text>
          <SimpleGrid columns={{ base: 2, md: 4 }} spacing={4}>
            {categoryProducts &&  categoryProducts.map((relatedProduct: Product) => (
              <ProductCard
                key={relatedProduct._id}
                _id={relatedProduct._id}
                name={getEn(relatedProduct.name)}
                price={relatedProduct.price}
                category={relatedProduct.category}
                description={getEn(relatedProduct.description)}
                image={relatedProduct.image || ''}
                rating={relatedProduct.rating}
              />
            ))}
          </SimpleGrid>
        </Box>
      </Box>
    </Container>
  );
};

export default ProductDetails;