import React from 'react';
import {
  Box,
  Container,
  Heading,
  Text,
  SimpleGrid,
  Image,
  Flex,
  Icon,
  VStack,
  HStack,
  Button,
  useColorModeValue,
} from '@chakra-ui/react';
import { FaShippingFast, FaFlask, FaIndustry, FaGlobe, FaHandshake, FaChartLine } from 'react-icons/fa';
import { IconType } from 'react-icons';

// Define the ServiceCard component with proper typing
const ServiceCard = ({ 
  title, 
  description, 
  icon 
}: { 
  title: string; 
  description: string; 
  icon: React.ReactElement;
}) => {
  const cardBg = useColorModeValue('white', 'gray.700');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  
  return (
    <Box
      bg={cardBg}
      p={6}
      borderRadius="lg"
      boxShadow="md"
      borderWidth="1px"
      borderColor={borderColor}
      transition="all 0.3s"
      _hover={{
        transform: 'translateY(-5px)',
        boxShadow: 'lg',
        borderColor: 'red.300',
      }}
    >
      <Flex direction="column" align="center" textAlign="center">
        <Box
          bg="red.50"
          p={3}
          borderRadius="full"
          mb={4}
          color="brand.primary"
        >
          {icon}
        </Box>
        <Heading size="md" mb={3} color="brand.primary">
          {title}
        </Heading>
        <Text>{description}</Text>
      </Flex>
    </Box>
  );
};

// Helper function to create icons with proper typing
const createIcon = (IconComponent: IconType, size: number = 6) => {
  return <Icon as={IconComponent as any} boxSize={size} />;
};

const Services = () => {
  // Define services array
  const services = [
    {
      title: 'Premium Chemical Products',
      description: 'Access to over 1000 high-quality chemical products that meet international standards and specifications.',
      icon: createIcon(FaFlask),
    },
    {
      title: 'Bulk Order Discounts',
      description: 'Special pricing and logistics support for large quantity orders with timely delivery guarantees.',
      icon: createIcon(FaIndustry),
    },
    {
      title: 'Sample Inspection',
      description: 'Request small samples before committing to larger orders to ensure quality and suitability for your needs.',
      icon: createIcon(FaHandshake),
    },
    {
      title: 'Global Distribution',
      description: 'Efficient shipping and logistics solutions to deliver your orders anywhere in the world with tracking.',
      icon: createIcon(FaGlobe),
    },
    {
      title: 'Express Shipping',
      description: 'Fast delivery options for urgent requirements, with expedited processing and priority handling.',
      icon: createIcon(FaShippingFast),
    },
    {
      title: 'Market Analysis',
      description: 'Stay informed with our industry reports and market trends to make better purchasing decisions.',
      icon: createIcon(FaChartLine),
    },
  ];

  // Define the features for the "Why Choose Us" section
  const features = [
    {
      title: "Quality Assurance",
      description: "All our products undergo rigorous quality control to ensure they meet international standards and specifications.",
    },
    {
      title: "Expert Consultation",
      description: "Our team of chemical experts is available to provide guidance and recommendations for your specific needs.",
    },
    {
      title: "Competitive Pricing",
      description: "We offer competitive prices without compromising on quality, with special discounts for bulk orders.",
    },
    {
      title: "Reliable Delivery",
      description: "Our efficient logistics network ensures timely delivery of your orders, with tracking available for all shipments.",
    },
  ];

  return (
    <Box>
      {/* Hero Section */}
      <Box bg="brand.primary" color="white" py={12}>
        <Container maxW="container.xl">
          <Flex direction={{ base: 'column', md: 'row' }} align="center" justify="space-between">
            <Box maxW={{ base: '100%', md: '50%' }} mb={{ base: 8, md: 0 }}>
              <Heading size="2xl" mb={4}>
                Our Services
              </Heading>
              <Text fontSize="lg" mb={6}>
                EGY CHEM HUB provides comprehensive chemical supply solutions tailored to meet the diverse needs of industries across the Middle East and North Africa region.
              </Text>
              <Button colorScheme="white" variant="outline" size="lg">
                Contact Us
              </Button>
            </Box>
            <Box maxW={{ base: '100%', md: '45%' }}>
              <Image 
                src="/banner/img1.png" 
                alt="Chemical Services" 
                borderRadius="lg"
                boxShadow="2xl"
              />
            </Box>
          </Flex>
        </Container>
      </Box>

      {/* Services Grid */}
      <Container maxW="container.xl" py={16}>
        <VStack spacing={12}>
          <Box textAlign="center" maxW="800px" mx="auto">
            <Heading mb={4}>Comprehensive Chemical Solutions</Heading>
            <Text fontSize="lg" color="gray.600">
              Our range of services is designed to provide you with a seamless experience from product selection to delivery, ensuring you get the right chemicals for your specific requirements.
            </Text>
          </Box>

          <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={8} width="100%">
            {services.map((service, index) => (
              <ServiceCard
                key={index}
                title={service.title}
                description={service.description}
                icon={service.icon}
              />
            ))}
          </SimpleGrid>
        </VStack>
      </Container>

      {/* Why Choose Us */}
      <Box bg="gray.50" py={16}>
        <Container maxW="container.xl">
          <VStack spacing={12}>
            <Heading textAlign="center">Why Choose Our Services</Heading>
            
            <SimpleGrid columns={{ base: 1, md: 2 }} spacing={10}>
              {features.map((item, index) => (
                <HStack key={index} align="start" spacing={4}>
                  <Box
                    bg="brand.primary"
                    color="white"
                    borderRadius="full"
                    p={2}
                    fontSize="lg"
                    fontWeight="bold"
                    width="32px"
                    height="32px"
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                  >
                    {index + 1}
                  </Box>
                  <Box>
                    <Heading size="md" mb={2}>{item.title}</Heading>
                    <Text>{item.description}</Text>
                  </Box>
                </HStack>
              ))}
            </SimpleGrid>
          </VStack>
        </Container>
      </Box>

      {/* CTA Section */}
      <Box py={16}>
        <Container maxW="container.xl">
          <Flex
            direction={{ base: 'column', md: 'row' }}
            align="center"
            justify="space-between"
            bg="red.50"
            p={8}
            borderRadius="lg"
            boxShadow="md"
          >
            <VStack align={{ base: 'center', md: 'start' }} spacing={4} mb={{ base: 6, md: 0 }}>
              <Heading size="lg">Ready to Get Started?</Heading>
              <Text fontSize="lg">
                Contact our team today to discuss your chemical supply needs and discover how we can help your business.
              </Text>
            </VStack>
            <HStack spacing={4}>
              <Button colorScheme="red" size="lg">
                Request a Quote
              </Button>
              <Button variant="outline" colorScheme="red" size="lg">
                Contact Sales
              </Button>
            </HStack>
          </Flex>
        </Container>
      </Box>
    </Box>
  );
};

export default Services;


