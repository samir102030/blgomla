import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom'
import {
  Box,
  Container,
  Heading,
  Text,
  Flex,
  Image,
  Badge,
  // SimpleGrid,
  VStack,
  Button,
  useBreakpointValue,
  // IconButton,
  HStack,
  // Circle,
  Icon,
  // Wrap,
  // WrapItem
} from '@chakra-ui/react'
import { NewsItem } from '../data/dummyData'
import { useArticlesStore } from '../stores/articles.store'
import { 
  ChevronLeftIcon, 
  ChevronRightIcon, 
  ArrowBackIcon,
  CalendarIcon,
  // InfoIcon
} from '@chakra-ui/icons'
import { LocationIcon } from '../components/icons/CustomIcons'
import { useUserStore } from '../stores/user.store'

// Improved Image Slider Component with thumbnails
const ImageSlider = ({ images }: { images: string[] }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  
  const handlePrev = () => {
    setCurrentIndex((prevIndex) => 
      prevIndex === 0 ? images.length - 1 : prevIndex - 1
    );
  };
  
  const handleNext = () => {
    setCurrentIndex((prevIndex) => 
      prevIndex === images.length - 1 ? 0 : prevIndex + 1
    );
  };

  const buttonSize = useBreakpointValue({ base: "sm", md: "md" });
  
  return (
    <Box position="relative" mb={4} w="100%">
      {/* Main image */}
      <Box 
        height={{ base: "250px", md: "400px" }} 
        overflow="hidden" 
        borderRadius="lg"
        position="relative"
        mb={4}
      >
        <Image
          src={images[currentIndex]}
          alt={`Image ${currentIndex + 1}`}
          objectFit="cover"
          width="100%"
          height="100%"
          transition="transform 0.5s"
        />
      
        {images.length > 1 && (
          <Flex
            position="absolute"
            bottom="15px"
            right="15px"
          >
            <Button
              borderRadius="full"
              size={buttonSize}
              onClick={handlePrev}
              bg="white"
              _hover={{ bg: "gray.200" }}
              color="red.600"
              mr={2}
              borderWidth="1px"
              borderColor="red.600"
              boxShadow="md"
              h="50px"
              w="50px"
              p={0}
            >
              <ChevronLeftIcon boxSize={6} />
            </Button>
            <Button
              borderRadius="full"
              size={buttonSize}
              onClick={handleNext}
              bg="white"
              _hover={{ bg: "gray.200" }}
              color="red.600"
              borderWidth="1px"
              borderColor="red.600"
              boxShadow="md"
              h="50px"
              w="50px"
              p={0}
            >
              <ChevronRightIcon boxSize={6} />
            </Button>
          </Flex>
        )}
      </Box>
      
      {/* Thumbnail navigation */}
      {images.length > 1 && (
        <Flex justify="center" overflowX="auto" p={2}>
          <HStack spacing={2}>
            {images.map((image, index) => (
              <Box
                key={index}
                width="60px"
                height="60px"
                borderRadius="md"
                overflow="hidden"
                cursor="pointer"
                onClick={() => setCurrentIndex(index)}
                borderWidth={currentIndex === index ? "2px" : "0px"}
                borderColor="red.500"
                opacity={currentIndex === index ? 1 : 0.7}
                transition="all 0.2s"
                _hover={{ opacity: 1 }}
              >
                <Image
                  src={image}
                  alt={`Thumbnail ${index + 1}`}
                  objectFit="cover"
                  width="100%"
                  height="100%"
                />
              </Box>
            ))}
          </HStack>
        </Flex>
      )}
    </Box>
  );
};

// Large Number Badge - like in the image
// const LargeNumberBadge = ({ number }: { number: number }) => {
//   return (
//     <Circle 
//       size={{ base: "80px", md: "100px" }} 
//       bg="red.600" 
//       color="white" 
//       fontSize={{ base: "42px", md: "56px" }}
//       fontWeight="bold"
//       mb={{ base: 4, md: 0 }}
//     >
//       {number}
//     </Circle>
//   );
// };

