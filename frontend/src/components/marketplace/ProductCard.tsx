import { Box, Image, Text, HStack, Icon } from '@chakra-ui/react'
import { StarIcon } from '@chakra-ui/icons'
import { useState } from 'react'
import { CartIcon } from '../icons/CustomIcons'
import { Category } from '../../stores/product.store';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useLanguageDirection } from '../../hooks/useLanguageDirection';

export interface ProductCardProps {
  _id: string;
  name: string;
  price?: number;
  category?: string | Category;
  onSale?: boolean;
  description?: string;
  image?: string;
  // brand?: string;
  discount?: number
  rating?: number;
}

const ProductCard = ({ _id, name, image, discount, rating }: ProductCardProps) => {
  const [isInCart, setIsInCart] = useState(false)
  const [isDetailsHovered, setIsDetailsHovered] = useState(false)
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { dir, isRTL } = useLanguageDirection();

  return (
    <Box
      borderWidth="1px"
      borderRadius="lg"
      overflow="hidden"
      _hover={{ shadow: 'xl' }}
      position="relative"
      dir={dir}
    >
      {/* Cart Icon */}
      <Box
        position="absolute"
        top={0}
        left={isRTL ? undefined : 0}
        right={isRTL ? 0 : undefined}
        zIndex={2}
        cursor="pointer"
        onClick={() => setIsInCart(!isInCart)}
        transition="all 0.2s"
        _hover={{ transform: 'scale(1.1)' }}
      >
        <Icon
          as={CartIcon}
          boxSize={4}
          color={isInCart ? 'gray.400' : 'red.600'}
          transition="color 0.6s"
        />
      </Box>

      {/* Discount Badge */}
      {discount != null && (
        <Box
          position="absolute"
          top={0}
          left={isRTL ? 0 : undefined}
          right={isRTL ? undefined : 0}
          zIndex={2}
          bg="red.600"
          color="white"
          px={4}
          py={2}
          borderBottomLeftRadius={isRTL ? undefined : "2xl"}
          borderBottomRightRadius={isRTL ? "2xl" : undefined}
          fontSize="sm"
          fontWeight="bold"
        >
          offer
          <Text fontSize="lg" fontWeight="bold">
            {discount}%
          </Text>
        </Box>
      )}

      {/* Product Image */}
      <Box position="relative">
        <Image 
          src={image} 
          alt={name} 
          h="200px" 
          w="full" 
          objectFit="cover" 
        />
      </Box>

      {/* Product Info */}
      <Box p={4}>
        <Text 
          fontWeight="semibold" 
          noOfLines={2}
          mb={2}
          textAlign={isRTL ? 'right' : 'left'}
        >
          {name}
        </Text>

        {/* <HStack spacing={1} mb={4}>
          {Array.from({ length: 5 }, (_, i) => (
            <Icon
              key={i}
              as={StarIcon}
              color={i < (rating || 0) ? 'yellow.400' : 'gray.300'}
              boxSize={4}
            />
          ))}
        </HStack> */}

        {/* More Details / Get Code Button */}
        <Box
          as="button"
          mt={2}
          w="full"
          py={2}
          border="1px"
          borderColor="red.600"
          color="red.600"
          borderRadius="md"
          fontSize="sm"
          onMouseEnter={() => setIsDetailsHovered(true)}
          onMouseLeave={() => setIsDetailsHovered(false)}
          onClick={() => {navigate(`/products/${_id}`); window.scroll({top:0, behavior:"smooth"})}}
          _hover={{
            bg: 'red.50',
            color: 'gray.600',
            borderColor: 'gray.600',
          }}
          // textAlign={isRTL ? 'right' : 'left'}
          textAlign={"center"}
        >
          {t('viewDetails')}
        </Box>
      </Box>
    </Box>
  )
}

export default ProductCard
