import React, { useState, useEffect } from 'react'
import { Box, Text, Heading, Flex, IconButton, Badge } from '@chakra-ui/react'
import { ChevronLeftIcon, ChevronRightIcon } from '@chakra-ui/icons'
import { motion } from 'framer-motion'
import { useArticlesStore, News, Event, Article } from '../../stores/articles.store';
import { useTranslation } from 'react-i18next';
import { useLanguageDirection } from '../../hooks/useLanguageDirection';
import { useNavigate } from 'react-router-dom';

const MotionBox = motion(Box)

interface NewsSection {
  image: string
  date: string
  title: string
  description: string
}

interface NewsSlide {
  sections: NewsSection[]
}

const SLIDE_DURATION = 5000

// Helper to chunk array
const chunkArray = (arr: any[], size: number) => {
  const result = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
}

// Helper to normalize all types to a common structure
function normalizeItems(news: News[], events: Event[], articles: Article[]) {
  const maxLen = 50;
  const mappedNews = news.map(item => ({
    type: 'News',
    id: item._id,
    image: item.mainImage,
    date: item.date,
    title: item.title,
    description: item.content.slice(0, maxLen),
  }));
  const mappedEvents = events.map(item => ({
    type: 'Event',
    id: item._id,
    image: item.mainImage,
    date: item.date,
    title: item.title,
    description: item.shortDescription.slice(0, maxLen) || item.description.slice(0, maxLen),
  }));
  const mappedArticles = articles.map(item => ({
    type: 'Article',
    id: item._id,
    image: item.mainImage,
    date: item.createdAt || '',
    title: item.title,
    description: item.content.slice(0, maxLen),
  }));
  return [...mappedNews, ...mappedEvents, ...mappedArticles];
}

