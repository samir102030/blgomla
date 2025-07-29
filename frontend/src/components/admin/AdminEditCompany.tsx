import React, { useState, useRef, useEffect } from 'react';
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
  Spinner,
  Image,
  Container,
  useBreakpointValue,
} from '@chakra-ui/react';
import { ChevronRightIcon, AttachmentIcon } from '@chakra-ui/icons';
import { useNavigate, useParams } from 'react-router-dom';
import { useUserStore } from '../../stores/user.store';
import { companiesAPI, uploadAPI } from '../../utils/api';
import AdminProtectedRoute from './AdminProtectedRoute';
import AdminActionButtons from './AdminActionButtons';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import './quill-center-toolbar.css';
import { useMultilingualForm } from '../../hooks/useMultilingualForm';
import { MultilingualFieldComponent } from './MultilingualField';

interface ValidationErrors {
  companyName: string;
  article: string;
  image: string;
}

interface Company {
  _id: string;
  companyName: string;
  description: string;
  image: string;
  file?: string;
  website?: string;
  email?: string;
  phone?: string;
  address?: string;
}

const AdminEditCompany = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const { companyId } = useParams<{ companyId: string }>();
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
  const [currentImageUrl, setCurrentImageUrl] = useState<string>('');
  const companyImageInputRef = useRef<HTMLInputElement>(null);
  const [companyFile, setCompanyFile] = useState<File | null>(null);
  const [currentFileUrl, setCurrentFileUrl] = useState<string>('');
  const companyFileInputRef = useRef<HTMLInputElement>(null);
  
  // Component state
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({
    companyName: '',
    article: '',
    image: ''
  });
  
  // Change tracking
  const [originalData, setOriginalData] = useState<any>(null);
  const [changedFields, setChangedFields] = useState<Set<string>>(new Set());
  const [isInitializing, setIsInitializing] = useState(true);
  
  // Multilingual form hook
  const {
    multilingualData,
    getEnglishValue,
    updateEnglishValue,
    updateMultilingualValue,
    initializeFromData,
    buildUpdatePayload,
  } = useMultilingualForm(['companyName', 'description', 'address']);

  const contentPadding = useBreakpointValue({ base: 4, md: 8 });

  // Load existing company data
  useEffect(() => {
    const loadCompany = async () => {
      if (!companyId) {
        setError('Company ID is required');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const params = { lang: 'en' }; // Request English content for editing
        const company = await companiesAPI.getById(companyId);
        
        // Store original data for change tracking
        setOriginalData(company);
        
        // Handle multilingual fields - extract English content
        const companyName = typeof company.companyName === 'object' 
          ? company.companyName.en || company.companyName 
          : company.companyName || '';
        
        const description = typeof company.description === 'object'
          ? company.description.en || company.description
          : company.description || '';

        const address = typeof company.address === 'object'
          ? company.address.en || company.address
          : company.address || '';

        setFormData({
          companyName,
          article: description,
          website: company.website || '',
          email: company.email || '',
          phone: company.phone || '',
          address,
        });
        
        // Initialize multilingual data
        initializeFromData(company, ['companyName', 'description', 'address']);
        setIsInitializing(false);
        
        setCurrentImageUrl(company.image || '');
        setCurrentFileUrl(company.file || '');
        
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load company data';
        setError(errorMessage);
        toast({
          title: 'Error',
          description: errorMessage,
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      } finally {
        setLoading(false);
      }
    };

    loadCompany();
  }, [companyId, toast]);

  const trackChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    if (isInitializing || !originalData) return;
    
    let originalValue = '';
    if (field === 'companyName') {
      originalValue = typeof originalData.companyName === 'object' 
        ? originalData.companyName.en || '' 
        : originalData.companyName || '';
    } else if (field === 'article') {
      originalValue = typeof originalData.description === 'object'
        ? originalData.description.en || ''
        : originalData.description || '';
    } else if (field === 'address') {
      originalValue = typeof originalData.address === 'object'
        ? originalData.address.en || ''
        : originalData.address || '';
    } else {
      originalValue = originalData[field] || '';
    }
    
    if (originalValue !== value) {
      setChangedFields(prev => new Set(prev).add(field));
    } else {
      setChangedFields(prev => {
        const newSet = new Set(prev);
        newSet.delete(field);
        return newSet;
      });
    }
    
    // Clear validation error when user starts typing
    if (validationErrors[field as keyof ValidationErrors]) {
      setValidationErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const trackMultilingualChange = (field: string, language: string, value: string) => {
    updateMultilingualValue(field, language, value);
    
    if (isInitializing || !originalData) return;
    
    const originalValue = originalData[field]?.[language] || '';
    
    if (originalValue !== value) {
      setChangedFields(prev => new Set(prev).add(`${field}(${language})`));
    } else {
      setChangedFields(prev => {
        const newSet = new Set(prev);
        newSet.delete(`${field}(${language})`);
        return newSet;
      });
    }
  };

  const trackFileChange = (fileType: 'image' | 'file') => {
    setChangedFields(prev => new Set(prev).add(fileType));
  };

  const handleInputChange = (field: string, value: string) => {
    trackChange(field, value);
    
    // Update multilingual data for multilingual fields
    if (field === 'companyName') {
      updateEnglishValue('companyName', value);
    } else if (field === 'article') {
      updateEnglishValue('description', value);
    } else if (field === 'address') {
      updateEnglishValue('address', value);
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

    if (!companyImage && !currentImageUrl) {
      errors.image = 'Company image is required';
    }

    setValidationErrors(errors);
    return Object.values(errors).every(error => error === '');
  };

  const wordCount = formData.article ? formData.article.replace(/<[^>]+>/g, '').split(' ').filter(word => word.length > 0).length : 0;

  const buildUpdateData = () => {
    const updateData: any = {};
    
    // Handle non-multilingual field changes
    changedFields.forEach(field => {
      if (field === 'image' || field === 'file') {
        // Files will be handled separately
        return;
      }
      
      // Check if this is a multilingual field change (format: fieldName(language))
      const languageMatch = field.match(/^(.+)\((.+)\)$/);
      if (languageMatch) {
        const [, fieldName, language] = languageMatch;
        const fieldData = multilingualData[fieldName as keyof typeof multilingualData];
        const value = fieldData?.[language as keyof typeof fieldData];
        if (value !== undefined) {
          if (!updateData[fieldName]) {
            updateData[fieldName] = {};
          }
          updateData[fieldName][language] = value;
        }
        return;
      }
      
      // Handle regular field changes
      if (formData[field as keyof typeof formData] !== undefined) {
        const value = formData[field as keyof typeof formData];
        if (field === 'website' || field === 'email' || field === 'phone') {
          updateData[field] = value.trim() || null;
        }
      }
    });
    
    // Handle English field updates for multilingual fields
    if (changedFields.has('companyName')) {
      if (!updateData.companyName) {
        updateData.companyName = {};
      }
      updateData.companyName.en = formData.companyName.trim();
    }
    
    if (changedFields.has('article')) {
      if (!updateData.description) {
        updateData.description = {};
      }
      updateData.description.en = formData.article.trim();
    }
    
    if (changedFields.has('address')) {
      if (!updateData.address) {
        updateData.address = {};
      }
      updateData.address.en = formData.address.trim();
    }
    
    return updateData;
  };

  const handleSave = async () => {
    console.log('=== DEBUG: Edit Company Save Function Called ===');
    console.log('Company ID:', companyId);
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

    if (!companyId) {
      setError('Company ID is required');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      // Build minimal update data
      const updateData = buildUpdateData();

      // Handle file uploads if changed
      if (changedFields.has('image') && companyImage) {
        console.log('Uploading new company image...');
        const uploadResponse = await uploadAPI.uploadImage(companyImage);
        updateData.image = uploadResponse.url;
        console.log('Company image uploaded:', updateData.image);
      }

      if (changedFields.has('file') && companyFile) {
        console.log('Uploading new company file...');
        const uploadResponse = await uploadAPI.uploadImage(companyFile);
        updateData.file = uploadResponse.url;
        console.log('Company file uploaded:', updateData.file);
      }

      console.log('Changed fields:', Array.from(changedFields));
      console.log('Sending minimal update data:', updateData);

      // Only send update if there are changes
      if (Object.keys(updateData).length > 0) {
        const response = await companiesAPI.update(companyId, updateData);
        console.log('Company updated successfully:', response);

        toast({
          title: 'Success',
          description: 'Company updated successfully',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
      } else {
        toast({
          title: 'Info',
          description: 'No changes detected',
          status: 'info',
          duration: 3000,
          isClosable: true,
        });
      }

      navigate('/admin/companies');
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update company';
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

  if (loading) {
    return (
      <AdminProtectedRoute>
        <Flex justify="center" align="center" h="400px" px={contentPadding}>
          <Text fontSize="18px" color="#6C757D">Loading company...</Text>
        </Flex>
      </AdminProtectedRoute>
    );
  }

  return (
    <AdminProtectedRoute>
      <Box px={contentPadding} py={8}>
        <Container maxW="1200px" p={0}>
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

          {error && (
            <Alert status="error" mb={6}>
              <AlertIcon />
              {error}
            </Alert>
          )}

          {/* Change Tracking Debug */}
          <Alert status="warning" mb={4}>
            <AlertIcon />
            <Box>
              <Text fontWeight="bold">Change Tracking Debug</Text>
              <Text fontSize="sm">
                Changed Fields: {Array.from(changedFields).join(", ") || "None"}
              </Text>
            </Box>
          </Alert>

          {/* Breadcrumb */}
          <Breadcrumb spacing="8px" separator={<ChevronRightIcon color="gray.500" />} mb={6}>
            <BreadcrumbItem>
              <BreadcrumbLink href="/admin/companies" color="gray.600">Companies</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbItem isCurrentPage>
              <BreadcrumbLink href="#" fontWeight="bold">Edit company</BreadcrumbLink>
            </BreadcrumbItem>
          </Breadcrumb>

          {/* Main Form */}
          <Box bg="white" borderRadius="lg" p={6} boxShadow="sm" maxW="800px">
            <VStack spacing={8} align="stretch">
              {/* Company Name */}
              <MultilingualFieldComponent
                label="Company Name"
                fieldName="companyName"
                value={formData.companyName}
                multilingualData={multilingualData.companyName || {}}
                onChange={(value) => {
                  handleInputChange('companyName', value);
                  trackMultilingualChange('companyName', 'en', value);
                }}
                onMultilingualChange={(language, value) => trackMultilingualChange('companyName', language, value)}
                isRequired={true}
                error={validationErrors.companyName}
              />

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

                <MultilingualFieldComponent
                  label="Address"
                  fieldName="address"
                  value={formData.address}
                  multilingualData={multilingualData.address || {}}
                  onChange={(value) => {
                    handleInputChange('address', value);
                    trackMultilingualChange('address', 'en', value);
                  }}
                  onMultilingualChange={(language, value) => trackMultilingualChange('address', language, value)}
                />
              </Grid>

              {/* File Upload Section */}
              <Grid templateColumns={{ base: '1fr', md: '1fr 1fr' }} gap={8}>
                {/* Company File */}
                <FormControl>
                  <FormLabel color="gray.700" fontSize="md" fontWeight="medium" mb={3}>
                    Company File (Optional)
                  </FormLabel>
                  {currentFileUrl && !companyFile && (
                    <Box mb={3}>
                      <Text fontSize="sm" color="gray.600" mb={2}>Current file:</Text>
                      <Button
                        size="sm"
                        colorScheme="green"
                        variant="outline"
                        onClick={() => window.open(currentFileUrl, '_blank')}
                      >
                        View Current File
                      </Button>
                    </Box>
                  )}
                  <Input
                    type="file"
                    accept="*"
                    ref={companyFileInputRef}
                    display="none"
                    onChange={e => {
                      const file = e.target.files?.[0];
                      setCompanyFile(file || null);
                      trackFileChange('file');
                    }}
                  />
                  <Box flex="1" position="relative">
                    <Flex align="center" h="50px" borderRadius="lg" border="2px solid #E2E8E0" pl={3} pr={0} py={3}>
                      <Text fontFamily="IBM Plex Sans" fontSize="18px" color="#8D8D8D" flex="1">
                        {companyFile ? companyFile.name : 'upload new company file (optional)'}
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
                    {companyFile ? 'New file selected. This will replace the current file.' : 'Any file type accepted. Leave empty to keep current file.'}
                  </Text>
                </FormControl>

                {/* Company Image */}
                <FormControl isInvalid={!!validationErrors.image}>
                  <FormLabel color="gray.700" fontSize="md" fontWeight="medium" mb={3}>
                    Company Image *
                  </FormLabel>
                  {currentImageUrl && !companyImage && (
                    <Box mb={3}>
                      <Text fontSize="sm" color="gray.600" mb={2}>Current image:</Text>
                      <Image
                        src={currentImageUrl}
                        alt="Current company image"
                        maxW="150px"
                        maxH="100px"
                        objectFit="cover"
                        borderRadius="md"
                        border="1px solid #E2E8F0"
                      />
                    </Box>
                  )}
                  <Input
                    type="file"
                    accept="image/*"
                    ref={companyImageInputRef}
                    display="none"
                    onChange={e => {
                      const file = e.target.files?.[0];
                      setCompanyImage(file || null);
                      trackFileChange('image');
                      if (validationErrors.image) {
                        setValidationErrors(prev => ({ ...prev, image: '' }));
                      }
                    }}
                  />
                  <Box flex="1" position="relative">
                    <Flex align="center" h="50px" borderRadius="lg" border={`2px solid ${validationErrors.image ? '#E53E3E' : '#E2E8E0'}`} pl={3} pr={0} py={3}>
                      <Text fontFamily="IBM Plex Sans" fontSize="18px" color="#8D8D8D" flex="1">
                        {companyImage ? companyImage.name : 'upload new company image (optional)'}
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
                    {companyImage ? 'New image selected. This will replace the current image.' : 'Recommended size: 400x200px. Leave empty to keep current image.'}
                  </Text>
                </FormControl>
              </Grid>

              {/* Article Section */}
              <Box>
                <MultilingualFieldComponent
                  label="Company Description"
                  fieldName="description"
                  value={formData.article}
                  multilingualData={multilingualData.description || {}}
                  onChange={(value) => {
                    handleInputChange('article', value);
                    trackMultilingualChange('description', 'en', value);
                  }}
                  onMultilingualChange={(language, value) => trackMultilingualChange('description', language, value)}
                  isTextArea={true}
                  isRequired={true}
                  error={validationErrors.article}
                />
                <Flex justify="flex-end" mt={2}>
                  <Text fontSize="sm" color="gray.400">
                    {wordCount} words
                  </Text>
                </Flex>
              </Box>

              {/* Action Buttons */}
              <AdminActionButtons
                onSave={handleSave}
                onCancel={handleCancel}
                isLoading={saving}
                saveLabel="Update Company"
              />
            </VStack>
          </Box>
        </Container>
      </Box>
    </AdminProtectedRoute>
  );
};

export default AdminEditCompany; 