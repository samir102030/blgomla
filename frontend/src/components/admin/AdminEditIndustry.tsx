import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Flex,
  FormControl,
  FormLabel,
  Input,
  Button,
  VStack,
  Text,
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  useToast,
  Alert,
  AlertIcon,
  Spinner,
  Image,
} from '@chakra-ui/react';
import { ChevronRightIcon } from '@chakra-ui/icons';
import { useNavigate, useParams } from 'react-router-dom';
import { categoriesAPI, uploadAPI } from '../../utils/api';
import { useMultilingualForm } from '../../hooks/useMultilingualForm';
import { MultilingualFieldComponent } from './MultilingualField';
import AdminActionButtons from './AdminActionButtons';

interface ValidationErrors {
  name: string;
  description: string;
  image: string;
}

const AdminEditIndustry = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const { id } = useParams<{ id: string }>();
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
  });
  const [industryImage, setIndustryImage] = useState<File | null>(null);
  const [currentImageUrl, setCurrentImageUrl] = useState<string>('');
  const industryImageInputRef = useRef<HTMLInputElement>(null);
  
  // Component state
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({
    name: '',
    description: '',
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
  } = useMultilingualForm(['name', 'description']);

  // Load existing industry data
  useEffect(() => {
    const loadIndustry = async () => {
      if (!id) {
        setError('Industry ID is required');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const industry = await categoriesAPI.getByIdAdmin(id);
        
        // Store original data for change tracking
        setOriginalData(industry);
        
        setFormData({
          name: industry.name?.en || industry.name || '',
          description: industry.description?.en || industry.description || '',
        });
        
        // Initialize multilingual data with full structure
        initializeFromData(industry, ['name', 'description']);
        setIsInitializing(false);
        
        setCurrentImageUrl(industry.image || '');
        
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load industry data';
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

    loadIndustry();
  }, [id, toast]);

  const trackChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    if (isInitializing || !originalData) return;
    
    const originalValue = originalData[field]?.en || originalData[field] || '';
    
    if (originalValue !== value) {
      setChangedFields(prev => new Set(prev).add(field));
    } else {
      setChangedFields(prev => {
        const newSet = new Set(prev);
        newSet.delete(field);
        return newSet;
      });
    }
    
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

  const handleInputChange = (field: string, value: string) => {
    trackChange(field, value);
    
    if (field === 'name') {
      updateEnglishValue('name', value);
    } else if (field === 'description') {
      updateEnglishValue('description', value);
    }
  };

  const validateForm = (): boolean => {
    const errors: ValidationErrors = {
      name: '',
      description: '',
      image: ''
    };

    if (!formData.name.trim()) {
      errors.name = 'Industry name is required';
    }

    if (!formData.description.trim()) {
      errors.description = 'Industry description is required';
    }

    if (!industryImage && !currentImageUrl) {
      errors.image = 'Industry image is required';
    }

    setValidationErrors(errors);
    return Object.values(errors).every(error => error === '');
  };

  const buildUpdateData = () => {
    const updateData: any = {};
    
    // Handle non-multilingual field changes
    changedFields.forEach(field => {
      if (field === 'image') {
        // Image will be handled separately
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
    });
    
    // Handle English field updates for multilingual fields
    if (changedFields.has('name')) {
      if (!updateData.name) {
        updateData.name = {};
      }
      updateData.name.en = formData.name.trim();
    }
    
    if (changedFields.has('description')) {
      if (!updateData.description) {
        updateData.description = {};
      }
      updateData.description.en = formData.description.trim();
    }
    
    return updateData;
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

    if (!id) {
      setError('Industry ID is required');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      // Build minimal update data
      const updateData = buildUpdateData();

      // Handle image upload if changed
      if (changedFields.has('image') && industryImage) {
        const uploadResponse = await uploadAPI.uploadImage(industryImage);
        updateData.image = uploadResponse.url;
      }

      console.log('Changed fields:', Array.from(changedFields));
      console.log('Sending minimal update data:', updateData);

      // Only send update if there are changes
      if (Object.keys(updateData).length > 0) {
        await categoriesAPI.update(id, updateData);

        toast({
          title: 'Success',
          description: 'Industry updated successfully',
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

      navigate('/admin/industries');
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update industry';
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
    navigate('/admin/industries');
  };

  if (loading) {
    return (
      <Box p={6} display="flex" justifyContent="center" alignItems="center" minH="400px">
        <VStack spacing={4}>
          <Spinner size="xl" color="#B40519" />
          <Text fontSize="lg" color="gray.600">Loading industry data...</Text>
        </VStack>
      </Box>
    );
  }

  return (
    <Box p={6}>
      <Breadcrumb spacing="8px" separator={<ChevronRightIcon color="gray.500" />} mb={6}>
        <BreadcrumbItem>
          <BreadcrumbLink href="/admin/industries" color="gray.600">Industries</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbItem isCurrentPage>
          <BreadcrumbLink href="#" fontWeight="bold">Edit industry</BreadcrumbLink>
        </BreadcrumbItem>
      </Breadcrumb>

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

      <Box bg="white" borderRadius="lg" p={6} boxShadow="sm" maxW="800px">
        <VStack spacing={8} align="stretch">
          <MultilingualFieldComponent
            label="Industry Name"
            fieldName="name"
            value={formData.name}
            multilingualData={multilingualData.name || {}}
            onChange={(value) => handleInputChange('name', value)}
            onMultilingualChange={(language, value) => trackMultilingualChange('name', language, value)}
            isRequired={true}
            error={validationErrors.name}
          />

          <MultilingualFieldComponent
            label="Industry Description"
            fieldName="description"
            value={formData.description}
            multilingualData={multilingualData.description || {}}
            onChange={(value) => handleInputChange('description', value)}
            onMultilingualChange={(language, value) => trackMultilingualChange('description', language, value)}
            isRequired={true}
            error={validationErrors.description}
          />

          <FormControl isInvalid={!!validationErrors.image}>
            <FormLabel color="gray.700" fontSize="md" fontWeight="medium" mb={3}>
              Industry Image *
            </FormLabel>
            {currentImageUrl && !industryImage && (
              <Box mb={3}>
                <Text fontSize="sm" color="gray.600" mb={2}>Current image:</Text>
                <Image
                  src={currentImageUrl}
                  alt="Current industry image"
                  maxW="200px"
                  maxH="150px"
                  objectFit="cover"
                  borderRadius="md"
                  border="1px solid #E2E8F0"
                />
              </Box>
            )}
            <Input
              type="file"
              accept="image/*"
              ref={industryImageInputRef}
              display="none"
              onChange={e => {
                const file = e.target.files?.[0];
                setIndustryImage(file || null);
                if (file) {
                  setChangedFields(prev => new Set(prev).add('image'));
                }
                if (validationErrors.image) {
                  setValidationErrors(prev => ({ ...prev, image: '' }));
                }
              }}
            />
            <Button
              onClick={() => industryImageInputRef.current?.click()}
              w="100%"
              h="50px"
              bg="#EAEAEA"
              color="#424242"
              border={`2px solid ${validationErrors.image ? '#E53E3E' : '#E2E8E0'}`}
              _hover={{ bg: '#d0d0d0' }}
            >
              {industryImage ? industryImage.name : 'Choose New Image (Optional)'}
            </Button>
            {validationErrors.image && (
              <Text fontSize="sm" color="red.500" mt={1}>{validationErrors.image}</Text>
            )}
            <Text fontSize="xs" color="gray.400" mt={1}>
              {industryImage ? 'New image selected. This will replace the current image.' : 'Recommended size: 400x200px. Leave empty to keep current image.'}
            </Text>
          </FormControl>

          <AdminActionButtons
            onSave={handleSave}
            onCancel={handleCancel}
            isLoading={saving}
            saveLabel="Update Industry"
          />
        </VStack>
      </Box>
    </Box>
  );
};

export default AdminEditIndustry; 