import React, { useState } from 'react';
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
  Select,
  useDisclosure
} from '@chakra-ui/react';
import { dummyProducts } from '../data/dummyData';
import { getEn } from '../utils/getEn';

const RequestSample: React.FC = () => {
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const { isOpen: isCaptchaOpen, onOpen: openCaptcha, onClose: closeCaptcha } = useDisclosure();

  const handleProductSelect = (productId: string) => {
    setSelectedProducts(prev => 
      prev.includes(productId) 
        ? prev.filter(id => id !== productId)
        : (prev.length < 3 ? [...prev, productId] : prev)
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    openCaptcha();
  };

  return (
    <Box py={20}>
      <Box maxW="1200px" mx="auto" px={4}>
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
            bgImage="url('https://images.unsplash.com/photo-1578575437130-527eed3abbec?w=800&q=80')"
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
                Request a Sample
              </Heading>
              <Text
                color="whiteAlpha.900"
                fontSize="md"
                maxW="80%"
              >
                Select up to three products and provide your details to request samples from our suppliers.
              </Text>
            </Box>

            {/* Right Column - Request Form */}
            <Box>
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
                      Request Sample
                    </Heading>
                    
                    <Box display="flex" gap={4} w="full">
                      <Input
                        placeholder="First Name"
                        bg="whiteAlpha.200"
                        border="none"
                        color="white"
                        _placeholder={{ color: 'whiteAlpha.600' }}
                        required
                      />
                      <Input
                        placeholder="Last Name"
                        bg="whiteAlpha.200"
                        border="none"
                        color="white"
                        _placeholder={{ color: 'whiteAlpha.600' }}
                        required
                      />
                    </Box>

                    <Input
                      placeholder="Email"
                      type="email"
                      bg="whiteAlpha.200"
                      border="none"
                      color="white"
                      _placeholder={{ color: 'whiteAlpha.600' }}
                      required
                    />

                    <Select
                      placeholder="Select Country"
                      bg="whiteAlpha.200"
                      border="none"
                      color="white"
                      _placeholder={{ color: 'whiteAlpha.600' }}
                      required
                    >
                      <option value="egypt" style={{backgroundColor: 'black'}}>Egypt</option>
                      <option value="usa" style={{backgroundColor: 'black'}}>United States</option>
                    </Select>

                    <Box w="full">
                      <Heading
                        color="white"
                        size="xs"
                        mb={2}
                      >
                        Select Products (1-3)
                      </Heading>
                      <Grid templateColumns="repeat(2, 1fr)" gap={2}>
                        {dummyProducts.map(product => (
                          <Button
                            key={product._id}
                            variant={selectedProducts.includes(product._id) ? 'solid' : 'outline'}
                            colorScheme="whiteAlpha"
                            onClick={() => handleProductSelect(product._id)}
                            size="sm"
                          >
                            {getEn(product.name)}
                          </Button>
                        ))}
                      </Grid>
                    </Box>

                    <Textarea
                      placeholder="Additional Details"
                      bg="whiteAlpha.200"
                      border="none"
                      color="white"
                      _placeholder={{ color: 'whiteAlpha.600' }}
                    />

                    <Button
                      type="submit"
                      bg="red.600"
                      color="white"
                      size="lg"
                      w="full"
                      mt={2}
                      _hover={{ bg: 'red.700' }}
                      isDisabled={selectedProducts.length === 0}
                    >
                      Send Inquiry
                    </Button>
                  </VStack>
                </form>
              </Box>
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

export default RequestSample;