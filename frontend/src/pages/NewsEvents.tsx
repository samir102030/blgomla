import { useEffect, useState } from 'react'
import {
  Box,
  Container,
  Heading,
  Text,
  Grid,
  Tabs,
  TabList,
  Tab,
  TabPanels,
  TabPanel,
  Flex,
  Image,
  Badge,
  Button,
  HStack,
  Circle,
  Icon
} from '@chakra-ui/react'
import { 
  getAllNewsAndEvents, 
  getEvents, 
  getNewsItems, 
  getArticles,
  NewsItem
} from '../data/dummyData'
import { Link } from 'react-router-dom'
import { 
  ChevronLeftIcon, 
  ChevronRightIcon, 
  CalendarIcon, 
   
} from '@chakra-ui/icons'
import { LocationIcon } from '../components/icons/CustomIcons'
import { useArticlesStore } from '../stores/articles.store'
import { useUserStore } from '../stores/user.store'
import { useTranslation } from 'react-i18next'

const NumberBadge = ({ number }: { number: number }) => {
  return (
    <Circle 
      size="30px" 
      bg="red.600" 
      color="white" 
      position="absolute"
      top="7.5px"
      left="7.5px"
      zIndex="1"
      fontSize="16px"
      fontWeight="bold"
    >
      {number}
    </Circle>
  );
};

const CalendarDate = ({ date }: { date: string }) => {
  return (
    <Flex align="center" mb={2}>
      <Icon as={CalendarIcon} color="red.600" mr={2} />
      <Text color="gray.600" fontSize="sm">
        {date}
      </Text>
    </Flex>
  );
};


const LocationInfo = ({ location }: { location?: string }) => {
  if (!location) return null;
  
  return (
    <Flex align="center" mb={2}>
      <Icon as={LocationIcon} color="red.600" mr={2} />
      <Text color="gray.600" fontSize="sm">
        {location}
      </Text>
    </Flex>
  );
};
const NewsItemCard = ({ item, index }: { item: NewsItem, index: number }) => {
  const location = item.location || 'Egypt';
  const { t } = useTranslation();
  return (
    <Box
      as={Link}
      to={`/news-events/${item.id}`}
      borderWidth="1px"
      borderRadius="lg"
      overflow="hidden"
      transition="transform 0.3s, box-shadow 0.3s"
      _hover={{
        transform: "translateY(-5px)",
        boxShadow: "xl"
      }}
      bg="white"
      height="100%"
      display="flex"
      flexDirection="column"
      position="relative"
    >
      {/* Image section with number badge */}
      <Box position="relative" height="200px" overflow="hidden">
        <NumberBadge number={index + 1} />
        <Image
          src={item.image}
          alt={item.title}
          objectFit="cover"
          width="100%"
          height="100%"
          transition="transform 0.3s"
          _hover={{ transform: "scale(1.1)" }}
          filter="brightness(0.9)"
        />
        <Badge
          position="absolute"
          top="15px"
          right="15px"
          colorScheme={item.type === 'event' ? 'green' : item.type === 'news' ? 'blue' : 'purple'}
          fontSize="0.8em"
          px="2"
          py="1"
          borderRadius="md"
          textTransform="capitalize"
        >
          {item.type}
        </Badge>
      </Box>
      
      {/* Content section */}
      <Box p={4} flex="1" display="flex" flexDirection="column" bg="white">
        <Box flex="1">
          <CalendarDate date={item.date} />
          
          {/* Show location for all item types */}
          <LocationInfo location={location} />
          
          <Heading as="h3" size="md" mb={3} lineHeight="1.4" noOfLines={2}>
            {item.title}
          </Heading>
          
          <Text color="gray.600" noOfLines={3} fontSize="sm">
            {item.shortDescription}
          </Text>
        </Box>
        
        <Text mt={4} color="red.600" fontWeight="bold">
          {t('readMore')} →
        </Text>
      </Box>
    </Box>
  );
};


