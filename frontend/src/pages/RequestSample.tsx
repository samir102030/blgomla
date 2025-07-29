import React, { useState, useEffect, ChangeEvent, FormEvent } from 'react';
import {
  Box,
  Container,
  Grid,
  FormControl,
  Input,
  Select,
  Textarea,
  Button,
  VStack,
  Text,
  Tag,
  TagLabel,
  TagCloseButton,
  HStack,
  Link,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  CloseButton,
  Heading
} from '@chakra-ui/react';
import { useFormsStore } from '../stores/forms.store';
import { useProductStore } from '../stores/product.store';
import { useTranslation } from 'react-i18next';

interface FormData {
  firstName: string;
  lastName: string;
  companyName: string;
  email: string;
  phone: string;
  products: string[]; // store product._id
  country: string;
  quantity: string; // keep as string for input, convert to number on submit
  message: string;
}

const initialForm: FormData = {
  firstName: '',
  lastName: '',
  companyName: '',
  email: '',
  phone: '',
  products: [],
  country: '',
  quantity: '',
  message: '',
};

const requiredFields = [
  'firstName',
  'lastName',
  'companyName',
  'email',
  'phone',
  'country',
  'quantity',
];

const RequestSample = () => {
  const [formData, setFormData] = useState<FormData>(initialForm);
  const { loading, error, getQuoteSuccess, submitGetQuote, resetStatus } = useFormsStore();
  const { products, getAllProducts } = useProductStore();
  const { t } = useTranslation();

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
    if (getQuoteSuccess || error) resetStatus();
  };

  const handleProductSelect = (e: ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setFormData(prev => {
      if (prev.products.includes(value)) return prev;
      return {
        ...prev,
        products: [...prev.products, value]
      };
    });
    if (getQuoteSuccess || error) resetStatus();
  };

  const removeProduct = (productId: string) => {
    setFormData(prev => ({
      ...prev,
      products: prev.products.filter(id => id !== productId)
    }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!formData.products.length) return;
    for (const field of requiredFields) {
      if (!formData[field as keyof FormData]) return;
    }
    await submitGetQuote({
      firstName: formData.firstName,
      lastName: formData.lastName,
      companyName: formData.companyName,
      email: formData.email,
      phone: formData.phone,
      country: formData.country,
      products: formData.products,
      quantity: formData.quantity,
      message: formData.message || undefined,
    });
    console.log({
      firstName: formData.firstName,
      lastName: formData.lastName,
      companyName: formData.companyName,
      email: formData.email,
      phone: formData.phone,
      country: formData.country,
      products: formData.products,
      quantity: formData.quantity,
      message: formData.message || undefined,
    })
    setFormData(initialForm);
  };

  return (
    <Container maxW="container.xl">
      <form onSubmit={handleSubmit}>
        <Grid templateColumns={{ base: '1fr', md: '1fr 1fr' }} gap={8}>
          {/* Form Section */}
          <VStack spacing={4} align="stretch">
            <Heading size="md" mb={2} color="brand.primary">{t('contactTitle')}</Heading>
            {getQuoteSuccess && (
              <Alert status="success">
                <AlertIcon />
                <Box flex="1">
                  <AlertTitle>{t('requestSentTitle') || 'Request Sent!'}</AlertTitle>
                  <AlertDescription>{t('requestSentDesc') || 'Thank you for contacting us. We will get back to you soon.'}</AlertDescription>
                </Box>
                <CloseButton position="absolute" right="8px" top="8px" onClick={resetStatus} />
              </Alert>
            )}
            {error && (
              <Alert status="error">
                <AlertIcon />
                <Box flex="1">
                  <AlertTitle>{t('errorTitle') || 'Error'}</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Box>
                <CloseButton position="absolute" right="8px" top="8px" onClick={resetStatus} />
              </Alert>
            )}
            {/* Name and Company */}
            <Grid templateColumns="1fr 1fr" gap={4}>
              <FormControl isRequired>
                <Input
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleChange}
                  placeholder={t('firstName') + '...'}
                  borderRadius="md"
                  borderColor="gray.300"
                />
              </FormControl>
              <FormControl isRequired>
                <Input
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  placeholder={t('lastName') + '...'}
                  borderRadius="md"
                  borderColor="gray.300"
                />
              </FormControl>
            </Grid>
            <FormControl isRequired>
              <Input
                name="companyName"
                value={formData.companyName}
                onChange={handleChange}
                placeholder={t('companyName') + '...'}
                borderRadius="md"
                borderColor="gray.300"
              />
            </FormControl>
            {/* Email and Phone */}
            <Grid templateColumns="1fr 1fr" gap={4}>
              <FormControl isRequired>
                <Input
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder={t('contactEmail') + '...'}
                  type="email"
                  borderRadius="md"
                  borderColor="gray.300"
                />
              </FormControl>
              <FormControl isRequired>
                <Input
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder={t('servicePhone')}
                  borderRadius="md"
                  borderColor="gray.300"
                />
              </FormControl>
            </Grid>
            {/* Product and Country */}
            <Grid templateColumns="1fr 1fr" gap={4}>
              <FormControl>
                <Select
                  onChange={handleProductSelect}
                  placeholder={t('contactProduct')}
                  value=""
                >
                  {products.map((product) => (
                    <option
                      key={product._id}
                      value={product._id}
                      disabled={formData.products.includes(product._id)}
                    >
                      {typeof product.name === 'string' ? product.name : (product.name as any)?.en || ''}
                    </option>
                  ))}
                </Select>
                <Box mt={2}>
                  <HStack spacing={2} flexWrap="wrap">
                    {formData.products.map((productId) => {
                      const product = products.find(p => p._id === productId);
                      const productName = product ? (typeof product.name === 'string' ? product.name : (product.name as any)?.en || '') : productId;
                      return (
                        <Tag
                          key={productId}
                          size="md"
                          borderRadius="full"
                          variant="solid"
                          colorScheme="red"
                          mb={2}
                        >
                          <TagLabel>{productName}</TagLabel>
                          <TagCloseButton
                            onClick={() => removeProduct(productId)}
                          />
                        </Tag>
                      );
                    })}
                  </HStack>
                  {formData.products.length > 0 && (
                    <Text fontSize="sm" color="gray.500">
                      {formData.products.length} {t('selectedProducts') || 'selected products'}
                    </Text>
                  )}
                </Box>
              </FormControl>
              <FormControl isRequired>
                <Select
                  name="country"
                  value={formData.country}
                  onChange={handleChange}
                  placeholder={t('contactCountry')}
                >
                  <option value="egypt">Egypt</option>
                  <option value="uae">UAE</option>
                  <option value="ksa">Saudi Arabia</option>
                  <option value="kuwait">Kuwait</option>
                  <option value="qatar">Qatar</option>
                  <option value="oman">Oman</option>
                  <option value="bahrain">Bahrain</option>
                </Select>
              </FormControl>
            </Grid>
            {/* Quantity */}
            <FormControl isRequired>
              <Input
                name="quantity"
                type="number"
                value={formData.quantity}
                onChange={handleChange}
                placeholder={t('contactQuantity')}
                borderRadius="md"
                borderColor="gray.300"
                min={1}
              />
            </FormControl>
            {/* Message */}
            <FormControl>
              <Textarea
                name="message"
                value={formData.message}
                onChange={handleChange}
                placeholder={t('contactMessage')}
                borderRadius="md"
                borderColor="gray.300"
                rows={4}
              />
            </FormControl>
            {/* Submit Button */}
            <Button
              type="submit"
              colorScheme="red"
              width="200px"
              alignSelf="center"
              borderRadius="md"
              size="lg"
              isLoading={loading}
              loadingText={t('sending') || 'Sending...'}
              disabled={loading}
            >
              {t('serviceButton')}
            </Button>
          </VStack>

          {/* Map Section */}
          <Box>
            <Box
              borderRadius="md"
              overflow="hidden"
              border="1px solid"
              borderColor="gray.200"
              position="relative"
            >
              <iframe
                width="100%"
                height="400px"
                title='map'
                frameBorder="0"
                scrolling="no"
                marginHeight={0}
                marginWidth={0}
                src="https://www.openstreetmap.org/export/embed.html?bbox=31.245476603507996%2C29.96270077108272%2C31.247238814830784%2C29.964808375205173&amp;layer=mapnik&marker=29.963754573144%2C31.246357709169"
              />
            </Box>
            {/* Location Details */}
            <VStack mt={4} align="start" spacing={2}>
              <Text fontWeight="bold">{t('ourLocation') || 'Our Location:'}</Text>
              <Text>EGY CHEM HUB</Text>
              <Text>Alexandria, Egypt</Text>
              <Link
                href="https://www.openstreetmap.org/?mlat=29.963754573144&mlon=31.246357709169#map=19/29.96375/31.24636"
                isExternal
                color="red.500"
                fontSize="sm"
              >
                {t('viewLargerMap') || 'View Larger Map'}
              </Link>
            </VStack>
          </Box>
        </Grid>
      </form>
    </Container>
  );
};

export default RequestSample;
