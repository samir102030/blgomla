import {
    SimpleGrid,
    Box,
    Text,
    Image,
    VStack,
  } from '@chakra-ui/react';
  import { getUniqueCategories, getCategoryData, getIndustryCategories } from '../../data/dummyData';
import { useUserStore } from '../../stores/user.store';
import { getEn } from '../../utils/getEn';
import { useTranslation } from 'react-i18next';
  
  interface CategoryGridProps {
    onCategorySelect: (category: string) => void;
    type?: 'product' | 'industry';
  }
  
  const CategoryGrid = ({ onCategorySelect, type = 'product' }: CategoryGridProps) => {
    // Get categories based on type
    const lang = useUserStore(state => state.lang)
    const { i18n } = useTranslation();
    const currentLang = i18n.language || lang || 'en';
    const categories = type === 'product' 
      ? getUniqueCategories() 
      : getIndustryCategories();
  
    const getDisplayName = (name: any) => {
      if (typeof name === 'string') return name;
      if (name && typeof name === 'object' && name[currentLang]) return name[currentLang];
      return name?.en || '';
    };
  
    return (
      <SimpleGrid columns={[1, 1, 2]} spacing={6}>
        {categories.map((category) => {
          const categoryData = getCategoryData(typeof category === "object" ? category.name : category);
          
          return (
            <Box
              key={typeof category === "object" ? getDisplayName(category.name) : category}
              bg="white"
              borderRadius="lg"
              overflow="hidden"
              cursor="pointer"
              onClick={() => onCategorySelect(typeof category === "object" ? getDisplayName(category.name) : category)}
              transition="transform 0.2s"
              _hover={{ transform: 'scale(1.02)' }}
              boxShadow="sm"
            >
              <Box position="relative">
                <Image
                  src={categoryData.image || '/images/default-category.jpg'}
                  alt={typeof category === "object" ? getDisplayName(category.name) : category}
                  w="full"
                  h="200px"
                  objectFit="cover"
                  filter="brightness(0.7)"
                />
                <Box
                  position="absolute"
                  top={0}
                  left={0}
                  right={0}
                  bg={type === 'product' ? "red.600" : "blue.600"}
                  color="white"
                  py={2}
                  px={4}
                >
                  <Text fontSize="lg" fontWeight="bold">
                    {typeof category === "object" ? getDisplayName(category.name) : category}
                  </Text>
                </Box>
              </Box>
              
              <VStack align="stretch" p={4}>
                <Text fontSize="sm" noOfLines={2} color="gray.600">
                  {getEn(categoryData.description)}
                </Text>
              </VStack>
            </Box>
          );
        })}
      </SimpleGrid>
    );
  };
  
  export default CategoryGrid;