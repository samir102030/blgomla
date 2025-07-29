import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Heading,
  Flex,
  Button,
  SimpleGrid,
  Tabs,
  TabList,
  Tab,
  Badge,
  Skeleton,
  Text,
  Input,
  InputGroup,
  InputLeftElement,
  IconButton,
  Modal,
  ModalOverlay,
  ModalContent,
} from '@chakra-ui/react';
import { ChevronLeftIcon, SearchIcon, ViewIcon } from '@chakra-ui/icons';
import ProductListItem from '../components/products/ProductListItem';
import { useProductStore } from '../stores/product.store';
import { useUserStore } from '../stores/user.store';
import { useTranslation } from 'react-i18next';

const Industries = () => {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();
  const { t } = useTranslation();
  

  const { categories, loading, getAllCategories } = useProductStore();
  const lang = useUserStore(state => state.lang)

  useEffect(() => {
    getAllCategories();
  }, [getAllCategories, lang]);

  const handleCategorySelect = (category: string) => {
    setSelectedCategory(category);
  };

  const handleTabChange = (index: number) => {
    if (index === 0) {
      navigate('/products');
    } else {
      navigate('/industries');
    }
  };
  // Filter categories based on search term
  const filteredCategories = categories;
  // const filteredCategories = categories.filter(category => 
  //   typeof category === "object" ? category.name[lang]?.toLowerCase().includes(searchTerm.toLowerCase()) : category
  // );
  // console.log(typeof filteredCategories[0])
  // filteredCategories.forEach(category => console.log(typeof category === "object" ? category.name : "SSS"));
  return (
    <Container maxW="container.xl" py={8}>
      <Box px={4} mb={8}>
        <Heading size="lg" mb={4}>{t('industriesTitle')}</Heading>
        <InputGroup maxW="400px">
          <InputLeftElement pointerEvents="none">
            <SearchIcon color="gray.400" />
          </InputLeftElement>
          <Input
            placeholder={t('industriesSearchPlaceholder')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            borderRadius="full"
          />
        </InputGroup>
      </Box>

      <Tabs index={1} onChange={handleTabChange} variant="soft-rounded" colorScheme="red" mb={6}>
        <TabList>
          <Tab>{t('productsTab')}</Tab>
          <Tab>{t('industriesTab')}</Tab>
        </TabList>
      </Tabs>

      <Box px={4}>
        {loading ? (
          <SimpleGrid columns={[1, 2, 3]} spacing={6}>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} height="200px" borderRadius="lg" />
            ))}
          </SimpleGrid>
        ) : filteredCategories.length === 0 ? (
          <Box textAlign="center" py={10}>
            <Text fontSize="xl" color="gray.500">
              {t('industriesNoCategoriesFound')}
            </Text>
          </Box>
        ) : (
          <SimpleGrid columns={[1, 2, 3]} spacing={6}>
            {filteredCategories.map((category) => (
    
              <Box
                key={category._id}
                borderWidth="1px"
                borderRadius="lg"
                overflow="hidden"
                bg="white"
                transition="all 0.2s"
                _hover={{ transform: 'translateY(-2px)', shadow: 'lg' }}
                boxShadow="sm"
                cursor="pointer"
                onClick={() => navigate(`/products?industryCategory=${category.name}`)} // error
              >
                <Box position="relative" h="200px">
                  <Box
                    position="absolute"
                    inset={0}
                    bgImage={`url(${category.image || '/images/admin/image.png'})`}
                    bgSize="cover"
                    bgPosition="center"
                    transition="transform 0.2s"
                    _groupHover={{ transform: 'scale(1.05)' }}
                  />
                  <Box
                    position="absolute"
                    inset={0}
                    bg="blackAlpha.600"
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                  >
                    <Text
                      color="white"
                      fontSize="xl"
                      fontWeight="bold"
                      textAlign="center"
                      px={4}
                    >
                      {typeof category === "object" ? category.name : category}
                    
                    </Text>
                  </Box>
                </Box>
              </Box>
            ))}
          </SimpleGrid>
        )}
      </Box>
    </Container>
  );
};

export default Industries; 