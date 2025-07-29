import {
  Box,
  Flex,
  Heading,
  FormControl,
  FormLabel,
  Input,
  Textarea,
  Button,
  Grid,
  VStack,
  HStack,
  Text,
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  useToast,
  Alert,
  AlertIcon,
  useBreakpointValue,
} from '@chakra-ui/react';
import { ChevronRightIcon, AttachmentIcon } from '@chakra-ui/icons';
import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserStore } from '../../stores/user.store';
import { companiesAPI, uploadAPI } from '../../utils/api';
import AdminProtectedRoute from './AdminProtectedRoute';
import AdminActionButtons from './AdminActionButtons';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import './quill-center-toolbar.css';

interface ValidationErrors {
  companyName: string;
  article: string;
  image: string;
}

const AdminAddCompany = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const user = useUserStore(state => state.user);
  const isLoggedIn = !!user;
  const isAdmin = user?.isAdmin || false;
  
  const [formData, setFormData] = useState({
    companyName: '',
    article: '',
    website: '',
    email: '',
    phone: '',
    address: ''
  });
  const [companyImage, setCompanyImage] = useState<File | null>(null);
  const companyImageInputRef = useRef<HTMLInputElement>(null);
  const [companyFile, setCompanyFile] = useState<File | null>(null);
  const companyFileInputRef = useRef<HTMLInputElement>(null);
  
  // Component state
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({
    companyName: '',
    article: '',
    image: ''
  });

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear validation error when user starts typing
    if (validationErrors[field as keyof ValidationErrors]) {
      setValidationErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = (): boolean => {
    const errors: ValidationErrors = {
      companyName: '',
      article: '',
      image: ''
    };

    if (!formData.companyName.trim()) {
      errors.companyName = 'Company name is required';
    }

    if (!formData.article.trim()) {
      errors.article = 'Company description is required';
    }

    if (!companyImage) {
      errors.image = 'Company image is required';
    }

    setValidationErrors(errors);
    return Object.values(errors).every(error => error === '');
  };

  const handleSave = async () => {
    // Debug authentication status
    console.log('=== DEBUG: Add Company Save Function Called ===');
    console.log('User:', user);
    console.log('Is Logged In:', isLoggedIn);
    console.log('Is Admin:', isAdmin);

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
      let fileUrl = '';

      // Upload company image
      if (companyImage) {
        console.log('Uploading company image...');
        const uploadResponse = await uploadAPI.uploadImage(companyImage);
        imageUrl = uploadResponse.url;
        console.log('Company image uploaded:', imageUrl);
      }

      // Upload company file if provided
      if (companyFile) {
        console.log('Uploading company file...');
        const uploadResponse = await uploadAPI.uploadImage(companyFile); // Using same endpoint
        fileUrl = uploadResponse.url;
        console.log('Company file uploaded:', fileUrl);
      }

      const companyData = {
        companyName: formData.companyName.trim(),
        description: formData.article.trim(),
        image: imageUrl,
        file: fileUrl,
        website: formData.website.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        address: formData.address.trim(),
      };

      console.log('Creating company with data:', companyData);
      const response = await companiesAPI.create(companyData);
      console.log('Company created successfully:', response);

      toast({
        title: 'Success',
        description: 'Company created successfully',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });

      navigate('/admin/companies');
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create company';
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
    navigate('/admin/companies');
  };

  const wordCount = formData.article ? formData.article.replace(/<[^>]+>/g, '').split(' ').filter(word => word.length > 0).length : 0;

  const contentPadding = useBreakpointValue({ base: 4, md: 8 });

  return (
    <AdminProtectedRoute>
      <Box px={contentPadding} py={8}>
        {/* Debug Info */}
        <Alert status="info" mb={4}>
          <AlertIcon />
          <Box>
            <Text fontWeight="bold">Auth Debug</Text>
            <Text fontSize="sm">
              User: {user?.email || 'None'} | Admin: {isAdmin ? 'Yes' : 'No'} | Logged In: {isLoggedIn ? 'Yes' : 'No'}
            </Text>
          </Box>
        </Alert>

        {/* Breadcrumb */}
        <Breadcrumb spacing="8px" separator={<ChevronRightIcon color="gray.500" />} mb={6}>
          <BreadcrumbItem>
            <BreadcrumbLink href="/admin/companies" color="gray.600">Companies</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbItem isCurrentPage>
            <BreadcrumbLink href="#" fontWeight="bold">Add company</BreadcrumbLink>
          </BreadcrumbItem>
        </Breadcrumb>

        {error && (
          <Alert status="error" mb={6}>
            <AlertIcon />
            {error}
          </Alert>
        )}

        {/* Main Form */}
        <Box bg="white" borderRadius="lg" p={6} boxShadow="sm" maxW="800px">
          <VStack spacing={8} align="stretch">
            {/* Company Name */}
            <FormControl isInvalid={!!validationErrors.companyName}>
              <FormLabel color="gray.700" fontSize="md" fontWeight="medium">
                Company Name (English) *
              </FormLabel>
              <Input
                placeholder="Enter company name"
                value={formData.companyName}
                onChange={(e) => handleInputChange('companyName', e.target.value)}
                size="lg"
                bg="white"
                border="1px solid"
                borderColor={validationErrors.companyName ? 'red.300' : 'gray.200'}
                _focus={{ borderColor: validationErrors.companyName ? 'red.300' : '#B40519', boxShadow: 'none' }}
              />
              {validationErrors.companyName && (
                <Text fontSize="sm" color="red.500" mt={1}>{validationErrors.companyName}</Text>
              )}
              <Text fontSize="sm" color="#B40519" mt={2} cursor="pointer">
                🔗 Automatic translation
              </Text>
            </FormControl>

            {/* Contact Information */}
            <Grid templateColumns={{ base: '1fr', md: '1fr 1fr' }} gap={6}>
              <FormControl>
                <FormLabel color="gray.700" fontSize="md" fontWeight="medium">
                  Website
                </FormLabel>
                <Input
                  placeholder="https://www.company.com"
                  value={formData.website}
                  onChange={(e) => handleInputChange('website', e.target.value)}
                  size="lg"
                />
              </FormControl>

              <FormControl>
                <FormLabel color="gray.700" fontSize="md" fontWeight="medium">
                  Email
                </FormLabel>
                <Input
                  placeholder="contact@company.com"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  size="lg"
                />
              </FormControl>

              <FormControl>
                <FormLabel color="gray.700" fontSize="md" fontWeight="medium">
                  Phone
                </FormLabel>
                <Input
                  placeholder="+20 123 456 7890"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  size="lg"
                />
              </FormControl>

              <FormControl>
                <FormLabel color="gray.700" fontSize="md" fontWeight="medium">
                  Address
                </FormLabel>
                <Input
                  placeholder="Company address"
                  value={formData.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  size="lg"
                />
              </FormControl>
            </Grid>

            {/* File Upload Section */}
            <Grid templateColumns={{ base: '1fr', md: '1fr 1fr' }} gap={8}>
              {/* Company File */}
              <FormControl>
                <FormLabel color="gray.700" fontSize="md" fontWeight="medium" mb={3}>
                  Company File (Optional)
                </FormLabel>
                <Input
                  type="file"
                  accept="*"
                  ref={companyFileInputRef}
                  display="none"
                  onChange={e => {
                    const file = e.target.files?.[0];
                    setCompanyFile(file || null);
                  }}
                />
                <Box flex="1" position="relative">
                  <Flex align="center" h="50px" borderRadius="lg" border="2px solid #E2E8E0" pl={3} pr={0} py={3}>
                    <Text fontFamily="IBM Plex Sans" fontSize="18px" color="#8D8D8D" flex="1">
                      {companyFile ? companyFile.name : 'upload company file'}
                    </Text>
                    <Box
                      bg="#EAEAEA"
                      h="50px"
                      w="120px"
                      borderTopRightRadius="8px"
                      borderBottomRightRadius="8px"
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                      cursor="pointer"
                      onClick={() => companyFileInputRef.current?.click()}
                    >
                      <Text fontFamily="IBM Plex Sans" fontSize="16px" color="#424242" fontWeight={500}>Choose File</Text>
                    </Box>
                  </Flex>
                </Box>
                <Text fontSize="xs" color="gray.400" mt={1}>
                  Any file type accepted
                </Text>
              </FormControl>

              {/* Company Image */}
              <FormControl isInvalid={!!validationErrors.image}>
                <FormLabel color="gray.700" fontSize="md" fontWeight="medium" mb={3}>
                  Company Image *
                </FormLabel>
                <Input
                  type="file"
                  accept="image/*"
                  ref={companyImageInputRef}
                  display="none"
                  onChange={e => {
                    const file = e.target.files?.[0];
                    setCompanyImage(file || null);
                    if (validationErrors.image) {
                      setValidationErrors(prev => ({ ...prev, image: '' }));
                    }
                  }}
                />
                <Box flex="1" position="relative">
                  <Flex align="center" h="50px" borderRadius="lg" border={`2px solid ${validationErrors.image ? '#E53E3E' : '#E2E8E0'}`} pl={3} pr={0} py={3}>
                    <Text fontFamily="IBM Plex Sans" fontSize="18px" color="#8D8D8D" flex="1">
                      {companyImage ? companyImage.name : 'upload company image'}
                    </Text>
                    <Box
                      bg="#EAEAEA"
                      h="50px"
                      w="120px"
                      borderTopRightRadius="8px"
                      borderBottomRightRadius="8px"
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                      cursor="pointer"
                      onClick={() => companyImageInputRef.current?.click()}
                    >
                      <Text fontFamily="IBM Plex Sans" fontSize="16px" color="#424242" fontWeight={500}>Choose File</Text>
                    </Box>
                  </Flex>
                </Box>
                {validationErrors.image && (
                  <Text fontSize="sm" color="red.500" mt={1}>{validationErrors.image}</Text>
                )}
                <Text fontSize="xs" color="gray.400" mt={1}>
                  Recommended size: 400x200px
                </Text>
              </FormControl>
            </Grid>

            {/* Article Section */}
            <FormControl isInvalid={!!validationErrors.article}>
              <FormLabel color="gray.700" fontSize="md" fontWeight="medium" mb={3}>
                Company Description (English) *
              </FormLabel>
              <ReactQuill
                theme="snow"
                value={formData.article}
                onChange={value => handleInputChange('article', value)}
                style={{ 
                  minHeight: 100, 
                  border: `1px solid ${validationErrors.article ? '#E53E3E' : '#E2E8F0'}`, 
                  borderRadius: '8px', 
                  background: 'white' 
                }}
              />
              {validationErrors.article && (
                <Text fontSize="sm" color="red.500" mt={1}>{validationErrors.article}</Text>
              )}
              <Flex justify="space-between" mt={2}>
                <Text fontSize="sm" color="#B40519" cursor="pointer">
                  🔗 Automatic translation
                </Text>
                <Text fontSize="sm" color="gray.400">
                  {wordCount} words
                </Text>
              </Flex>
            </FormControl>

            {/* Action Buttons */}
            <AdminActionButtons
              onSave={handleSave}
              onCancel={handleCancel}
              isLoading={saving}
              saveLabel="Create Company"
            />
          </VStack>
        </Box>
      </Box>
    </AdminProtectedRoute>
  );
};

export default AdminAddCompany; 