import { Box, Flex, Text, HStack, Icon } from '@chakra-ui/react'
import { useTranslation } from 'react-i18next'
import { 
  CartIcon, 
  CreditCardIcon, 
  GiftIcon, 
  HeadsetIcon 
} from '../icons/CustomIcons'

const FeatureStrip: React.FC = () => {
  const { t } = useTranslation();

  const features = [
    {
      icon: CartIcon,
      title: t('featureStripViewBuyProduct'),
      subtitle: t('featureStripViewBuyProductSubtitle')
    },
    {
      icon: CreditCardIcon,
      title: t('featureStripQuickPayment'),
      subtitle: t('featureStripQuickPaymentSubtitle')
    },
    {
      icon: GiftIcon,
      title: t('featureStripBigCashback'),
      subtitle: t('featureStripBigCashbackSubtitle')
    },
    {
      icon: HeadsetIcon,
      title: t('featureStripSupport'),
      subtitle: t('featureStripSupportSubtitle')
    }
  ];

  return (
    <Box position="relative" pb={6}>
      <Flex
        maxW="container.xl"
        mx="auto"
        justify="space-between"
        px={8}
        py={4}
        wrap="wrap"
        gap={6}
      >
        {features.map((feat, idx) => (
          <HStack key={idx} spacing={3} minW="200px">
            <Icon 
              as={feat.icon} 
              boxSize={6} 
              color="red.600"
            />
            <Box>
              <Text fontWeight="medium" fontSize="sm">
                {feat.title}
              </Text>
              <Text fontSize="xs" color="gray.500">
                {feat.subtitle}
              </Text>
            </Box>
          </HStack>
        ))}
      </Flex>

      <Box
        position="absolute"
        bottom={0}
        left="16.67%"
        right="16.67%"
        height="1px"
        bg="gray.200"
      />
    </Box>
  );
};

export default FeatureStrip