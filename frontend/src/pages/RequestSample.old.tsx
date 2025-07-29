import { Box, Grid, Heading, Text, Input, Button, VStack, Textarea, Select, Alert, AlertIcon, AlertTitle, AlertDescription, CloseButton } from '@chakra-ui/react'
import React, { useState, useEffect, ChangeEvent, FormEvent } from 'react';
import { useFormsStore } from '../stores/forms.store';
import { useProductStore } from '../stores/product.store';
// import { useTranslation } from '../languages/i18n';
import { useTranslation } from 'react-i18next';
import "../languages/i18n";
import { useUserStore } from '../stores/user.store';

interface SupplierFormData {
  item: string;
  email: string;
  details: string;
  quantity: string;
  phone: string;
}

const initialForm: SupplierFormData = {
  item: '',
  email: '',
  details: '',
  quantity: '',
  phone: '',
};

const requiredFields = [
  'item',
  'email',
  'quantity',
  'phone',
];

const RequestSampleOld = () => {
  const {t} = useTranslation();
  const [formData, setFormData] = useState<SupplierFormData>(initialForm);
  const { loading, error, supplierSuccess, submitSupplierRequest, resetStatus } = useFormsStore();
  const { products, getAllProducts } = useProductStore();

  useEffect(() => {
    if (products.length === 0) {
      getAllProducts();
    }
  }, [products.length, getAllProducts]);

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (supplierSuccess || error) resetStatus();
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    for (const field of requiredFields) {
      if (!formData[field as keyof SupplierFormData]) return;
    }
    await submitSupplierRequest({
      item: formData.item,
      email: formData.email,
      details: formData.details,
      quantity: String(Number(formData.quantity)),
      phone: formData.phone,
    });
    setFormData(initialForm);
  };

  return (
    <Box py={20}>
      <Box maxW="1200px" mx="auto" px={4}>
        <Heading size="lg" mb={8}>
          {t("Contact Us")}
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
                {t("serviceTitle")}
              </Heading>
              <Text
                color="whiteAlpha.900"
                fontSize="md"
                maxW="80%"
              >
                {t("serviceSubTitle")}
              </Text>
            </Box>

            {/* Right Column - Contact Form */}
            <Box>
              <Box
                bg="whiteAlpha.100"
                backdropFilter="blur(10px)"
                borderRadius="xl"
                p={6}
                border="1px solid"
                borderColor="whiteAlpha.200"
              >
                {/* Form Title at the top of the card, above the form */}
                <Heading
                  color="white"
                  size="md"
                  mb={4}
                  textAlign="center"
                >
                  {t('serviceTitle')}
                </Heading>
                <form onSubmit={handleSubmit}>
                  <VStack spacing={4}>
                    {supplierSuccess && (
                      <Alert status="success">
                        <AlertIcon />
                        <Box flex="1">
                          <AlertTitle>Request Sent!</AlertTitle>
                          <AlertDescription>Thank you for contacting us. We will get back to you soon.</AlertDescription>
                        </Box>
                        <CloseButton position="absolute" right="8px" top="8px" onClick={resetStatus} />
                      </Alert>
                    )}
                    {error && (
                      <Alert status="error">
                        <AlertIcon />
                        <Box flex="1">
                          <AlertTitle>Error</AlertTitle>
                          <AlertDescription>{error}</AlertDescription>
                        </Box>
                        <CloseButton position="absolute" right="8px" top="8px" onClick={resetStatus} />
                      </Alert>
                    )}
                    <Select
                      name="item"
                      value={formData.item}
                      onChange={handleChange}
                      placeholder={t("serviceItem")}
                      border="none"
                      bg="whiteAlpha.200"
                      color="black"
                      // bg="whiteAlpha.200"
                      // color="white"
                      _placeholder={{ color: 'whiteAlpha.600' }}
                    >
                      {products.map((product) => (
                        <option
                          key={product._id}
                          value={typeof product.name === 'string' ? product.name : (product.name as any)?.en || ''}
                        >
                          {typeof product.name === 'string' ? product.name : (product.name as any)?.en || ''}
                        </option>
                      ))}
                    </Select>
                    <Input
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder={t("serviceMail")}
                      bg="whiteAlpha.200"
                      border="none"
                      color="white"
                      _placeholder={{ color: 'whiteAlpha.600' }}
                      type="email"
                    />
                    <Textarea
                      name="details"
                      value={formData.details}
                      onChange={handleChange}
                      placeholder={t("serviceDetails")}
                      bg="whiteAlpha.200"
                      border="none"
                      color="white"
                      _placeholder={{ color: 'whiteAlpha.600' }}
                    />
                    <Grid templateColumns="repeat(2, 1fr)" gap={4} w="full">
                      <Input
                        name="quantity"
                        value={formData.quantity}
                        onChange={handleChange}
                        placeholder={t("serviceQuantity")}
                        bg="whiteAlpha.200"
                        border="none"
                        color="white"
                        _placeholder={{ color: 'whiteAlpha.600' }}
                        type="number"
                        min={1}
                      />
                      <Input
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        placeholder={t("servicePhone")}
                        bg="whiteAlpha.200"
                        border="none"
                        color="white"
                        _placeholder={{ color: 'whiteAlpha.600' }}
                      />
                    </Grid>
                    {/* Button is always last in the VStack */}
                    <Button
                      bg="red.600"
                      color="white"
                      size="lg"
                      w="full"
                      mt={2}
                      _hover={{ bg: 'red.700' }}
                      type="submit"
                      isLoading={loading}
                      loadingText="Sending..."
                      disabled={loading}
                    >
                      {t("serviceButton")}
                    </Button>
                  </VStack>
                </form>
              </Box>
            </Box>
          </Grid>
        </Box>
      </Box>
    </Box>
  )
}

export default RequestSampleOld