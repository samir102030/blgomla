import React, { useState } from 'react';
import { 
  Box, 
  Container, 
  Heading, 
  Flex, 
  Text, 
  HStack, 
  Button,
  SimpleGrid,
} from '@chakra-ui/react';
import { useTranslation } from 'react-i18next';
import SearchBar from '../components/marketplace/SearchBar';
import RequestSample from './RequestSample';
import { dummyProducts } from '../data/dummyData';
import ProductListItem from '../components/products/ProductListItem';
import CustomerPreviews from '../components/home/CustomerPreviews';
import { useNavigate } from 'react-router-dom';

const ContactUs = () => {
  const [activeSection, setActiveSection] = useState<'request' | 'products'>('request');
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <Box>
      {/* Get in Touch Section - Now the first section */}
      <Box bg="brand.primary" color="white" py={10} mt={4}>
        <Container maxW="container.xl">
          <Flex 
            direction={{ base: "column", md: "row" }} 
            justify="space-between" 
            align={{ base: "flex-start", md: "center" }}
            gap={4}
          >
            <Heading size="lg">{t('contactGetInTouch')}</Heading>
            <HStack spacing={4} flexWrap={{ base: "wrap", md: "nowrap" }}>
              <Button 
                leftIcon={<Box as="span" fontSize="xl">📞</Box>}
                variant="outline" 
                color="white"
                borderColor="white"
              >
                {t('contactPhone')}
              </Button>
              <Button 
                leftIcon={<Box as="span" fontSize="xl">✉️</Box>}
                variant="outline" 
                color="white"
                borderColor="white"
              >
                {t('contactEmail2')}
              </Button>
            </HStack>
          </Flex>
        </Container>
      </Box>

      {/* Request Sample / Products Switcher */}
      <Container maxW="container.xl" py={8}>
        <Box px={4} mb={8}>
          <Flex justify="center" mb={6}>
            <HStack spacing={4}>
              <Button
                variant={activeSection === 'request' ? 'solid' : 'outline'}
                colorScheme="red"
                onClick={() => setActiveSection('request')}
              >
                {t('contactRequestSample')}
              </Button>
              <Button
                variant={activeSection === 'products' ? 'solid' : 'outline'}
                colorScheme="red"
                onClick={() => navigate("/products")}
                // onClick={() => setActiveSection('products')}
              >
                {t('contactOurProducts')}
              </Button>
            </HStack>
          </Flex>

          {/* Search Bar */}
          {/* <Heading size="lg" mb={4}>Search Result For</Heading>
          <SearchBar /> */}
        </Box>

        {/* Request Sample or Products Section */}
        {activeSection === 'request' ? (
          <RequestSample />
        ) : (
          <SimpleGrid columns={1} spacing={4}>
            {dummyProducts.map((product) => (
              <ProductListItem
                key={product._id}
                item={product}
                type="product"
              />
            ))}
          </SimpleGrid>
        )}
      </Container>

      {/* Services We Provide */}
      <Box px={4} my={10} bg="gray.50" py={12}>
        <Container maxW="container.xl">
          <Heading textAlign="center" mb={8}>{t('contactServicesWeProvide')}</Heading>
          <SimpleGrid columns={{ base: 1, md: 3 }} spacing={6}>
            {[
              {
                title: t('contactServicesProducts'),
                description: t('contactServicesProductsDesc')
              },
              {
                title: t('contactServicesSaving'),
                description: t('contactServicesSavingDesc')
              },
              {
                title: t('contactServicesSample'),
                description: t('contactServicesSampleDesc')
              }
            ].map((service, index) => (
              <Box 
                key={index}
                bg="white" 
                p={6} 
                borderRadius="md" 
                boxShadow="md"
                textAlign="center"
              >
                <Heading size="md" mb={4} color="brand.primary">
                  {service.title}
                </Heading>
                <Text>{service.description}</Text>
              </Box>
            ))}
          </SimpleGrid>
        </Container>
      </Box>
      {/* Customer Previews Section */}
      <CustomerPreviews />
    </Box>
  );
};

export default ContactUs;