const NewsEventsSlider: React.FC = () => {
  const { news, events, articles, fetchAll, loading } = useArticlesStore();
  const [currentSlide, setCurrentSlide] = useState(0)
  const { t } = useTranslation();
  const { isRTL } = useLanguageDirection();
  const navigate = useNavigate();

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Combine and normalize all items, then take only the first 9
  const allItems = normalizeItems(news, events, articles).slice(0, 9);
  const slides = chunkArray(allItems, 3);

  useEffect(() => {
    if (slides.length === 0) return;
    const timer = setInterval(
      () => setCurrentSlide((prev) => (prev + 1) % slides.length),
      SLIDE_DURATION
    )
    return () => clearInterval(timer)
  }, [slides.length])

  const handlePrevSlide = () =>
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length)

  const handleNextSlide = () =>
    setCurrentSlide((prev) => (prev + 1) % slides.length)

  const getGlobalIndex = (slideIndex: number, sectionIndex: number) =>
    slideIndex * 3 + sectionIndex + 1

  return (
    <Box py={{ base: 10, md: 20 }}>
      <Box maxW="1200px" mx="auto" px={{ base: 2, md: 4 }}>
        <Box position="relative">
          {/* News & Events heading inside the slider */}
          <Heading
            size={{ base: "md", md: "lg" }}
            position="absolute"
            top={{ base: 2, md: 4 }}
            left={isRTL ? 'unset' : { base: '10%', md: '15%' }}
            right={isRTL ? { base: '10%', md: '15%' } : 'unset'}
            transform={isRTL ? 'translateX(0)' : 'translateX(-50%)'}
            zIndex={2}
            color="white"
            textAlign={isRTL ? 'right' : 'left'}
          >
            {t('newsTitle')}
          </Heading>

          {/* Navigation Buttons */}
          <Flex
            justify="space-between"
            position="absolute"
            w="full"
            top={{ base: "40%", md: "50%" }}
            transform="translateY(-50%)"
            zIndex={2}
            px={{ base: 2, md: 4 }}
          >
            <IconButton
              aria-label="Previous slide"
              icon={<ChevronLeftIcon />}
              onClick={handlePrevSlide}
              variant="outline"
              borderColor="white"
              color="white"
              borderRadius="full"
              bg="rgba(0,0,0,0.4)"
              _hover={{ bg: 'rgba(0,0,0,0.6)' }}
              isDisabled={slides.length === 0}
              size={{ base: "sm", md: "md" }}
            />
            <IconButton
              aria-label="Next slide"
              icon={<ChevronRightIcon />}
              onClick={handleNextSlide}
              variant="outline"
              borderColor="white"
              color="white"
              borderRadius="full"
              bg="rgba(0,0,0,0.4)"
              _hover={{ bg: 'rgba(0,0,0,0.6)' }}
              isDisabled={slides.length === 0}
              size={{ base: "sm", md: "md" }}
            />
          </Flex>

          {/* Slides */}
          <MotionBox
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <Flex
              direction={{ base: "column", md: "row" }}
              gap={{ base: 4, md: 0 }}
            >
              {loading ? (
                <Box w="full" textAlign="center" color="white" py={{ base: 10, md: 20 }}>
                  Loading...
                </Box>
              ) : slides.length === 0 ? (
                <Box w="full" textAlign="center" color="white" py={{ base: 10, md: 20 }}>
                  No news, events, or articles available.
                </Box>
              ) : (
                slides[currentSlide].map((section, idx) => (
                  <Box
                    key={idx}
                    position="relative"
                    flex={{ base: "none", md: "1" }}
                    height={{ base: "300px", md: "400px" }}
                    width={{ base: "100%", md: "auto" }}
                    overflow="hidden"
                    borderRadius={{ base: "20px", md: idx === 0 ? "20px 0 0 20px" : idx === 2 ? "0 20px 20px 0" : "0" }}
                    cursor="pointer"
                    onClick={() => navigate(`/news-events/${section.id}`)}
                  >
                    {/* Background image */}
                    <Box
                      position="absolute"
                      inset={0}
                      bgImage={`url(${section.image})`}
                      bgSize="cover"
                      bgPosition="center"
                      filter="brightness(0.6)"
                    />

                    {/* Number badge + date stacked */}
                    <Box
                      position="absolute"
                      top={{ base: 50, md: 100 }}
                      left={8}
                      zIndex={1}
                      display="flex"
                      flexDirection="row"
                      alignItems="start"
                    >
                      <Box
                        bg="red.600"
                        color="white"
                        borderRadius="full"
                        w={{ base: "32px", md: "40px" }}
                        h={{ base: "32px", md: "40px" }}
                        display="flex"
                        alignItems="center"
                        justifyContent="center"
                        fontWeight="normal"
                        fontSize={{ base: "sm", md: "md" }}
                      >
                        {getGlobalIndex(currentSlide, idx)}
                      </Box>
                      <Text
                        color="white"
                        fontWeight="bold"
                        mt={{ base: 8, md: 12 }}
                        fontSize={{ base: "sm", md: "md" }}
                      >
                        {section.date}
                      </Text>
                    </Box>

                    {/* Badge for type */}
                    <Box position="absolute" top={4} right={4} zIndex={2}>
                      <Badge
                        colorScheme={section.type === 'News' ? 'red' : section.type === 'Event' ? 'blue' : 'green'}
                        fontSize={{ base: "xs", md: "sm" }}
                      >
                        {section.type}
                      </Badge>
                    </Box>

                    {/* Centered title + descriptions */}
                    <Box
                      position="absolute"
                      top="55%"
                      left="50%"
                      transform="translate(-50%, -50%)"
                      textAlign="left"
                      zIndex={1}
                      px={{ base: 4, md: 2 }}
                      w={{ base: "90%", md: "auto" }}
                    >
                      <Text
                        color="white"
                        fontSize={{ base: "sm", md: "md" }}
                        fontWeight="bold"
                        mb={1}
                        dangerouslySetInnerHTML={{ __html: section.title }}
                      />
                      <Text
                        color="whiteAlpha.900"
                        fontSize={{ base: "xs", md: "sm" }}
                        mb={1}
                        dangerouslySetInnerHTML={{ __html: section.description }}
                      />
                    </Box>
                  </Box>
                ))
              )}
            </Flex>
          </MotionBox>

          {/* Slide Indicators */}
          <Flex
            position="absolute"
            bottom={{ base: "10px", md: "20px" }}
            left="50%"
            transform="translateX(-50%)"
            gap={{ base: 2, md: 4 }}
            alignItems="center"
            zIndex={2}
          >
            {slides.map((_, i) => (
              <Box key={i} onClick={() => setCurrentSlide(i)} cursor="pointer">
                <MotionBox
                  w={currentSlide === i ? { base: "20px", md: "24px" } : "8px"}
                  h="8px"
                  bg="white"
                  borderRadius={currentSlide === i ? "4px" : "full"}
                  animate={{
                    width: currentSlide === i ? { base: "20px", md: "24px" } : "8px",
                    opacity: currentSlide === i ? 1 : 0.5
                  }}
                  transition={{ duration: 0.3 }}
                  _hover={{ opacity:0.8 }}
                />
              </Box>
            ))}
          </Flex>
        </Box>
      </Box>
    </Box>
  )
}

export default NewsEventsSlider