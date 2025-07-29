import React, { useState, useEffect } from "react";
import {
  Box,
  Flex,
  Text,
  Spinner,
} from "@chakra-ui/react";
import { motion } from "framer-motion";
import { useSlidersStore } from "../../stores/slider.store";
import { useTranslation } from "react-i18next";
import { useLanguageDirection } from "../../hooks/useLanguageDirection";

const MotionBox = motion(Box);

const SLIDE_DURATION = 5000;

const HeroSlider: React.FC = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const { sliders, loading, fetchSliders } = useSlidersStore();
  const { i18n } = useTranslation();
  const lang = i18n.language || 'en';
  const { dir, isRTL } = useLanguageDirection();

  useEffect(() => {
    fetchSliders(lang);
  }, [fetchSliders, lang]);

  useEffect(() => {
    if (sliders.length > 0) {
      const timer = setInterval(
        () => setCurrentSlide((prev) => (prev + 1) % sliders.length),
        SLIDE_DURATION
      );
      return () => clearInterval(timer);
    }
  }, [sliders.length]);

  const handleSlideChange = (index: number) => {
    setCurrentSlide(index);
  };

  const getDisplayText = (field: any): string => {
    if (typeof field === 'string') return field;
    if (field && typeof field === 'object' && field[lang]) return field[lang];
    return field?.en || '';
  };

  if (loading) {
    return (
      <Flex justify="center" align="center" height="600px">
        <Spinner size="xl" />
      </Flex>
    );
  }

  if (sliders.length === 0) {
    return null;
  }

  return (
    <Box position="relative" height={{ base: "350px", md: "600px", lg: "700px" }} overflow="hidden" dir={dir}>
      {/* Background + fade */}
      <MotionBox
        key={sliders[currentSlide]?._id}
        bgImage={`url(${sliders[currentSlide]?.image})`}
        bgSize="cover"
        bgPosition="center"
        height="100%"
        filter="grayscale(0.3)"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        {/* Dark overlay */}
        <Box position="absolute" inset={0} bg="blackAlpha.500" />

        {/* Text panel */}
        <MotionBox
          position="absolute"
          top={{ base: "20%", md: "25%", lg: "30%" }}
          left={isRTL ? undefined : { base: 0, md: 0 }}
          right={isRTL ? { base: 0, md: 0 } : undefined}
          transform={{ base: "translateY(-50%)", md: "translateY(-50%)" }}
          w={{ base: "90%", sm: "80%", md: "50%", lg: "40%", xl: "35%" }}
          maxW={{ xl: "600px" }}
          px={{ base: 4, sm: 6, md: 8, lg: 10 }}
          mx={{ base: "auto", md: 0 }}
          initial={{ opacity: 0, x: isRTL ? 50 : -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Box
            bg={{ base: "blackAlpha.700", md: "whiteAlpha.100" }}
            backdropFilter="blur(10px)"
            borderRadius="xl"
            p={{ base: 4, sm: 5, md: 6, lg: 8 }}
            border="1px solid"
            borderColor="whiteAlpha.200"
          >
            <Text
              fontSize={{ base: "sm", sm: "md", md: "lg", lg: "xl" }}
              textTransform="uppercase"
              mb={2}
              color="red.500"
              fontWeight="bold"
              textAlign={isRTL ? 'right' : 'left'}
              noOfLines={2}
            >
              {getDisplayText(sliders[currentSlide]?.title)}
            </Text>
            <Text
              as="h2"
              fontSize={{ base: "lg", sm: "xl", md: "2xl", lg: "3xl" }}
              mb={4}
              fontWeight="bold"
              color="white"
              lineHeight="1.2"
              textAlign={isRTL ? 'right' : 'left'}
              noOfLines={2}
            >
              {getDisplayText(sliders[currentSlide]?.subtitle)}
            </Text>
            <Box 
              fontSize={{ base: "sm", sm: "md", md: "lg", lg: "xl" }} 
              mb={4} 
              color="white" 
              textAlign={isRTL ? 'right' : 'left'}
              dangerouslySetInnerHTML={{ 
                __html: getDisplayText(sliders[currentSlide]?.content) 
              }}
              sx={{
                WebkitLineClamp: { base: 3, md: 4, lg: 'unset' },
                display: '-webkit-box',
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            />
          </Box>
        </MotionBox>

        {/* Slide indicators */}
        <Flex
          position="absolute"
          bottom={{ base: "16px", md: "24px", lg: "40px" }}
          left="50%"
          transform="translateX(-50%)"
          gap={{ base: 2, md: 3, lg: 4 }}
        >
          {sliders.map((_, idx) => (
            <Box
              key={idx}
              onClick={() => handleSlideChange(idx)}
              cursor="pointer"
            >
              <MotionBox
                w={currentSlide === idx ? { base: "16px", md: "20px", lg: "24px" } : { base: "8px", md: "10px" }}
                h={{ base: "8px", md: "10px" }}
                bg="white"
                borderRadius={currentSlide === idx ? "4px" : "full"}
                animate={{
                  width: currentSlide === idx ? (window.innerWidth < 768 ? "16px" : window.innerWidth < 1024 ? "20px" : "24px") : (window.innerWidth < 768 ? "8px" : "10px"),
                  opacity: currentSlide === idx ? 1 : 0.5,
                }}
                transition={{ duration: 0.3 }}
                _hover={{ opacity: 0.8 }}
              />
            </Box>
          ))}
        </Flex>
      </MotionBox>
    </Box>
  );
};

export default HeroSlider;