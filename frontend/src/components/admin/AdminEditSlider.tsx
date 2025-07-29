import {
  Box,
  Flex,
  FormControl,
  FormLabel,
  Input,
  Button,
  VStack,
  HStack,
  Text,
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  useToast,
  Container,
  Textarea,
  Grid,
  GridItem,
  Icon,
  Alert,
  AlertIcon,
  useBreakpointValue,
} from '@chakra-ui/react';
import { ChevronRightIcon } from '@chakra-ui/icons';
import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import AdminProtectedRoute from './AdminProtectedRoute';
import AdminActionButtons from './AdminActionButtons';
import { slidersAPI, uploadAPI } from '../../utils/api';
import { useMultilingualForm } from '../../hooks/useMultilingualForm';
import { MultilingualFieldComponent } from './MultilingualField';

const AdminEditSlider = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const toast = useToast();
  
  const [formData, setFormData] = useState({
    title: '',
    subtitle: '',
    content: '',
  });

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [currentImageUrl, setCurrentImageUrl] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
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
  } = useMultilingualForm(['title', 'subtitle', 'content']);

  useEffect(() => {
    const fetchSlider = async () => {
      if (!id) return;
      
      try {
        const data = await slidersAPI.getById(id);
        
        // Store original data for change tracking
        setOriginalData(data);
        
        setFormData({
          title: typeof data.title === 'string' ? data.title : (data.title?.en || ''),
          subtitle: typeof data.subtitle === 'string' ? data.subtitle : (data.subtitle?.en || ''),
          content: typeof data.content === 'string' ? data.content : (data.content?.en || ''),
        });
        setCurrentImageUrl(data.image || '');
        
        // Initialize multilingual data
        initializeFromData(data, ['title', 'subtitle', 'content']);
        setIsInitializing(false);
        
        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching slider:', error);
        toast({
          title: 'Error fetching slider',
          description: 'Failed to load slider data',
          status: 'error',
          duration: 3000,
          isClosable: true,
        });
        setIsLoading(false);
      }
    };
    fetchSlider();
  }, [id, toast]);

  const trackChange = (field: string, value: string) => {
    if (isInitializing || !originalData) return;
    
    let originalValue = '';
    switch (field) {
      case 'title':
        originalValue = typeof originalData.title === 'string' ? originalData.title : (originalData.title?.en || '');
        break;
      case 'subtitle':
        originalValue = typeof originalData.subtitle === 'string' ? originalData.subtitle : (originalData.subtitle?.en || '');
        break;
      case 'content':
        originalValue = typeof originalData.content === 'string' ? originalData.content : (originalData.content?.en || '');
        break;
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
    trackChange(name, value);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast({
          title: 'Invalid file type',
          description: 'Please select an image file',
          status: 'error',
          duration: 3000,
          isClosable: true,
        });
        return;
      }

      // Validate file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: 'File too large',
          description: 'Please select an image smaller than 5MB',
          status: 'error',
          duration: 3000,
          isClosable: true,
        });
        return;
      }

      setImageFile(file);
      setChangedFields(prev => new Set(prev).add('image'));
    }
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
    if (changedFields.has('title')) {
      if (!updateData.title) {
        updateData.title = {};
      }
      updateData.title.en = formData.title.trim();
    }
    
    if (changedFields.has('subtitle')) {
      if (!updateData.subtitle) {
        updateData.subtitle = {};
      }
      updateData.subtitle.en = formData.subtitle.trim();
    }
    
    if (changedFields.has('content')) {
      if (!updateData.content) {
        updateData.content = {};
      }
      updateData.content.en = formData.content.trim();
    }
    
    return updateData;
  };

  const handleSubmit = async () => {
    if (!formData.title.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Title field is required',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    if (!formData.subtitle.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Subtitle field is required',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    if (!formData.content.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Content field is required',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    if (!id) {
      toast({
        title: 'Error',
        description: 'Slider ID is missing',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Build minimal update data
      const updateData = buildUpdateData();

      // Upload new image if selected
      if (changedFields.has('image') && imageFile) {
        const uploadResponse = await uploadAPI.uploadImage(imageFile);
        updateData.image = uploadResponse.url;
      }

      console.log('Changed fields:', Array.from(changedFields));
      console.log('Sending minimal update data:', updateData);

      // Only send update if there are changes
      if (Object.keys(updateData).length > 0) {
        await slidersAPI.update(id, updateData);
        toast({
          title: 'Slider updated successfully',
          description: 'Your changes have been saved',
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

      navigate('/admin/about');
    } catch (error) {
      console.error('Error updating slider:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to update slider';
      toast({
        title: 'Error updating slider',
        description: errorMessage,
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    navigate('/admin/about');
  };

  const contentPadding = useBreakpointValue({ base: 4, md: 8 });

  if (isLoading) {
    return (
      <AdminProtectedRoute>
        <Flex justify="center" align="center" h="400px" px={contentPadding}>
          <Text fontSize="18px" color="#6C757D">Loading slider...</Text>
        </Flex>
      </AdminProtectedRoute>
    );
  }

  return (
    <AdminProtectedRoute>
      <Box px={contentPadding} py={8}>
        <Container maxW="1200px" p={0}>
          <VStack spacing={8} align="stretch">
            {/* Header Section */}
            <VStack spacing={6} align="flex-start">
              {/* Breadcrumb */}
              <Flex align="center" gap={4}>
                <Text
                  fontSize="24px"
                  fontWeight="400"
                  color="#6C757D"
                  lineHeight="1.4"
                >
                  About company
                </Text>
                <ChevronRightIcon w="20px" h="20px" color="#6C757D" />
                <Text
                  fontSize="32px"
                  fontWeight="600"
                  color="#3F0209"
                  lineHeight="1.4"
                >
                  Edit slider
                </Text>
              </Flex>
            </VStack>

            {/* Form Section */}
            <Box
              bg="white"
              borderRadius="16px"
              p={8}
              boxShadow="0 4px 12px rgba(0,0,0,0.05)"
              border="1px solid #E9ECEF"
            >
              <VStack spacing={8} align="stretch">
                {/* Text and Image Row */}
                <Grid templateColumns={{ base: '1fr', md: '1fr 1fr' }} gap={8}>
                  {/* Title Field */}
                  <GridItem>
                    <MultilingualFieldComponent
                      label="Title"
                      fieldName="title"
                        value={formData.title}
                      multilingualData={multilingualData.title || {}}
                      onChange={(value) => {
                        setFormData(prev => ({ ...prev, title: value }));
                        trackChange('title', value);
                        updateEnglishValue('title', value);
                      }}
                      onMultilingualChange={(language, value) => trackMultilingualChange('title', language, value)}
                        placeholder="Enter slider title"
                    />
                  </GridItem>

                  {/* Image Field */}
                  <GridItem>
                    <FormControl>
                      <FormLabel
                        fontSize="18px"
                        fontWeight="600"
                        color="#495057"
                        mb={4}
                      >
                        Slider Image
                      </FormLabel>
                      <Box
                        h="56px"
                        border="2px solid #E9ECEF"
                        borderRadius="12px"
                        bg="white"
                        position="relative"
                        _hover={{ borderColor: "#DEE2E6" }}
                      >
                        <Flex h="100%">
                          <Box
                            flex="1"
                            display="flex"
                            alignItems="center"
                            px={4}
                          >
                            <Text
                              fontSize="16px"
                              color={imageFile || currentImageUrl ? "#495057" : "#ADB5BD"}
                              lineHeight="1.4"
                              isTruncated
                            >
                              {imageFile ? imageFile.name : currentImageUrl ? 'Current image selected' : 'Upload new slider image'}
                            </Text>
                          </Box>
                          <Box
                            w="140px"
                            bg="#F8F9FA"
                            borderRadius="0 10px 10px 0"
                            display="flex"
                            alignItems="center"
                            justifyContent="center"
                            cursor="pointer"
                            position="relative"
                            _hover={{ bg: "#E9ECEF" }}
                            transition="all 0.2s"
                          >
                            <Input
                              type="file"
                              accept="image/*"
                              onChange={handleImageChange}
                              position="absolute"
                              top="0"
                              left="0"
                              w="100%"
                              h="100%"
                              opacity="0"
                              cursor="pointer"
                            />
                            <Text
                              fontSize="14px"
                              fontWeight="500"
                              color="#495057"
                              lineHeight="1.4"
                            >
                              Choose File
                            </Text>
                          </Box>
                        </Flex>
                      </Box>
                      <Text
                        fontSize="14px"
                        color="#6C757D"
                        mt={2}
                      >
                        Recommended size: 1920×800px
                      </Text>
                    </FormControl>
                  </GridItem>
                </Grid>

                {/* Subtitle Field */}
                <MultilingualFieldComponent
                  label="Subtitle"
                  fieldName="subtitle"
                    value={formData.subtitle}
                  multilingualData={multilingualData.subtitle || {}}
                  onChange={(value) => {
                    setFormData(prev => ({ ...prev, subtitle: value }));
                    trackChange('subtitle', value);
                    updateEnglishValue('subtitle', value);
                  }}
                  onMultilingualChange={(language, value) => trackMultilingualChange('subtitle', language, value)}
                    placeholder="Enter slider subtitle"
                  />

                {/* Content Field */}
                <MultilingualFieldComponent
                  label="Content"
                  fieldName="content"
                  value={formData.content}
                  multilingualData={multilingualData.content || {}}
                  onChange={(value) => {
                    setFormData(prev => ({ ...prev, content: value }));
                    trackChange('content', value);
                    updateEnglishValue('content', value);
                  }}
                  onMultilingualChange={(language, value) => trackMultilingualChange('content', language, value)}
                  isTextArea={true}
                      placeholder="Enter slider content..."
                    />
                <Flex justify="flex-end" mt={2}>
                    <Text fontSize="14px" color="#6C757D">
                      {formData.content.split(' ').filter((word: string) => word.length > 0).length} words
                    </Text>
                  </Flex>
              </VStack>
            </Box>

            {/* Action Buttons */}
            <AdminActionButtons
              onSave={handleSubmit}
              onCancel={handleCancel}
              isLoading={isSubmitting}
            />

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
          </VStack>
        </Container>
      </Box>
    </AdminProtectedRoute>
  );
};

export default AdminEditSlider; 