// Calendar date display component
const CalendarDateDisplay = ({ date }: { date: string }) => {
  return (
    <Flex align="center" mb={4}>
      <Icon as={CalendarIcon} color="red.600" boxSize={5} mr={2} />
      <Text fontSize="lg" color="gray.700">
        {date}
      </Text>
    </Flex>
  );
};

// Location display component
const LocationDisplay = ({ location }: { location?: string }) => {
  if (!location) return null;
  
  return (
    <Flex align="center" mb={4}>
      <Icon as={LocationIcon} color="red.600" boxSize={5} mr={2} />
      <Text fontSize="lg" color="gray.700">
        {location || "Egypt"}
      </Text>
    </Flex>
  );
};

// Pagination navigation for news items
const NewsItemPagination = ({ 
  currentId, 
  allItems 
}: { 
  currentId: string, 
  allItems: NewsItem[] 
}) => {
  const currentIndex = allItems.findIndex(item => item.id === currentId);
  if (currentIndex === -1) return null;
  
  const prevItem = currentIndex > 0 ? allItems[currentIndex - 1] : null;
  const nextItem = currentIndex < allItems.length - 1 ? allItems[currentIndex + 1] : null;
  
  return (
    <Flex 
      justify="space-between" 
      align="center"
      w="100%" 
      mt={8} 
      borderTop="1px" 
      borderColor="gray.200" 
      pt={4}
      direction="row"
      wrap="nowrap"
    >
      <Box>
        {prevItem && (
          <Button 
            as={Link} 
            to={`/news-events/${prevItem.id}`} 
            variant="ghost" 
            leftIcon={<ChevronLeftIcon />}
            color="red.600"
          >
            Previous
          </Button>
        )}
      </Box>
      
      <HStack minW="200px" overflowX="auto" flexWrap="nowrap">
        {allItems.map((item, idx) => (
          <Button
            key={item.id}
            as={Link}
            to={`/news-events/${item.id}`}
            size="sm"
            variant={item.id === currentId ? "solid" : "outline"}
            colorScheme={item.id === currentId ? "red" : "gray"}
            borderRadius="full"
            minW="40px"
          >
            {idx + 1}
          </Button>
        )).slice(
          // Only show a few items around the current one
          Math.max(0, currentIndex - 2),
          Math.min(allItems.length, currentIndex + 3)
        )}
        
        {currentIndex + 3 < allItems.length && (
          <Text>...</Text>
        )}
      </HStack>
      
      <Box>
        {nextItem && (
          <Button 
            as={Link} 
            to={`/news-events/${nextItem.id}`} 
            variant="ghost" 
            rightIcon={<ChevronRightIcon />}
            color="red.600"
          >
            Next
          </Button>
        )}
      </Box>
    </Flex>
  );
};

