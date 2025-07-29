import { SimpleGrid, Box, Text, Image } from '@chakra-ui/react'
import { useProductStore } from '../../stores/product.store';
import { useEffect } from 'react';
import { useUserStore } from '../../stores/user.store';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

// const categories = [
//     {
//         name: 'Water treatment',
//         image: "/images/prod6.jpg"
//     },
//     {
//         name: 'Oleo',
//         image:  "/images/prod1.jpg"
//     },
//     {
//         name: 'Sodium Chloride',
//         image:  "/images/prod2.jpg"
//     },
//     {
//         name: 'Mining',
//         image:  "/images/prod3.png"
//     },
//     {
//         name: 'Printing',
//         image:  "/images/prod4.jpg"
//     },
//     {
//         name: 'Paints',
//         image: "/images/prod5.jpg"
//     },
//     {
//         name: 'Adhesives & Sealant',
//         image:  "/images/prod6.jpg"
//     }
// ]

const ProductCategories = () => {
  const categories = useProductStore((state) => state.categories);
  const lang = useUserStore(state => state.lang)
  const getAllCategories = useProductStore((state) => state.getAllCategories);
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const currentLang = i18n.language || lang || 'en';

  useEffect(() => {
    getAllCategories();
  }, [ getAllCategories, lang ]);

  const getDisplayName = (name: any) => {
    if (typeof name === 'string') return name;
    if (name && typeof name === 'object' && name[currentLang]) return name[currentLang];
    return name?.en || '';
  };
  
  return (
    <SimpleGrid columns={[2, 3, 4]} spacing={4}>
      {categories.map((category) => (
        <Box
          key={typeof category.name === 'object' ? getDisplayName(category.name) : category.name}
          position="relative"
          borderRadius="lg"
          overflow="hidden"
          cursor="pointer"
          boxShadow="sm"
          transition="all 0.2s"
          _hover={{ transform: 'scale(1.02)' }}
          onClick={() => navigate("/products?industryCategory=" + (typeof category.name === 'object' ? getDisplayName(category.name) : category.name))}
        >
          {/* Image */}
          <Image
            src={category.image}
            alt={typeof category.name === 'object' ? getDisplayName(category.name) : category.name}
            w="full"
            h="150px"
            objectFit="cover"
          />

          {/* Red Strip with Text */}
          <Box
            position="absolute"
            left={0}
            right={0}
            top="50%"
            transform="translateY(-50%)"
            bg="red.600"
            py={2}
          >
            <Text
              color="white"
              fontSize="sm"
              fontWeight="medium"
              textAlign="center"
            >
              {typeof category.name === 'object' ? getDisplayName(category.name) : category.name}
            </Text>
          </Box>

          {/* Checkbox */}
          <Box
            position="absolute"
            top={2}
            right={2}
            bg="white"
            borderRadius="md"
            p={1}
          >
           <Box
            position="absolute"
            top={0}
            right={15}
            bg="red.600"
            borderRadius="md"
            p={1}
          ></Box>
           
          </Box>
        </Box>
      ))}
    </SimpleGrid>
  )
}

export default ProductCategories