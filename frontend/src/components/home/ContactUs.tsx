import { 
  Box, 
  Grid, 
  Heading, 
  Text, 
  Input, 
  Button, 
  VStack, 
  Textarea,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalCloseButton,
  ModalBody,
  useDisclosure
} from '@chakra-ui/react';
import { useState, FormEvent, ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';

const ContactUs = () => {
  // Add state for form data
  const [formData, setFormData] = useState({
    item: '',
    email: '',
    details: '',
    quantity: '',
    productNo: '',
    eg: ''
  });

  // Add modal disclosure hook
  const { isOpen: isCaptchaOpen, onOpen: openCaptcha, onClose: closeCaptcha } = useDisclosure();

  const { t } = useTranslation();

  // Handle form input changes
  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle form submission
  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    openCaptcha(); // Open captcha modal on form submission
  };

  return (
    <Box py={20}>
      <Box maxW="1200px" mx="auto" px={4}>
        <Heading size="lg" mb={8}>
          {t('serviceTitle')}
        </Heading>
        <Box
          position="relative"
          borderRadius="2xl"
          overflow="hidden"
          boxShadow="xl"
        >
          {/* Background Image */}
          <Box
            position="absolute"
            top={0}
            left={0}
            right={0}
            bottom={0}
            bgImage="url('https://images.unsplash.com/photo-1578575437130-527eed3abbec?w=800&q=80')" // Replace with your image
            bgSize="cover"
            bgPosition="center"
            filter="brightness(0.9)"
          />
          {/* Gradient Overlay */}
          <Box
            position="absolute"
            top={0}
            left={0}
            right={0}
            bottom={0}
            bg="linear-gradient(45deg, rgba(180, 0, 0, 0.45), rgba(180, 0, 0, 0))"
            boxShadow="inset 0 0 100px rgba(0,0,0,0.5)"
          />
          {/* Content Grid */}
          <Grid
            templateColumns={{ base: "1fr", md: "1fr 1fr" }}
            gap={8}
            position="relative"
            p={12}
          >
            {/* Left Column - Text Content */}
            <Box display="flex" flexDirection="column" justifyContent="center">
              <Heading
                color="white"
                size="lg"
                mb={4}
                maxW="80%"
              >
                {t('serviceTitle')}
              </Heading>
              <Text
                color="whiteAlpha.900"
                fontSize="md"
                maxW="80%"
              >
                {t('serviceSubTitle')}
              </Text>
            </Box>
            {/* Right Column - Contact Form */}
            <Box
              bg="whiteAlpha.100"
              backdropFilter="blur(10px)"
              borderRadius="xl"
              p={6}
              border="1px solid"
              borderColor="whiteAlpha.200"
            >
              <form onSubmit={handleSubmit}>
                <VStack spacing={4}>
                  <Heading
                    color="white"
                    size="sm"
                    alignSelf="flex-start"
                    mb={2}
                  >
                    {t('sendRequest')}
                  </Heading>
                  
                  <Input
                    name="item"
                    value={formData.item}
                    onChange={handleChange}
                    placeholder="What item you need?"
                    bg="whiteAlpha.200"
                    border="none"
                    color="white"
                    _placeholder={{ color: 'whiteAlpha.600' }}
                  />
                  
                  <Input
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="Enter your email ..."
                    bg="whiteAlpha.200"
                    border="none"
                    color="white"
                    _placeholder={{ color: 'whiteAlpha.600' }}
                  />
                  
                  <Textarea
                    name="details"
                    value={formData.details}
                    onChange={handleChange}
                    placeholder="Type more details ..."
                    bg="whiteAlpha.200"
                    border="none"
                    color="white"
                    _placeholder={{ color: 'whiteAlpha.600' }}
                  />
                  
                  <Grid templateColumns="repeat(3, 1fr)" gap={4} w="full">
                    <Input
                      name="quantity"
                      value={formData.quantity}
                      onChange={handleChange}
                      placeholder="Quantity..."
                      bg="whiteAlpha.200"
                      border="none"
                      color="white"
                      _placeholder={{ color: 'whiteAlpha.600' }}
                    />
                    <Input
                      name="productNo"
                      value={formData.productNo}
                      onChange={handleChange}
                      placeholder="Product NO..."
                      bg="whiteAlpha.200"
                      border="none"
                      color="white"
                      _placeholder={{ color: 'whiteAlpha.600' }}
                    />
                    <Input
                      name="eg"
                      value={formData.eg}
                      onChange={handleChange}
                      placeholder="EG..."
                      bg="whiteAlpha.200"
                      border="none"
                      color="white"
                      _placeholder={{ color: 'whiteAlpha.600' }}
                    />
                  </Grid>

                  <Button
                    type="submit"
                    colorScheme="red"
                    w="full"
                    fontWeight="bold"
                  >
                    {t('serviceButton')}
                  </Button>
                </VStack>
              </form>
            </Box>
          </Grid>
        </Box>
      </Box>

      {/* Captcha Modal */}
      <Modal 
        isOpen={isCaptchaOpen} 
        onClose={closeCaptcha} 
        isCentered
        size="md"
      >
        <ModalOverlay 
          bg="blackAlpha.600" 
          backdropFilter="blur(10px)"
        />
        <ModalContent 
          bg="white" 
          borderRadius="xl" 
          boxShadow="2xl"
        >
          <ModalHeader>Verify Captcha</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <Box 
                w="full" 
                h="200px" 
                bg="gray.100" 
                display="flex" 
                alignItems="center" 
                justifyContent="center"
                borderRadius="md"
              >
                Captcha Image Placeholder
              </Box>
              <Input 
                placeholder="Enter Captcha" 
                w="full" 
                textAlign="center" 
              />
              <Button 
                colorScheme="red" 
                w="full"
                onClick={closeCaptcha}
              >
                Verify
              </Button>
            </VStack>
          </ModalBody>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default ContactUs