const Pagination = ({ 
  currentPage, 
  totalPages, 
  onPageChange 
}: { 
  currentPage: number, 
  totalPages: number, 
  onPageChange: (page: number) => void 
}) => {
  const visiblePages = 5;
  
  const getVisiblePageNumbers = () => {
    let startPage = Math.max(1, currentPage - Math.floor(visiblePages / 2));
    let endPage = startPage + visiblePages - 1;
    
    if (endPage > totalPages) {
      endPage = totalPages;
      startPage = Math.max(1, endPage - visiblePages + 1);
    }
    
    return Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i);
  };

  const visiblePageNumbers = getVisiblePageNumbers();

  return (
    <HStack spacing={2} mt={8} justify="center">
      <Button
        size="sm"
        onClick={() => onPageChange(currentPage - 1)}
        isDisabled={currentPage === 1}
        leftIcon={<ChevronLeftIcon />}
        colorScheme="gray"
        variant="outline"
      >
        Prev
      </Button>
      
      {visiblePageNumbers[0] > 1 && (
        <>
          <Button
            size="sm"
            onClick={() => onPageChange(1)}
            colorScheme={currentPage === 1 ? "red" : "gray"}
            variant={currentPage === 1 ? "solid" : "outline"}
          >
            1
          </Button>
          {visiblePageNumbers[0] > 2 && (
            <Text>...</Text>
          )}
        </>
      )}
      
      {visiblePageNumbers.map(pageNumber => (
        <Button
          key={pageNumber}
          size="sm"
          onClick={() => onPageChange(pageNumber)}
          colorScheme={currentPage === pageNumber ? "red" : "gray"}
          variant={currentPage === pageNumber ? "solid" : "outline"}
        >
          {pageNumber}
        </Button>
      ))}
      
      {visiblePageNumbers[visiblePageNumbers.length - 1] < totalPages && (
        <>
          {visiblePageNumbers[visiblePageNumbers.length - 1] < totalPages - 1 && (
            <Text>...</Text>
          )}
          <Button
            size="sm"
            onClick={() => onPageChange(totalPages)}
            colorScheme={currentPage === totalPages ? "red" : "gray"}
            variant={currentPage === totalPages ? "solid" : "outline"}
          >
            {totalPages}
          </Button>
        </>
      )}
      
      <Button
        size="sm"
        onClick={() => onPageChange(currentPage + 1)}
        isDisabled={currentPage === totalPages}
        rightIcon={<ChevronRightIcon />}
        colorScheme="gray"
        variant="outline"
      >
        Next
      </Button>
    </HStack>
  );
};


const NewsGrid = ({ items }: { items: NewsItem[] }) => {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;
  const totalPages = Math.ceil(items.length / itemsPerPage);
  

  const getCurrentPageItems = () => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return items.slice(startIndex, endIndex);
  };
  
  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber);
  
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <Box>
      <Grid 
        templateColumns={{ base: "1fr", md: "repeat(2, 1fr)", lg: "repeat(3, 1fr)" }} 
        gap={6}
        mt={6}
      >
        {getCurrentPageItems().map((item, index) => (
          <NewsItemCard 
            key={item.id} 
            item={item} 
            index={(currentPage - 1) * itemsPerPage + index}
          />
        ))}
      </Grid>
      
      {totalPages > 1 && (
        <Pagination 
          currentPage={currentPage} 
          totalPages={totalPages} 
          onPageChange={handlePageChange} 
        />
      )}
    </Box>
  );
};

const NewsEvents = () => {
  const [tabIndex, setTabIndex] = useState(0);
  const {news:news1, events: events1, articles: articles1, fetchAll} = useArticlesStore();
  const lang = useUserStore(state => state.lang);
  const { t } = useTranslation();

  
  // Map store data to NewsItem type
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

  // Ensure we always have arrays to work with
  const safeNews = Array.isArray(news1) ? news1 : [];
  const safeEvents = Array.isArray(events1) ? events1 : [];
  const safeArticles = Array.isArray(articles1) ? articles1 : [];

  const allItems = [
    ...safeNews.map(mapNewsToNewsItem),
    ...safeEvents.map(mapEventToNewsItem),
    ...safeArticles.map(mapArticleToNewsItem)
  ];
  const events = safeEvents.map(mapEventToNewsItem);
  const news = safeNews.map(mapNewsToNewsItem);
  const articles = safeArticles.map(mapArticleToNewsItem);

  useEffect(() =>{
    fetchAll();
  },[fetchAll, lang])
  // console.log(news1)
  // console.log(articles1)
  // console.log(events1)
  const handleTabChange = (index: number) => {
    setTabIndex(index);

    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <Box py={10}>
      <Container maxW="container.xl">
        <Flex direction="column" align="center" mb={8}>
          <Heading as="h1" size="xl" mb={3} textAlign="center">
            {t('newsTitle')}
          </Heading>
          <Text 
            fontSize="lg" 
            color="gray.600" 
            maxW="800px" 
            textAlign="center"
          >
            {t('newsSubTitle')}
          </Text>
        </Flex>

        <Tabs 
          variant="soft-rounded" 
          colorScheme="red" 
          align="center"
          index={tabIndex}
          onChange={handleTabChange}
          mb={8}
        >
          <TabList>
            <Tab>{t('newsAll')}</Tab>
            <Tab>{t('events')}</Tab>
            <Tab>{t('news')}</Tab>
            <Tab>{t('articles')}</Tab>
          </TabList>

          <TabPanels mt={6}>
            <TabPanel padding={0}>
              <NewsGrid items={allItems} />
            </TabPanel>
            <TabPanel padding={0}>
              <NewsGrid items={events} />
            </TabPanel>
            <TabPanel padding={0}>
              <NewsGrid items={news} />
            </TabPanel>
            <TabPanel padding={0}>
              <NewsGrid items={articles} />
            </TabPanel>
          </TabPanels>
        </Tabs>
      </Container>
    </Box>
  );
};

export default NewsEvents; 