const NewsEventDetails = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const industryCategory = searchParams.get('industryCategory');
  const [newsItem, setNewsItem] = useState<NewsItem | null>(null);
  const [allItems, setAllItems] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const [
    // itemIndex
    ,setItemIndex] = useState(1);
  const lang = useUserStore(state => state.lang);
  // console.log("lang2 " + lang)

  
  const { news, events, articles, fetchAll } = useArticlesStore();

  const mapNewsToNewsItem = (news: any): NewsItem => ({
    id: news._id,
    type: 'news',
    title: news.title,
    description: news.content || '',
    shortDescription: '',
    date: news.date,
    image: news.mainImage,
    content: news.content || '',
    images: news.additionalImages || [],
    location: undefined,
  });
  const mapEventToNewsItem = (event: any): NewsItem => ({
    id: event._id,
    type: 'event',
    title: event.title,
    description: event.description || '',
    shortDescription: event.shortDescription || '',
    date: event.date,
    image: event.mainImage,
    content: event.description || '',
    images: event.additionalImages || [],
    location: event.location,
  });
  const mapArticleToNewsItem = (article: any): NewsItem => ({
    id: article._id,
    type: 'article',
    title: article.title,
    description: article.content || '',
    shortDescription: '',
    date: article.createdAt || '',
    image: article.mainImage,
    content: article.content || '',
    images: article.additionalImages || [],
    location: undefined,
  });

  useEffect(() => {
    // Optionally fetch if not loaded
    // if (!news.length && !events.length && !articles.length) {
    // }
    fetchAll();
    setLoading(true);
    
    let allMapped = [
      ...news.map(mapNewsToNewsItem),
      ...events.map(mapEventToNewsItem),
      ...articles.map(mapArticleToNewsItem),
    ];

    // Filter by industry category if provided
    if (industryCategory) {
      allMapped = allMapped.filter(item => {
        const searchText = `${item.content} ${item.description} ${item.shortDescription}`.toLowerCase();
        return searchText.includes(industryCategory.toLowerCase());
      });
    }

    setAllItems(allMapped);

    if (id) {
      const item = allMapped.find(i => i.id === id);
      if (item) {
        setNewsItem(item);
        const index = allMapped.findIndex(i => i.id === id);
        if (index !== -1) {
          setItemIndex(index + 1);
        }
      }
      setLoading(false);
    }
  }, [id, news, events, articles, fetchAll, industryCategory, lang]);

  const handleGoBack = () => {
    // Preserve the industryCategory parameter when going back
    if (industryCategory) {
      navigate(`/news-events?industryCategory=${industryCategory}`);
    } else {
      navigate('/news-events');
    }
  };

  if (loading) {
    return (
      <Container maxW="container.lg" py={10}>
        <Text>Loading...</Text>
      </Container>
    );
  }

  if (!newsItem) {
    return (
      <Container maxW="container.lg" py={10}>
        <Text>News item not found</Text>
      </Container>
    );
  }
  
  return (
    <Box py={10}>
      <Container maxW="container.lg">
        <Box mb={6} w="100%">
          <Button
            leftIcon={<ArrowBackIcon />}
            colorScheme="gray"
            variant="outline"
            size="md"
            onClick={handleGoBack}
            mb={6}
          >
            Back to News & Events
          </Button>
        </Box>
        
        {/* Main title and headline */}
        <Heading as="h1" size="xl" mb={6} lineHeight="1.2">
          {newsItem.title}
        </Heading>
        
        {/* Image slider with thumbnails */}
        <ImageSlider images={newsItem.images} />
        
        <Flex 
          direction="column" 
          align="start"
          mt={4}
        >
          {/* Metadata section */}
          <Flex 
            w="100%" 
            mb={6}
            justify="space-between"
            direction={{ base: "column", md: "row" }}
            align={{ base: "start", md: "center" }}
            bg="gray.50"
            p={4}
            borderRadius="md"
          >
            <Box>
              <Badge
                colorScheme={newsItem.type === 'event' ? 'green' : newsItem.type === 'news' ? 'blue' : 'purple'}
                fontSize="0.9em"
                px="3"
                py="1"
                borderRadius="md"
                textTransform="capitalize"
                mb={{ base: 2, md: 0 }}
              >
                {newsItem.type}
              </Badge>
            </Box>
            
            <HStack spacing={4}>
              <CalendarDateDisplay date={newsItem.date} />
              {newsItem.type === 'event' && (
                <LocationDisplay location="Egypt" />
              )}
            </HStack>
          </Flex>
          
          {/* Content section */}
          <VStack spacing={6} align="stretch" width="100%">
            <Text 
              fontSize="xl" 
              fontWeight="bold" 
              color="gray.700"
            >
              {/* {newsItem.shortDescription || newsItem.description} */}
              
              <Box fontSize="md" color="gray.700" lineHeight="tall" whiteSpace="pre-line" dangerouslySetInnerHTML={{ __html: newsItem.shortDescription || newsItem.description }} />
            </Text>
            
            {newsItem.shortDescription !== "" ? <Box fontSize="md" color="gray.700" lineHeight="tall" whiteSpace="pre-line" dangerouslySetInnerHTML={{ __html: newsItem.content || newsItem.description }} />: <></>}
          </VStack>
          
          {/* Pagination navigation */}
          <NewsItemPagination currentId={id || ''} allItems={allItems} />
        </Flex>
      </Container>
    </Box>
  );
};

export default NewsEventDetails; 