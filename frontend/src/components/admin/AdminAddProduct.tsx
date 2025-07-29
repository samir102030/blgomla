import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Flex,
  Heading,
  FormControl,
  FormLabel,
  Input,
  Select,
  Textarea,
  Button,
  Grid,
  VStack,
  HStack,
  Switch,
  Text,
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  Divider,
  InputGroup,
  InputRightElement,
  Icon,
  Alert,
  AlertIcon,
  useToast,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
} from '@chakra-ui/react';
import { ChevronRightIcon, CalendarIcon, AttachmentIcon } from '@chakra-ui/icons';
import { useNavigate } from 'react-router-dom';
import AdminActionButtons from './AdminActionButtons';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { productsAPI, categoriesAPI, brandsAPI, uploadAPI } from '../../utils/api';

interface ValidationErrors {
  productName: string;
  category: string;
  brand: string;
  image: string;
  description: string;
}

interface Category {
  _id: string;
  name: string | { en?: string; ar?: string; fr?: string; de?: string; zh?: string; es?: string; ru?: string; } | any;
}

interface Brand {
  _id: string;
  name: string | { en?: string; ar?: string; fr?: string; de?: string; zh?: string; es?: string; ru?: string; } | any;
}

const AdminAddProduct = () => {
  const navigate = useNavigate();
  const toast = useToast();
  
  // Form data state
  const [formData, setFormData] = useState({
    // Basic Info
    productName: '',
    brand: '',
    category: '',
    description: '',
    
    // Meta Content
    metaTitle: '',
    metaDescription: '',
    
    // Technical Details
    chemicalName: '',
    certifications: '',
    casNo: '',
    hsCode: '',
    grade: '',
    commercialName: '',
    
    // Usage & Packaging
    usageApplications: '',
    storage: '',
    packagingType: '',
    packingType: '',
    safetyStandard: '',
    minimumQuantities: '',
    
    // Sale Settings
    saleStartDate: '',
    saleEndDate: '',
    salePercentage: '',
  });

  // File states
  const [productImage, setProductImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [tdsFile, setTdsFile] = useState<File | null>(null);
  const [msdsFile, setMsdsFile] = useState<File | null>(null);
  const [coaFile, setCoaFile] = useState<File | null>(null);

  // Options data
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);

  // Refs
  const productImageInputRef = useRef<HTMLInputElement>(null);
  const tdsInputRef = useRef<HTMLInputElement>(null);
  const msdsInputRef = useRef<HTMLInputElement>(null);
  const coaInputRef = useRef<HTMLInputElement>(null);

  // Component state
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({
    productName: '',
    category: '',
    brand: '',
    image: '',
    description: ''
  });

  // Grade options
  const gradeOptions = [
    { value: 'industrial', label: 'Industrial' },
    { value: 'food', label: 'Food' },
    { value: 'pharmaceutical', label: 'Pharmaceutical' }
  ];

  useEffect(() => {
    loadSelectOptions();
  }, []);

  const loadSelectOptions = async () => {
    try {
      setLoading(true);
      const [categoriesResponse, brandsResponse] = await Promise.all([
        categoriesAPI.getAll(),
        brandsAPI.getAll()
      ]);
      
      setCategories(categoriesResponse.categories || categoriesResponse || []);
      setBrands(brandsResponse.brands || brandsResponse || []);
    } catch (error) {
      console.error('Failed to load select options:', error);
      toast({
        title: 'Warning',
        description: 'Failed to load categories and brands',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear validation error when user starts typing
    if (validationErrors[field as keyof ValidationErrors]) {
      setValidationErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setProductImage(file);
      
      // Create preview URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      
      // Clear validation error
      if (validationErrors.image) {
        setValidationErrors(prev => ({ ...prev, image: '' }));
      }
    }
  };

  const handleDocumentChange = (file: File | null, setter: (file: File | null) => void) => {
    if (file) {
      // Validate file type (PDF only)
      if (file.type !== 'application/pdf') {
        toast({
          title: 'Invalid file type',
          description: 'Please select a PDF file',
          status: 'error',
          duration: 3000,
          isClosable: true,
        });
        return;
      }

      // Validate file size (10MB limit)
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: 'File too large',
          description: 'Please select a file smaller than 10MB',
          status: 'error',
          duration: 3000,
          isClosable: true,
        });
        return;
      }

      setter(file);
    }
  };

  const validateForm = (): boolean => {
    const errors: ValidationErrors = {
      productName: '',
      category: '',
      brand: '',
      image: '',
      description: ''
    };

    if (!formData.productName.trim()) {
      errors.productName = 'Product name is required';
    }

    if (!formData.category) {
      errors.category = 'Category is required';
    }

    if (!formData.brand) {
      errors.brand = 'Brand is required';
    }

    if (!productImage) {
      errors.image = 'Product image is required';
    }

    if (!formData.description.trim()) {
      errors.description = 'Product description is required';
    }

    setValidationErrors(errors);
    return Object.values(errors).every(error => error === '');
  };

  const uploadDocument = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('myFile', file);
    
    const response = await fetch('http://localhost:5002/api/cloudinary/upload', {
      method: 'POST',
      credentials: 'include',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Upload failed');
    }

    const result = await response.json();
    return result.publicId; // Return the public ID for storage
  };

  const handleSave = async () => {
    if (!validateForm()) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    try {
      setSaving(true);
      setError(null);

      let imageUrl = '';
      let tdsPublicId = '';
      let msdsPublicId = '';
      let coaPublicId = '';

      // Upload product image
      if (productImage) {
        console.log('Uploading product image...');
        const uploadResponse = await uploadAPI.uploadImage(productImage);
        imageUrl = uploadResponse.url;
        console.log('Product image uploaded:', imageUrl);
      }

      // Upload sensitive documents
      if (tdsFile) {
        console.log('Uploading TDS document...');
        tdsPublicId = await uploadDocument(tdsFile);
        console.log('TDS uploaded:', tdsPublicId);
      }

      if (msdsFile) {
        console.log('Uploading MSDS document...');
        msdsPublicId = await uploadDocument(msdsFile);
        console.log('MSDS uploaded:', msdsPublicId);
      }

      if (coaFile) {
        console.log('Uploading COA document...');
        coaPublicId = await uploadDocument(coaFile);
        console.log('COA uploaded:', coaPublicId);
      }

      // Strip HTML tags from description
      const stripHtml = (html: string) => {
        const tmp = document.createElement('div');
        tmp.innerHTML = html;
        return tmp.textContent || tmp.innerText || '';
      };

      const cleanDescription = stripHtml(formData.description);

      const productData = {
        // Basic Info
        name: { en: formData.productName.trim() },
        description: { en: cleanDescription.trim() },
        image: imageUrl,
        category: formData.category,
        brand: formData.brand,
        
        // Meta Content
        ...(formData.metaTitle.trim() && { metaTitle: { en: formData.metaTitle.trim() } }),
        ...(formData.metaDescription.trim() && { metaDescription: { en: formData.metaDescription.trim() } }),
        
        // Technical Details
        ...(formData.chemicalName.trim() && { chemicalName: { en: formData.chemicalName.trim() } }),
        ...(formData.certifications.trim() && { certifications: { en: formData.certifications.trim() } }),
        ...(formData.casNo.trim() && { casNo: formData.casNo.trim() }),
        ...(formData.hsCode.trim() && { hsCode: formData.hsCode.trim() }),
        ...(formData.grade && { grade: { en: formData.grade } }),
        ...(formData.commercialName.trim() && { commercialName: { en: formData.commercialName.trim() } }),
        
        // Usage & Packaging
        ...(formData.usageApplications.trim() && { usageApplications: { en: formData.usageApplications.trim() } }),
        ...(formData.storage.trim() && { storage: { en: formData.storage.trim() } }),
        ...(formData.packagingType.trim() && { packagingType: formData.packagingType.trim() }),
        ...(formData.packingType.trim() && { packingType: formData.packingType.trim() }),
        ...(formData.safetyStandard.trim() && { safetyStandard: { en: formData.safetyStandard.trim() } }),
        ...(formData.minimumQuantities && { minimumQuantities: parseInt(formData.minimumQuantities) }),
        
        // Sale Settings
        ...(formData.saleStartDate && { saleStartDate: formData.saleStartDate }),
        ...(formData.saleEndDate && { saleEndDate: formData.saleEndDate }),
        ...(formData.salePercentage && { salePercentage: parseInt(formData.salePercentage) }),
        
        // Sensitive Documents
        ...(tdsPublicId && { tds: tdsPublicId }),
        ...(msdsPublicId && { msds: msdsPublicId }),
        ...(coaPublicId && { coa: coaPublicId }),
      };

      console.log('Creating product with data:', productData);
      const response = await productsAPI.create(productData);
      console.log('Product created successfully:', response);

      toast({
        title: 'Success',
        description: 'Product created successfully',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });

      navigate('/admin/products');
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create product';
      console.error('Save error:', err);
      setError(errorMessage);
      toast({
        title: 'Error',
        description: errorMessage,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    navigate('/admin/products');
  };

  return (
    <Box p={6}>
      {/* Breadcrumb */}
      <Breadcrumb spacing="8px" separator={<ChevronRightIcon color="gray.500" />} mb={6}>
        <BreadcrumbItem>
          <BreadcrumbLink href="/admin/products" color="gray.600">Products</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbItem isCurrentPage>
          <BreadcrumbLink href="#" fontWeight="bold">Add Product</BreadcrumbLink>
        </BreadcrumbItem>
      </Breadcrumb>

      {error && (
        <Alert status="error" mb={6}>
          <AlertIcon />
          {error}
        </Alert>
      )}

      {/* Main Form */}
      <Box bg="white" borderRadius="lg" p={6} boxShadow="sm">
        <VStack spacing={8} align="stretch">
          
          {/* Basic Info Section */}
          <Box>
            <Heading size="md" color="gray.700" mb={4}>Basic Info</Heading>
            <Grid templateColumns={{ base: '1fr', md: '1fr 1fr' }} gap={6}>
              <FormControl isInvalid={!!validationErrors.productName}>
                <FormLabel color="gray.600">Product Name *</FormLabel>
                <Input
                  placeholder="Enter product name"
                  value={formData.productName}
                  onChange={(e) => handleInputChange('productName', e.target.value)}
                  borderColor={validationErrors.productName ? 'red.300' : 'gray.200'}
                />
                {validationErrors.productName && (
                  <Text fontSize="sm" color="red.500" mt={1}>{validationErrors.productName}</Text>
                )}
                <Text fontSize="xs" color="#B40519" mt={1} cursor="pointer">
                  🔗 Automatic translation
                </Text>
              </FormControl>

              <FormControl isInvalid={!!validationErrors.brand}>
                <FormLabel color="gray.600">Brand *</FormLabel>
                <Select 
                  placeholder="Select brand"
                  value={formData.brand}
                  onChange={(e) => handleInputChange('brand', e.target.value)}
                  borderColor={validationErrors.brand ? 'red.300' : 'gray.200'}
                  isDisabled={loading}
                >
                  {brands.map((brand) => (
                    <option key={brand._id} value={brand._id}>
                      {typeof brand.name === 'string' ? brand.name : (brand.name?.en || brand.name || 'Unknown Brand')}
                    </option>
                  ))}
                </Select>
                {validationErrors.brand && (
                  <Text fontSize="sm" color="red.500" mt={1}>{validationErrors.brand}</Text>
                )}
              </FormControl>

              <FormControl isInvalid={!!validationErrors.category}>
                <FormLabel color="gray.600">Category/Industry *</FormLabel>
                <Select 
                  placeholder="Select category"
                  value={formData.category}
                  onChange={(e) => handleInputChange('category', e.target.value)}
                  borderColor={validationErrors.category ? 'red.300' : 'gray.200'}
                  isDisabled={loading}
                >
                  {categories.map((category) => (
                    <option key={category._id} value={category._id}>
                      {typeof category.name === 'string' ? category.name : (category.name?.en || category.name || 'Unknown Category')}
                    </option>
                  ))}
                </Select>
                {validationErrors.category && (
                  <Text fontSize="sm" color="red.500" mt={1}>{validationErrors.category}</Text>
                )}
              </FormControl>

              <FormControl isInvalid={!!validationErrors.image}>
                <FormLabel color="gray.600">Product Image *</FormLabel>
                <Input
                  type="file"
                  accept="image/*"
                  ref={productImageInputRef}
                  display="none"
                  onChange={handleImageChange}
                />
                <Box flex="1" position="relative">
                  <Flex align="center" h="40px" borderRadius="lg" border={`2px solid ${validationErrors.image ? '#E53E3E' : '#E2E8E0'}`} pl={3} pr={0} py={3}>
                    <Text fontFamily="IBM Plex Sans" fontSize="18px" color="#8D8D8D" flex="1">
                      {productImage ? productImage.name : 'upload product image'}
                    </Text>
                    <Box
                      bg="#EAEAEA"
                      h="40px"
                      w="120px"
                      borderTopRightRadius="8px"
                      borderBottomRightRadius="8px"
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                      cursor="pointer"
                      onClick={() => productImageInputRef.current?.click()}
                    >
                      <Text fontFamily="IBM Plex Sans" fontSize="16px" color="#424242" fontWeight={500}>Choose File</Text>
                    </Box>
                  </Flex>
                </Box>
                {validationErrors.image && (
                  <Text fontSize="sm" color="red.500" mt={1}>{validationErrors.image}</Text>
                )}
                {imagePreview && (
                  <Box mt={2}>
                    <img src={imagePreview} alt="Preview" style={{ maxHeight: '120px', borderRadius: '8px' }} />
                  </Box>
                )}
                <Text fontSize="xs" color="gray.400" mt={1}>
                  Recommended size: 400x400px
                </Text>
              </FormControl>
            </Grid>

            {/* Description */}
            <FormControl mt={6} isInvalid={!!validationErrors.description}>
              <FormLabel color="gray.600">Description *</FormLabel>
              <ReactQuill
                theme="snow"
                value={formData.description}
                onChange={value => handleInputChange('description', value)}
                style={{ 
                  minHeight: 120, 
                  border: `1px solid ${validationErrors.description ? '#E53E3E' : '#E2E8F0'}`, 
                  borderRadius: '8px', 
                  background: 'white' 
                }}
              />
              {validationErrors.description && (
                <Text fontSize="sm" color="red.500" mt={1}>{validationErrors.description}</Text>
              )}
              <Flex justify="space-between" mt={1}>
                <Text fontSize="xs" color="#B40519" cursor="pointer">
                  🔗 Automatic translation
                </Text>
                <Text fontSize="xs" color="gray.400">
                  {formData.description ? formData.description.replace(/<[^>]+>/g, '').split(' ').filter(word => word.length > 0).length : 0} words
                </Text>
              </Flex>
            </FormControl>
          </Box>

          <Divider />

          {/* Meta Content Section */}
          <Box>
            <Heading size="md" color="gray.700" mb={4}>Meta Content</Heading>
            <Grid templateColumns={{ base: '1fr', md: '1fr 1fr' }} gap={6}>
              <FormControl>
                <FormLabel color="gray.600">Meta Title</FormLabel>
                <Input
                  placeholder="Enter meta title"
                  value={formData.metaTitle}
                  onChange={(e) => handleInputChange('metaTitle', e.target.value)}
                />
                <Text fontSize="xs" color="#B40519" mt={1} cursor="pointer">
                  🔗 Automatic translation
                </Text>
              </FormControl>

              <FormControl>
                <FormLabel color="gray.600">Meta Description</FormLabel>
                <Input
                  placeholder="Enter meta description"
                  value={formData.metaDescription}
                  onChange={(e) => handleInputChange('metaDescription', e.target.value)}
                />
                <Text fontSize="xs" color="#B40519" mt={1} cursor="pointer">
                  🔗 Automatic translation
                </Text>
              </FormControl>
            </Grid>
          </Box>

          <Divider />

          {/* Technical Details Section */}
          <Box>
            <Heading size="md" color="gray.700" mb={4}>Technical Details</Heading>
            <Grid templateColumns={{ base: '1fr', md: '1fr 1fr' }} gap={6}>
              <FormControl>
                <FormLabel color="gray.600">Chemical Name</FormLabel>
                <Input
                  placeholder="Enter chemical name"
                  value={formData.chemicalName}
                  onChange={(e) => handleInputChange('chemicalName', e.target.value)}
                />
                <Text fontSize="xs" color="#B40519" mt={1} cursor="pointer">
                  🔗 Automatic translation
                </Text>
              </FormControl>

              <FormControl>
                <FormLabel color="gray.600">Certifications</FormLabel>
                <Input
                  placeholder="Enter certifications"
                  value={formData.certifications}
                  onChange={(e) => handleInputChange('certifications', e.target.value)}
                />
                <Text fontSize="xs" color="#B40519" mt={1} cursor="pointer">
                  🔗 Automatic translation
                </Text>
              </FormControl>

              <FormControl>
                <FormLabel color="gray.600">CAS Number</FormLabel>
                <Input
                  placeholder="Enter CAS number"
                  value={formData.casNo}
                  onChange={(e) => handleInputChange('casNo', e.target.value)}
                />
              </FormControl>

              <FormControl>
                <FormLabel color="gray.600">HS Code</FormLabel>
                <Input
                  placeholder="Enter HS code"
                  value={formData.hsCode}
                  onChange={(e) => handleInputChange('hsCode', e.target.value)}
                />
              </FormControl>

              <FormControl>
                <FormLabel color="gray.600">Grade</FormLabel>
                <Select 
                  placeholder="Select grade"
                  value={formData.grade}
                  onChange={(e) => handleInputChange('grade', e.target.value)}
                >
                  {gradeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
                <Text fontSize="xs" color="#B40519" mt={1} cursor="pointer">
                  🔗 Automatic translation
                </Text>
              </FormControl>

              <FormControl>
                <FormLabel color="gray.600">Commercial Name</FormLabel>
                <Input
                  placeholder="Enter commercial name"
                  value={formData.commercialName}
                  onChange={(e) => handleInputChange('commercialName', e.target.value)}
                />
                <Text fontSize="xs" color="#B40519" mt={1} cursor="pointer">
                  🔗 Automatic translation
                </Text>
              </FormControl>
            </Grid>
          </Box>

          <Divider />

          {/* Usage & Packaging Section */}
          <Box>
            <Heading size="md" color="gray.700" mb={4}>Usage & Packaging</Heading>
            <Grid templateColumns={{ base: '1fr', md: '1fr 1fr' }} gap={6}>
              <FormControl>
                <FormLabel color="gray.600">Usage Applications</FormLabel>
                <Input
                  placeholder="Enter usage applications"
                  value={formData.usageApplications}
                  onChange={(e) => handleInputChange('usageApplications', e.target.value)}
                />
                <Text fontSize="xs" color="#B40519" mt={1} cursor="pointer">
                  🔗 Automatic translation
                </Text>
              </FormControl>

              <FormControl>
                <FormLabel color="gray.600">Storage</FormLabel>
                <Input
                  placeholder="Enter storage conditions"
                  value={formData.storage}
                  onChange={(e) => handleInputChange('storage', e.target.value)}
                />
                <Text fontSize="xs" color="#B40519" mt={1} cursor="pointer">
                  🔗 Automatic translation
                </Text>
              </FormControl>

              <FormControl>
                <FormLabel color="gray.600">Packaging Type</FormLabel>
                <Input
                  placeholder="Enter packaging type"
                  value={formData.packagingType}
                  onChange={(e) => handleInputChange('packagingType', e.target.value)}
                />
              </FormControl>

              <FormControl>
                <FormLabel color="gray.600">Packing Type</FormLabel>
                <Input
                  placeholder="Enter packing type"
                  value={formData.packingType}
                  onChange={(e) => handleInputChange('packingType', e.target.value)}
                />
              </FormControl>

              <FormControl>
                <FormLabel color="gray.600">Safety Standard</FormLabel>
                <Input
                  placeholder="Enter safety standard"
                  value={formData.safetyStandard}
                  onChange={(e) => handleInputChange('safetyStandard', e.target.value)}
                />
                <Text fontSize="xs" color="#B40519" mt={1} cursor="pointer">
                  🔗 Automatic translation
                </Text>
              </FormControl>

              <FormControl>
                <FormLabel color="gray.600">Minimum Quantities</FormLabel>
                <NumberInput
                  value={formData.minimumQuantities}
                  onChange={(value) => handleInputChange('minimumQuantities', value)}
                  min={0}
                >
                  <NumberInputField placeholder="Enter minimum quantities" />
                  <NumberInputStepper>
                    <NumberIncrementStepper />
                    <NumberDecrementStepper />
                  </NumberInputStepper>
                </NumberInput>
              </FormControl>
            </Grid>
          </Box>

          <Divider />

          {/* Sale Settings Section */}
          <Box>
            <Heading size="md" color="gray.700" mb={4}>Sale Settings</Heading>
            <Grid templateColumns={{ base: '1fr', md: '1fr 1fr 1fr' }} gap={6}>
              <FormControl>
                <FormLabel color="gray.600">Sale Start Date</FormLabel>
                <Input
                  type="date"
                  value={formData.saleStartDate}
                  onChange={(e) => handleInputChange('saleStartDate', e.target.value)}
                />
              </FormControl>

              <FormControl>
                <FormLabel color="gray.600">Sale End Date</FormLabel>
                <Input
                  type="date"
                  value={formData.saleEndDate}
                  onChange={(e) => handleInputChange('saleEndDate', e.target.value)}
                />
              </FormControl>

              <FormControl>
                <FormLabel color="gray.600">Sale Percentage</FormLabel>
                <NumberInput
                  value={formData.salePercentage}
                  onChange={(value) => handleInputChange('salePercentage', value)}
                  min={0}
                  max={100}
                >
                  <NumberInputField placeholder="Enter sale percentage" />
                  <NumberInputStepper>
                    <NumberIncrementStepper />
                    <NumberDecrementStepper />
                  </NumberInputStepper>
                </NumberInput>
              </FormControl>
            </Grid>
          </Box>

          <Divider />

          {/* Sensitive Documents Section */}
          <Box>
            <Heading size="md" color="gray.700" mb={4}>Sensitive Documents</Heading>
            <Grid templateColumns={{ base: '1fr', md: '1fr 1fr 1fr' }} gap={6}>
              <FormControl>
                <FormLabel color="gray.600">TDS (Technical Data Sheet)</FormLabel>
                <Input
                  type="file"
                  accept=".pdf"
                  ref={tdsInputRef}
                  display="none"
                  onChange={(e) => handleDocumentChange(e.target.files?.[0] || null, setTdsFile)}
                />
                <Box flex="1" position="relative">
                  <Flex align="center" h="40px" borderRadius="lg" border="2px solid #E2E8E0" pl={3} pr={0} py={3}>
                    <Text fontFamily="IBM Plex Sans" fontSize="18px" color="#8D8D8D" flex="1">
                      {tdsFile ? tdsFile.name : 'upload TDS document'}
                    </Text>
                    <Box
                      bg="#EAEAEA"
                      h="40px"
                      w="120px"
                      borderTopRightRadius="8px"
                      borderBottomRightRadius="8px"
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                      cursor="pointer"
                      onClick={() => tdsInputRef.current?.click()}
                    >
                      <Text fontFamily="IBM Plex Sans" fontSize="16px" color="#424242" fontWeight={500}>Choose File</Text>
                    </Box>
                  </Flex>
                </Box>
                <Text fontSize="xs" color="gray.400" mt={1}>
                  PDF files only, max 10MB
                </Text>
              </FormControl>

              <FormControl>
                <FormLabel color="gray.600">MSDS (Material Safety Data Sheet)</FormLabel>
                <Input
                  type="file"
                  accept=".pdf"
                  ref={msdsInputRef}
                  display="none"
                  onChange={(e) => handleDocumentChange(e.target.files?.[0] || null, setMsdsFile)}
                />
                <Box flex="1" position="relative">
                  <Flex align="center" h="40px" borderRadius="lg" border="2px solid #E2E8E0" pl={3} pr={0} py={3}>
                    <Text fontFamily="IBM Plex Sans" fontSize="18px" color="#8D8D8D" flex="1">
                      {msdsFile ? msdsFile.name : 'upload MSDS document'}
                    </Text>
                    <Box
                      bg="#EAEAEA"
                      h="40px"
                      w="120px"
                      borderTopRightRadius="8px"
                      borderBottomRightRadius="8px"
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                      cursor="pointer"
                      onClick={() => msdsInputRef.current?.click()}
                    >
                      <Text fontFamily="IBM Plex Sans" fontSize="16px" color="#424242" fontWeight={500}>Choose File</Text>
                    </Box>
                  </Flex>
                </Box>
                <Text fontSize="xs" color="gray.400" mt={1}>
                  PDF files only, max 10MB
                </Text>
              </FormControl>

              <FormControl>
                <FormLabel color="gray.600">COA (Certificate of Analysis)</FormLabel>
                <Input
                  type="file"
                  accept=".pdf"
                  ref={coaInputRef}
                  display="none"
                  onChange={(e) => handleDocumentChange(e.target.files?.[0] || null, setCoaFile)}
                />
                <Box flex="1" position="relative">
                  <Flex align="center" h="40px" borderRadius="lg" border="2px solid #E2E8E0" pl={3} pr={0} py={3}>
                    <Text fontFamily="IBM Plex Sans" fontSize="18px" color="#8D8D8D" flex="1">
                      {coaFile ? coaFile.name : 'upload COA document'}
                    </Text>
                    <Box
                      bg="#EAEAEA"
                      h="40px"
                      w="120px"
                      borderTopRightRadius="8px"
                      borderBottomRightRadius="8px"
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                      cursor="pointer"
                      onClick={() => coaInputRef.current?.click()}
                    >
                      <Text fontFamily="IBM Plex Sans" fontSize="16px" color="#424242" fontWeight={500}>Choose File</Text>
                    </Box>
                  </Flex>
                </Box>
                <Text fontSize="xs" color="gray.400" mt={1}>
                  PDF files only, max 10MB
                </Text>
              </FormControl>
            </Grid>
          </Box>

          {/* Action Buttons */}
          <AdminActionButtons
            onSave={handleSave}
            onCancel={handleCancel}
            isLoading={saving}
            saveLabel="Create Product"
          />
        </VStack>
      </Box>
    </Box>
  );
};

export default AdminAddProduct; 