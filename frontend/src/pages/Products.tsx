import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
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
  // Badge,
  Skeleton,
  Text,
  Input,
  InputGroup,
  InputLeftElement,
  Select,
} from '@chakra-ui/react';
import { ChevronLeftIcon, SearchIcon } from '@chakra-ui/icons';
// import SearchBar from '../components/marketplace/SearchBar';
// import CategoryGrid from '../components/products/CategoryGrid';
import ProductListItem from '../components/products/ProductListItem';
import { useProductStore } from '../stores/product.store';
import { useUserStore } from '../stores/user.store';
import { useTranslation } from 'react-i18next';
import { useLanguageDirection } from '../hooks/useLanguageDirection';

const Products = () => {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredByIndustry, setFilteredByIndustry] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState('name');
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const { dir, isRTL } = useLanguageDirection();
  
  const searchParams = new URLSearchParams(location.search);
  const industryCategory = searchParams.get('industryCategory');
  const lang = useUserStore(state => state.lang);
  // console.log(industryCategory);
  // console.log(searchParams);
  
  const isIndustriesRoute = location.pathname === '/industries';
  const defaultTabIndex = isIndustriesRoute ? 1 : 0;

  const { products, loading, getAllProducts } = useProductStore();

  useEffect(() => {
    getAllProducts();
  }, [getAllProducts, lang]);

  useEffect(() => {
    if (industryCategory) {
      setFilteredByIndustry(industryCategory);
    }
  }, [industryCategory]);

  const handleCategorySelect = (category: string) => {
    setSelectedCategory(category);
  };

  const handleTabChange = (index: number) => {
    setFilteredByIndustry(null);
    if (index === 0) {
      navigate('/products');
    } else {
      navigate('/industries');
    }
  };

  // Filter and sort products
  const filteredProducts = products
    .filter(product => {
      // Industry category filter
      if (filteredByIndustry) {
        const category = product.category;
        if (typeof category === 'object' && category !== null && 'name' in category) {
          return category.name.toLowerCase() === filteredByIndustry.toLowerCase();
        }
        if (typeof category === 'string') {
          return category.toLowerCase() === filteredByIndustry.toLowerCase();
        }
        return false;
      }

      const matchesSearch = product.name?.toLowerCase().includes(searchTerm?.toLowerCase()) ||
                          product.description?.toLowerCase().includes(searchTerm?.toLowerCase());
      const matchesCategory = !selectedCategory || (typeof product.category === 'string' && product.category === selectedCategory);
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'price-asc':
          return a.price - b.price;
        case 'price-desc':
          return b.price - a.price;
        default:
          return 0;
      }
    });

  return (
    <Container maxW="container.xl" py={8} dir={dir}>
      <Box px={4} mb={8}>
        <Heading size="lg" mb={4} textAlign={isRTL ? 'right' : 'left'}>
          {filteredByIndustry ? t('productsForIndustry', { industry: filteredByIndustry }) : t('productsTitle')}
        </Heading>
        <Flex gap={4} mb={6} direction={isRTL ? 'row-reverse' : 'row'}>
          <InputGroup maxW="400px">
            <InputLeftElement pointerEvents="none">
              <SearchIcon color="gray.400" />
            </InputLeftElement>
            <Input
              placeholder={t('productsSearchPlaceholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              borderRadius="full"
              textAlign={isRTL ? 'right' : 'left'}
            />
          </InputGroup>
          {/* <Select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            maxW="200px"
            borderRadius="full"
            textAlign={isRTL ? 'right' : 'left'}
          >
            <option value="name">{t('productsSortByName')}</option>
            <option value="price-asc">{t('productsSortPriceLowToHigh')}</option>
            <option value="price-desc">{t('productsSortPriceHighToLow')}</option>
          </Select> */}
        </Flex>
      </Box>

      {!filteredByIndustry && (
        <Tabs index={defaultTabIndex} onChange={handleTabChange} variant="soft-rounded" colorScheme="red" mb={6}>
          <TabList>
            <Tab>{t('productsTab')}</Tab>
            <Tab>{t('industriesTab')}</Tab>
          </TabList>
        </Tabs>
      )}

      {filteredByIndustry && (
        <Box mb={6}>
          <Flex align="center" gap={2} mb={4} direction={isRTL ? 'row-reverse' : 'row'}>
            <Button 
              variant="outline" 
              leftIcon={isRTL ? undefined : <ChevronLeftIcon />}
              rightIcon={isRTL ? <ChevronLeftIcon /> : undefined}
              onClick={() => {
                setFilteredByIndustry(null);
                navigate('/industries');
              }}
              size="sm"
            >
              {t('productsBackToIndustries')}
            </Button>
          </Flex>
        </Box>
      )}

      <Box px={4}>
        {loading ? (
          <SimpleGrid columns={[1, null, 2]} spacing={6}>
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} height="200px" borderRadius="lg" />
            ))}
          </SimpleGrid>
        ) : filteredProducts.length === 0 ? (
          <Box textAlign="center" py={10}>
            <Text fontSize="xl" color="gray.500">
              {t('productsNoProductsFound')}
            </Text>
          </Box>
        ) : (
          <SimpleGrid columns={[1, null, 2]} spacing={8}>
            {filteredProducts.map((product) => (
              <ProductListItem
                key={product._id}
                item={product}
                type="product"
              />
            ))}
          </SimpleGrid>
        )}
      </Box>
    </Container>
  );
};

export default Products;