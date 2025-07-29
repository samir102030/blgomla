import { Box, Flex, Text, IconButton, Image, VStack, Spinner, Alert, AlertIcon } from '@chakra-ui/react';
import { CalendarIcon } from '@chakra-ui/icons';
import { useState, useEffect } from 'react';
import { productsAPI } from '../../../utils/api';

interface Product {
  _id: string;
  name: string | { en?: string; [key: string]: any };
  image?: string;
  views: number;
}

const TopViewProduct = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTopProducts = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await productsAPI.getTopViewed();
        // Take only top 3 products for the widget
        setProducts(response.slice(0, 3));
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch top viewed products';
        setError(errorMessage);
        console.error('Error fetching top viewed products:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchTopProducts();
  }, []);

  const getProductName = (name: string | { en?: string; [key: string]: any }) => {
    if (typeof name === 'string') return name;
    return name?.en || 'Unknown Product';
  };

  return (
    <Box bg="white" borderRadius="lg" p={4} boxShadow="md">
      <Flex justify="space-between" align="center" mb={2}>
        <Text fontWeight="bold" fontSize="lg">Top view product</Text>
        <IconButton aria-label="Pick date" icon={<CalendarIcon />} size="sm" />
      </Flex>
      
      {loading ? (
        <Flex justify="center" align="center" h="120px">
          <Spinner size="md" color="#B40519" />
        </Flex>
      ) : error ? (
        <Alert status="error" size="sm">
          <AlertIcon />
          <Text fontSize="sm">{error}</Text>
        </Alert>
      ) : products.length === 0 ? (
        <Box textAlign="center" py={4}>
          <Text fontSize="sm" color="gray.500">No products found</Text>
        </Box>
      ) : (
        <VStack align="stretch" spacing={3} mt={2}>
          {products.map((product, i) => (
            <Flex key={product._id} align="center" gap={3}>
              <Image 
                src={product.image || '/images/admin/image.png'} 
                alt={getProductName(product.name)} 
                boxSize="40px" 
                borderRadius="md" 
                fallbackSrc="/images/admin/image.png"
                objectFit="cover"
              />
              <Text flex={1} fontSize="sm" noOfLines={1}>
                {getProductName(product.name)}
              </Text>
              <Text fontWeight="bold" color="#900414" fontSize="sm">
                {product.views || 0}
              </Text>
            </Flex>
          ))}
        </VStack>
      )}
    </Box>
  );
};

export default TopViewProduct; 