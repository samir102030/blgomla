import React, { useState } from 'react';
import {
  Box,
  Container,
  VStack,
  Text,
  Flex,
  Grid,
  GridItem,
  FormControl,
  FormLabel,
  Input,
  Button,
  useToast,
  useBreakpointValue,
} from '@chakra-ui/react';
import { ChevronRightIcon } from '@chakra-ui/icons';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSlidersStore } from '../../stores/slider.store';
import { useUploadStore } from '../../stores/upload.store';
import AdminProtectedRoute from './AdminProtectedRoute';
import AdminActionButtons from './AdminActionButtons';
import MultilingualFieldComponent from './MultilingualField';
import { slidersAPI, uploadAPI } from '../../utils/api';
import { useMultilingualForm } from '../../hooks/useMultilingualForm';

const AdminAddSlider = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const toast = useToast();
  const { uploadImage } = useUploadStore();
  const { fetchSliders } = useSlidersStore();
  
  const [formData, setFormData] = useState({
    title: '',
    subtitle: '',
    content: '',
  });

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Multilingual form hook
  const {
    multilingualData,
    getEnglishValue,
    updateEnglishValue,
    updateMultilingualValue,
    initializeFromData,
    buildUpdatePayload,
  } = useMultilingualForm(['title', 'subtitle', 'content']);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
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
    }
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

    if (!imageFile) {
      toast({
        title: 'Validation Error',
        description: 'Slider image is required',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Upload image first
      const uploadResponse = await uploadAPI.uploadImage(imageFile);
      const imageUrl = uploadResponse.url;

      // Create slider with uploaded image URL
      const sliderData = {
        title: formData.title,
        subtitle: formData.subtitle,
        content: formData.content,
        image: imageUrl,
        ...buildUpdatePayload(),
      };

      await slidersAPI.create(sliderData);
      
      toast({
        title: 'Success',
        description: 'Slider created successfully',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });

      navigate('/admin/about');
    } catch (error) {
      console.error('Error creating slider:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create slider';
      toast({
        title: 'Error',
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
                  Add slider
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
                        handleInputChange({ target: { name: 'title', value } } as any);
                        updateEnglishValue('title', value);
                      }}
                      onMultilingualChange={(language, value) => updateMultilingualValue('title', language, value)}
                      placeholder="Enter slider title"
                      isRequired={true}
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
                              color={imageFile ? "#495057" : "#ADB5BD"}
                              lineHeight="1.4"
                              isTruncated
                            >
                              {imageFile ? imageFile.name : 'Upload slider image'}
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
                    handleInputChange({ target: { name: 'subtitle', value } } as any);
                    updateEnglishValue('subtitle', value);
                  }}
                  onMultilingualChange={(language, value) => updateMultilingualValue('subtitle', language, value)}
                  placeholder="Enter slider subtitle"
                  isRequired={true}
                />

                {/* Content Field */}
                <MultilingualFieldComponent
                  label="Content"
                  fieldName="content"
                  value={formData.content}
                  multilingualData={multilingualData.content || {}}
                  onChange={(value) => {
                    handleInputChange({ target: { name: 'content', value } } as any);
                    updateEnglishValue('content', value);
                  }}
                  onMultilingualChange={(language, value) => updateMultilingualValue('content', language, value)}
                  isTextArea={true}
                  placeholder="Enter slider content..."
                  isRequired={true}
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
          </VStack>
        </Container>
      </Box>
    </AdminProtectedRoute>
  );
};

export default AdminAddSlider; 