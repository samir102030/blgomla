import { 
    Box, 
    Grid, 
    Heading, 
    Text, 
    Image, 
    Button, 
    VStack, 
    HStack,
    Icon,
    Flex
  } from "@chakra-ui/react";
  import { useEffect, useState } from 'react';
  import { useAboutStore } from '../../stores/about.store';
  import { visionAPI } from '../../utils/api';
  import { useUserStore } from '../../stores/user.store';
  import React from 'react';
  import { MdVisibility, MdStar, MdEmojiObjects, MdTrendingUp, MdGroups, MdLocalPharmacy, MdHealthAndSafety } from 'react-icons/md';
  import { FaLightbulb, FaRegEye, FaRocket, FaBullseye, FaCrown, FaShieldAlt } from 'react-icons/fa';
  import { GiPotionBall } from 'react-icons/gi';
  import { useTranslation } from "react-i18next";
  import { useLanguageDirection } from '../../hooks/useLanguageDirection';
  
  const visionIconOptions = [
    { name: 'MdVisibility', icon: MdVisibility },
    { name: 'FaLightbulb', icon: FaLightbulb },
    { name: 'MdStar', icon: MdStar },
    { name: 'FaRegEye', icon: FaRegEye },
    { name: 'MdEmojiObjects', icon: MdEmojiObjects },
    { name: 'FaRocket', icon: FaRocket },
    { name: 'MdTrendingUp', icon: MdTrendingUp },
    { name: 'FaBullseye', icon: FaBullseye },
    { name: 'MdGroups', icon: MdGroups },
    { name: 'FaCrown', icon: FaCrown },
    { name: 'GiPotionBall', icon: GiPotionBall },
    { name: 'MdLocalPharmacy', icon: MdLocalPharmacy },
    { name: 'MdHealthAndSafety', icon: MdHealthAndSafety },
    { name: 'FaShieldAlt', icon: FaShieldAlt },
  ];

  const CommitmentSection = () => {
    const { values, fetchValues } = useAboutStore();
    const [visions, setVisions] = useState<any[]>([]);
    const [loadingVisions, setLoadingVisions] = useState(false);
    const lang = useUserStore(state => state.lang);
    const { t, i18n } = useTranslation();
    const { isRTL } = useLanguageDirection();

    useEffect(() => {
      fetchValues(lang);
      fetchVisions();
    }, [fetchValues, lang]);

    const fetchVisions = async () => {
      setLoadingVisions(true);
      try {
        const data = await visionAPI.getAll({ lang });
        setVisions(Array.isArray(data) ? data : (data.vision ? [data.vision] : []));
      } catch {
        setVisions([]);
      } finally {
        setLoadingVisions(false);
      }
    };

    const getDisplayText = (field: { en: string; ar?: string; fr?: string; de?: string; zh?: string; es?: string; ru?: string; ja?: string } | string): string => {
      if (typeof field === 'string') return field;
      const currentLang = (i18n.language || lang || 'en').toLowerCase();
      if (field && typeof field === 'object' && (field as any)[currentLang]) {
        return (field as any)[currentLang];
      }
      return field?.en || '';
    };

    return (
      <Box py={20} maxW="1200px" mx="auto" px={4}>
        <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={12}>
          {/* Left Column - Dynamic Visions */}
          <Box>
            <Heading size="lg" mb={8} textAlign={isRTL ? 'right' : 'left'}>
              {t('commitmentQuality')}
            </Heading>
            <VStack spacing={6} align="stretch">
              {loadingVisions ? (
                <Text textAlign={isRTL ? 'right' : 'left'}>{t('loading')}</Text>
              ) : visions.length === 0 ? (
                <Text color="gray.500" textAlign={isRTL ? 'right' : 'left'}>{t('noVisionsFound')}</Text>
              ) : (
                visions.map((vision) => (
                  <Flex
                    gap={4}
                    align="flex-start"
                    key={vision._id}
                    direction={isRTL ? 'row-reverse' : 'row'}
                    dir={isRTL ? 'rtl' : 'ltr'}
                  >
                    <Box
                      bg="red.600"
                      p={4}
                      borderRadius="lg"
                      color="white"
                      minW="56px"
                      minH="56px"
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                    >
                      {(() => {
                        const iconObj = visionIconOptions.find(opt => opt.name === vision.image);
                        if (iconObj) {
                          const IconComp = iconObj.icon;
                          return React.createElement(IconComp as React.ComponentType<any>, { size: 32, color: '#fff' });
                        }
                        return null;
                      })()}
                    </Box>
                    <Box textAlign={isRTL ? 'right' : 'left'} width="100%">
                      <Heading size="md" mb={2} textAlign={isRTL ? 'right' : 'left'}>
                        {getDisplayText(vision.title)}
                      </Heading>
                      <Box color="gray.600" textAlign={isRTL ? 'right' : 'left'} dangerouslySetInnerHTML={{ __html: getDisplayText(vision.content) }} />
                    </Box>
                  </Flex>
                ))
              )}
            </VStack>
          </Box>
  
          {/* Right Column - Values Card */}
          <Box>
            <Box
              bg="gray.50"
              borderRadius="xl"
              overflow="hidden"
              position="relative"
              display="flex"
              flexDirection={{ base: 'column', md: 'row' }}
              minH="340px"
            >
              <Grid templateColumns={{ base: '1fr', md: '1fr 1fr' }} gap={0} alignItems="stretch">
                <Box p={8} display="flex" flexDirection="column" justifyContent="center">
                  <Text color="gray.900" mb={2} fontWeight="bold" fontSize="lg" textAlign={isRTL ? 'right' : 'left'}>{t('bigSale')}</Text>
                  <Heading size="lg" mb={2} lineHeight="tight" textAlign={isRTL ? 'right' : 'left'}>
                    {values ? getDisplayText(values.title) : t('bigSale')}
                  </Heading>
                  <Box fontSize="sm" color="gray.600" mb={6} textAlign={isRTL ? 'right' : 'left'} dangerouslySetInnerHTML={{ __html: values ? getDisplayText(values.content) : 'Al Hamad Paints Manufacturing Company Products' }} />
                  <Button
                    bg="red.600"
                    color="white"
                    _hover={{ bg: 'red.700' }}
                    size="lg"
                    px={8}
                    py={6}
                    borderRadius="full"
                    fontSize="xl"
                    fontWeight="bold"
                    mt={2}
                    w="fit-content"
                  >
                    {t('shopNow')}
                  </Button>
                </Box>
                <Box display="flex" alignItems="center" justifyContent="center" bg="white">
                  <Image
                    src={values?.image || "/images/news3.jpg"}
                    alt={values ? getDisplayText(values.title) : t('values')}
                    objectFit="cover"
                    h="100%"
                    w="100%"
                    maxH="340px"
                  />
                </Box>
              </Grid>
            </Box>
          </Box>
        </Grid>
      </Box>
    );
  };
  
  export default CommitmentSection;