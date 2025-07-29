import React, { FC, useEffect } from 'react'
import { 
  Box, 
  Heading, 
  SimpleGrid, 
  Container, 
  Flex,
  Button,
} from '@chakra-ui/react'
import { useTranslation } from 'react-i18next'
import FeatureStrip from './FeatureStrip'
import SearchBar from './SearchBar'
import ProductCategories from './ProductCategories'
import ProductCard, { ProductCardProps } from './ProductCard'
import { useProductStore } from '../../stores/product.store'
import { useNavigate } from 'react-router-dom';
import { getEn } from '../../utils/getEn';
import { useLanguageDirection } from '../../hooks/useLanguageDirection';
import { useConsoleLog } from '../../hooks/useConsoleLog';


const Marketplace: FC = () => {
  const itemsOnSale = useProductStore((state) => state.saleProducts);
  const getProductsOnSale = useProductStore((state) => state.getProductsOnSale);
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { dir, isRTL } = useLanguageDirection();
  const { log } = useConsoleLog();

  
  useEffect(() => {
    getProductsOnSale();
  }, [getProductsOnSale]);

  // Add debugging to see what's happening
  useEffect(() => {
    log('Items on sale from store:', itemsOnSale, { dependencies: [itemsOnSale?.length] });
  }, [itemsOnSale, log]);

  return (
    <Box dir={dir}>
      <FeatureStrip />

      <Container maxW="container.xl" py={8}>
        {/* Products heading and search bar */}
        <Flex align="center" gap={4} px={4} mb={8} direction={isRTL ? 'row-reverse' : 'row'}>
          <Heading size="lg" minW="fit-content" textAlign={isRTL ? 'right' : 'left'}>{t('marketplaceProducts')}</Heading>
          {/* <SearchBar /> */}
        </Flex>

        <Box px={4} mb={8}>
          <ProductCategories />
        </Box>

        {/* Items on Sale header + View All button */}
        <Box mt={12} px={4}>
          <Flex justify="space-between" align="center" mb={4} direction={isRTL ? 'row-reverse' : 'row'}>
            <Heading size="lg" textAlign={isRTL ? 'right' : 'left'}>{t('marketplaceItemsOnSale')}</Heading>
            <Button
              variant="outline"
              color="gray.600"
              borderColor="gray.300"
              borderWidth="1px"
              borderRadius="full"
              px={6}
              py={2}
              _hover={{ bg: 'gray.50' }}
              _active={{ bg: 'gray.100' }}
              onClick={() => {navigate("/products"); window.scroll({top:0, behavior:"smooth"})}}
            >
              {t('marketplaceViewAll')}
            </Button>
          </Flex>

          <SimpleGrid columns={[1, 2, 3, 4]} spacing={6}>
            {itemsOnSale && itemsOnSale.length > 0 ? (
              itemsOnSale.map((product) => (
                <ProductCard 
                  key={product._id}
                  {...product}
                  name={getEn(product.name)}
                  description={getEn(product.description)}
                />
              ))
            ) : (
              <Box p={4} textAlign={isRTL ? 'right' : 'left'}>{t('marketplaceNoItemsOnSale')}</Box>
            )}
          </SimpleGrid>
        </Box>
      </Container>
    </Box>
  )
}

export default Marketplace