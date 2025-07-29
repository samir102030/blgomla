import { Box, Flex, Text, Heading, Image, HStack, Grid } from "@chakra-ui/react";
import { useEffect } from "react";
import { useAboutStore } from '../../stores/about.store';
import { useTranslation } from "react-i18next";
import { useLanguageDirection } from '../../hooks/useLanguageDirection';

const CustomerPreviews = () => {
  const { mission, fetchMission } = useAboutStore();
  const { i18n, t } = useTranslation();
  const lang = i18n.language || 'en';
  const { isRTL } = useLanguageDirection();

  useEffect(() => {
    fetchMission(lang);
  }, [fetchMission, lang]);

  const getDisplayText = (field: { [key: string]: string } | string): string => {
    if (typeof field === 'string') return field;
    if (field && typeof field === 'object' && field[lang]) return field[lang];
    return field?.en || '';
  };

  return (
    <Box bg="gray.50" py={20}>
      <Box maxW="1200px" mx="auto" px={2}>
        <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={8} alignItems="center">
          {/* Left Column - Hardcoded Info Section */}
          <Box>
            <Heading as="h2" fontSize="3xl" mb={4}>
              {t('commentTitle')}
            </Heading>
            <Text color="gray.600" mb={8}>
              {t('commentDescription')}
            </Text>
            <Flex gap={12}>
              <Box>
                <Text fontSize="2xl" fontWeight="bold">10K+</Text>
                <Text color="gray.600">{t('commentNumber')}</Text>
              </Box>
              <Box>
                <Text fontSize="2xl" fontWeight="bold">3.08</Text>
                <Text color="gray.600">{t('commentRating')}</Text>
                <Flex direction={isRTL ? 'row-reverse' : 'row'} gap={1} mt={1}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Box
                      key={star}
                      color={"yellow.400"}
                      as="span"
                    >
                      ★
                    </Box>
                  ))}
                </Flex>
              </Box>
            </Flex>
          </Box>

          {/* Right Column - Mission Card */}
          <Box>
            <Box
              bg="white"
              borderRadius="2xl"
              borderBottomRightRadius={0}
              p={8}
              boxShadow="sm"
              mb={6}
            >
              <Flex gap={6} align="flex-start">
                <Box flexShrink={0}>
                  <Image
                    src={mission?.image || "/images/uncle-mohamed.jpg"}
                    alt={getDisplayText(mission?.title || t('commentPerson'))}
                    borderRadius="full"
                    boxSize="80px"
                    objectFit="cover"
                  />
                </Box>
                <Box flex={1}>
                  <Flex justify="space-between" align="flex-start" mb={4}>
                    <Box>
                      <Text fontSize="xl" fontWeight="semibold">
                        {mission ? getDisplayText(mission.title) : t('commentPerson')}
                      </Text>
                    </Box>
                  </Flex>
                  <Box 
                    fontSize="lg"
                    dangerouslySetInnerHTML={{ 
                      __html: mission ? getDisplayText(mission.content) : t('commentBody') 
                    }}
                  />
                </Box>
              </Flex>
            </Box>
          </Box>
        </Grid>
      </Box>
    </Box>
  );
};

export default CustomerPreviews;