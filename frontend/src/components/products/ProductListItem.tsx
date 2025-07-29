import { Box, Flex, Text, Button, Image, Icon, IconButton, Badge, HStack } from '@chakra-ui/react'
import { CartIcon } from '../icons/CustomIcons'
import { Product, Industry } from '../../stores/product.store'
import { useNavigate } from 'react-router-dom'
import { useUserStore } from '../../stores/user.store';
import { getEn } from '../../utils/getEn';
import { useTranslation } from 'react-i18next';
import { useLanguageDirection } from '../../hooks/useLanguageDirection';

interface ProductListItemProps {
  item: Product | Industry;
  type: 'product' | 'industry';
}

const ProductListItem = ({ item, type }: ProductListItemProps) => {
  const isProduct = type === 'product';
  const navigate = useNavigate();
  const lang = useUserStore(state => state.lang)
  const { t } = useTranslation();
  const { dir, isRTL } = useLanguageDirection();

  const handleMoreDetails = () => {
    if (isProduct) {
      navigate(`/products/${item._id}`);
    } else {
      navigate(`/industries/${item._id}`);
    }
  }

  const handleViewRelatedProducts = () => {
    navigate(`/products?industryCategory=${item.category}`);
  }
  // console.log(item);

  return (
    <Box
      borderRadius="xl"
      overflow="hidden"
      bgGradient="linear(to-b, red.700 0%, red.600 100%)"
      boxShadow="lg"
      minH="320px"
      maxW="500px"
      mx="auto"
      mb={4}
      position="relative"
      _hover={{ boxShadow: '2xl', transform: 'translateY(-4px) scale(1.01)' }}
      transition="all 0.2s"
      dir={dir}
    >
      {/* Header */}
      <Box bg="red.700" px={6} py={3}>
        <Text color="white" fontSize="lg" fontWeight="bold" textAlign={isRTL ? 'right' : 'left'}>
          {getEn(item.name)}
        </Text>
        <Flex gap={2} mt={2} direction={isRTL ? 'row-reverse' : 'row'}>
          {/* Category Badge */}
          {isProduct && item.category && (
            <Badge colorScheme="yellow" variant="solid" borderRadius="full" px={3} py={1} fontSize="0.8em">
              {typeof item.category === 'object' ? item.category?.name : item.category}
            </Badge>
          )}
          {/* On Sale Badge */}
          {isProduct && (item as any).saleStartDate && (item as any).saleEndDate && (() => {
            const now = new Date();
            const start = new Date((item as any).saleStartDate);
            const end = new Date((item as any).saleEndDate);
            if (now >= start && now <= end) {
              return (
                <Badge colorScheme="green" variant="solid" borderRadius="full" px={3} py={1} fontSize="0.8em">
                  On Sale
                </Badge>
              );
            }
            return null;
          })()}
        </Flex>
      </Box>
      {/* Content */}
      <Flex direction="column" justify="flex-start" h="full" bg="white" px={6} py={4}>
        <Flex align="center" justify="center" mb={3}>
          {item.image && (
            <Image
              src={item.image}
              alt={getEn(item.name)}
              boxSize="200px"
              objectFit="contain"
              borderRadius="md"
              bg="gray.100"
              p={1}
              mx="auto"
            />
          )}
        </Flex>
        <Text  fontSize="sm" mb={1} minH="60px" textAlign={isRTL ? 'right' : 'left'}>
          {getEn(item.description)}
        </Text>
          <Button
            onClick={handleMoreDetails}
            variant="solid"
            size="xxl"
            bg="whiteAlpha.900"
            color="red.700"
            borderRadius="full"
            px={6}
            fontWeight={600}
            _hover={{ bg: 'red.100', color: 'red.800' }}
          >
            {t('viewDetails')}
          </Button>
        <Flex justify="flex-end">
        </Flex>
      </Flex>
    </Box>
  )
}

export default ProductListItem