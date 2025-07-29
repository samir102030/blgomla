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
  Heading,
  Button,
  Divider,
} from '@chakra-ui/react';
import { ChevronLeftIcon } from '@chakra-ui/icons';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  dummyIndustries, 
  getProductsByIndustryCategory, 
  getRelatedProductCategories 
} from '../data/dummyData';
import ProductCard from '../components/marketplace/ProductCard';
import { getEn } from '../utils/getEn';

const IndustryDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const industry = dummyIndustries.find(i => i._id === id);
  
  if (!industry) {
    return <Box>Industry not found</Box>;
  }

  const relatedCategories = getRelatedProductCategories(industry.category);
  const relatedProducts = getProductsByIndustryCategory(industry.category);

  return (
    <Container maxW="container.xl" py={8}>
      {/* Industry Header Section */}
      <Button
        leftIcon={<ChevronLeftIcon />}
        variant="outline"
        mb={6}
        onClick={() => navigate('/industries')}
      >
        Back to Industries
      </Button>
      
      <Grid templateColumns={{ base: '1fr', lg: '3fr 1fr' }} gap={8} mb={8}>
        {/* Left Column - Industry Details */}
        <GridItem>
          <Flex align="start" gap={4} mb={6}>
            <Box flex={1}>
              <Badge colorScheme="blue" mb={2}>
                {industry.category}
              </Badge>
              <Heading as="h1" size="xl" mb={2}>
                {industry.name}
              </Heading>
              <Text color="gray.600">
                Brand: {industry.brand}
              </Text>
            </Box>
          </Flex>

          <Grid templateColumns={{ base: '1fr', md: '1fr 1fr' }} gap={8}>
            <Box borderRadius="lg" overflow="hidden" bg="white" p={6}>
              <Image
                src={industry.image}
                alt={industry.name}
                width="full"
                height="auto"
              />
            </Box>
            
            <Box>
              <Heading as="h3" size="md" mb={4}>Description</Heading>
              <Text>{industry.description}</Text>
              
              <Divider my={4} />
              
              <Heading as="h3" size="md" mb={4}>Related Categories</Heading>
              <Flex gap={2} wrap="wrap">
                {relatedCategories.map(category => (
                  <Badge 
                    key={category} 
                    colorScheme="red" 
                    fontSize="md" 
                    py={1} 
                    px={3} 
                    borderRadius="full"
                    cursor="pointer"
                    onClick={() => navigate(`/products?industryCategory=${industry.category}`)}
                  >
                    {category}
                  </Badge>
                ))}
              </Flex>
            </Box>
          </Grid>
        </GridItem>

        {/* Right Column - Information */}
        <GridItem>
          <Box bg="blue.50" p={6} borderRadius="md">
            <Heading as="h3" size="md" mb={4}>Industry Information</Heading>
            <HStack mb={2}>
              <Text fontWeight="bold">Category:</Text>
              <Text>{industry.category}</Text>
            </HStack>
            <HStack mb={2}>
              <Text fontWeight="bold">Brand:</Text>
              <Text>{industry.brand}</Text>
            </HStack>
            <Button 
              mt={4} 
              colorScheme="blue" 
              width="full"
              onClick={() => navigate(`/products?industryCategory=${industry.category}`)}
            >
              View Related Products
            </Button>
          </Box>
        </GridItem>
      </Grid>

      {/* Related Products */}
      {relatedProducts.length > 0 && (
        <Box>
          <Heading as="h2" size="lg" mb={4}>
            Related Products
          </Heading>
          <SimpleGrid columns={{ base: 2, md: 4 }} spacing={4}>
            {relatedProducts.map((product) => (
              <ProductCard
                key={product._id}
                _id={product._id}
                name={getEn(product.name)}
                price={product.price}
                category={product.category}
                onSale={product.onSale}
                description={getEn(product.description) || ''}
                image={product.image || ''}
                rating={0}
              />
            ))}
          </SimpleGrid>
        </Box>
      )}
    </Container>
  );
};

export default IndustryDetails; 