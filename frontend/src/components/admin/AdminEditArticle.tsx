import React, { useState, useRef, useEffect } from 'react';
import { 
  Box, 
  Button, 
  Flex, 
  Heading, 
  Input, 
  Text, 
  useToast,
  FormControl,
  FormLabel,
  VStack,
  Grid,
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  Spinner,
  Alert,
  AlertIcon,
  Image
} from '@chakra-ui/react';
import { ChevronRightIcon } from '@chakra-ui/icons';
import { useParams, useNavigate } from 'react-router-dom';
import AdminActionButtons from './AdminActionButtons';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { articlesAPI, uploadAPI } from '../../utils/api';
import { useUserStore } from '../../stores/user.store';
import { useMultilingualForm } from '../../hooks/useMultilingualForm';
import { MultilingualFieldComponent } from './MultilingualField';

const AdminEditArticle: React.FC = () => {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const toast = useToast();
  const user = useUserStore(state => state.user);
  const isLoggedIn = !!user;
  const isAdmin = user?.isAdmin || false;
  
  // Form state
  const [title, setTitle] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [content, setContent] = useState('');
  const [categories, setCategories] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  
  // UI state
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<{ [key: string]: string }>({});
  
  // Change tracking
  const [originalData, setOriginalData] = useState<any>(null);
  const [changedFields, setChangedFields] = useState<Set<string>>(new Set());
  const [isInitializing, setIsInitializing] = useState(true);
  
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Multilingual form hook (only used in edit mode)
  const {
    multilingualData,
    getEnglishValue,
    updateEnglishValue,
    updateMultilingualValue,
    initializeFromData,
    buildUpdatePayload,
  } = useMultilingualForm(isEdit ? ['title', 'content'] : []);

  // Load existing article data when editing
  useEffect(() => {
    if (isEdit && id) {
      loadArticle(id);
    }
  }, [isEdit, id]);

  const loadArticle = async (articleId: string) => {
    try {
      setLoading(true);
      setError(null);
      
      // Use admin endpoint for edit mode to get full multilingual data
      const article = await articlesAPI.getByIdAdmin(articleId);
      
      // Store original data for change tracking
      setOriginalData(article);
      
      // Set English values or fallback to first available language
      setTitle(article.title?.en || article.title || '');
      setContent(article.content?.en || article.content || '');
      setCategories(article.categories || []);
      setTags(article.tags || []);
      
      // Initialize multilingual data with full structure (only in edit mode)
      if (isEdit) {
        initializeFromData(article, ['title', 'content']);
      }
      
      if (article.mainImage) {
        setImagePreview(article.mainImage);
      }
      
      setIsInitializing(false);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load article';
      setError(errorMessage);
      toast({
        title: 'Error',
        description: 'Failed to load article data',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  const trackChange = (field: string, value: string) => {
    if (isInitializing || !originalData) return;
    
    let originalValue = '';
    switch (field) {
      case 'title':
        originalValue = originalData.title?.en || originalData.title || '';
        break;
      case 'content':
        originalValue = originalData.content?.en || originalData.content || '';
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

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImage(file);
      setChangedFields(prev => new Set(prev).add('image'));
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
      
      // Clear validation error
      if (validationErrors.image) {
        setValidationErrors(prev => ({ ...prev, image: '' }));
      }
    }
  };

  const validateForm = (): boolean => {
    const errors: { [key: string]: string } = {};

    if (!title.trim()) {
      errors.title = 'Article title is required';
    }

    if (!content.trim()) {
      errors.content = 'Article content is required';
    }

    if (!isEdit && !image && !imagePreview) {
      errors.image = 'Article image is required';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const clearFieldError = (field: string) => {
    if (validationErrors[field]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
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
      updateData.title.en = title.trim();
    }
    
    if (changedFields.has('content')) {
      if (!updateData.content) {
        updateData.content = {};
      }
      updateData.content.en = content.trim();
    }
    
    return updateData;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      toast({
        title: 'Validation Error',
        description: 'Please fix the errors in the form',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    try {
      setSaving(true);
      setError(null);

      if (isEdit && id) {
        // Build minimal update data for edits
        const updateData = buildUpdateData();

        // Upload new image if selected
        if (changedFields.has('image') && image) {
          const uploadResponse = await uploadAPI.uploadImage(image);
          updateData.mainImage = uploadResponse.url;
        }

        console.log('Changed fields:', Array.from(changedFields));
        console.log('Sending minimal update data:', updateData);

        // Only send update if there are changes
        if (Object.keys(updateData).length > 0) {
          await articlesAPI.update(id, updateData);
          toast({
            title: 'Success',
            description: 'Article updated successfully',
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
      } else {
        // For new articles, upload image and send all data
        let imageUrl = '';
        if (image) {
          const uploadResponse = await uploadAPI.uploadImage(image);
          imageUrl = uploadResponse.url;
        }

        const articleData = {
          title: title.trim(),
          content: content.trim(),
          mainImage: imageUrl,
          categories,
          tags,
        };

        await articlesAPI.create(articleData);
        toast({
          title: 'Success',
          description: 'Article created successfully',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
      }

      navigate('/admin/articles');
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save article';
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
    navigate('/admin/articles');
  };

  if (loading) {
    return (
      <Box p={10}>
        <Flex justify="center" align="center" h="400px">
          <Spinner size="xl" color="#B40519" />
        </Flex>
      </Box>
    );
  }

  return (
    <Box p={10}>
      {/* Breadcrumb */}
      <Breadcrumb spacing="8px" separator={<ChevronRightIcon color="#8D8D8D" />} mb={12}>
        <BreadcrumbItem>
          <BreadcrumbLink 
            fontFamily="IBM Plex Sans" 
            fontSize="24px" 
            color="#8D8D8D"
            onClick={() => navigate('/admin/articles')}
            cursor="pointer"
          >
            Articles
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbItem isCurrentPage>
          <BreadcrumbLink 
            fontFamily="IBM Plex Sans" 
            fontSize="32px" 
            fontWeight={500}
            color="#3F0209"
          >
            {isEdit ? 'Edit Article' : 'Add Article'}
          </BreadcrumbLink>
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

      <VStack spacing={16} align="stretch">
        {/* Article Title and Image - Side by Side */}
        <Grid templateColumns={{ base: '1fr', md: '1fr 1fr' }} gap={8}>
          {/* Article Title */}
          <Box>
            {isEdit ? (
              <MultilingualFieldComponent
                label="Article Title"
                fieldName="title"
                value={title}
                multilingualData={multilingualData.title || {}}
                onChange={(value) => {
                  setTitle(value);
                  trackChange('title', value);
                  updateEnglishValue('title', value);
                  clearFieldError('title');
                }}
                onMultilingualChange={(lang, value) => trackMultilingualChange('title', lang, value)}
                isRequired={true}
                error={validationErrors.title}
                placeholder="Enter article title"
              />
            ) : (
              <>
                <Text fontFamily="IBM Plex Sans" fontSize="24px" fontWeight={500} color="#424242" mb={5}>
                  Article Title *
                </Text>
                <Input
                  placeholder="Enter article title"
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    trackChange('title', e.target.value);
                    clearFieldError('title');
                  }}
                  fontFamily="IBM Plex Sans"
                  fontSize="24px"
                  color="#8D8D8D"
                  bg="#fff"
                  border={`2px solid ${validationErrors.title ? '#E53E3E' : '#EAEAEA'}`}
                  borderRadius="lg"
                  h="64px"
                  px={3}
                  _focus={{ borderColor: validationErrors.title ? '#E53E3E' : '#B40519', boxShadow: 'none' }}
                />
                {validationErrors.title && (
                  <Text color="#E53E3E" fontSize="14px" mt={1}>{validationErrors.title}</Text>
                )}
                <Text fontSize="xs" color="#B40519" mt={1} cursor="pointer">
                  🔗 Automatic translation
                </Text>
              </>
            )}
          </Box>

          {/* Article Image */}
          <Box>
            <Text fontFamily="IBM Plex Sans" fontSize="24px" fontWeight={500} color="#424242" mb={5}>
              Article Image {!isEdit && '*'}
            </Text>
            <Input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              ref={imageInputRef}
              display="none"
            />
            <Box flex="1" position="relative">
              <Flex align="center" h="64px" borderRadius="lg" border={`2px solid ${validationErrors.image ? '#E53E3E' : '#EAEAEA'}`} bg="#fff" pl={3} pr={0} py={3}>
                <Text fontFamily="IBM Plex Sans" fontSize="24px" color="#8D8D8D" flex="1">
                  {image ? image.name : imagePreview ? 'Current image' : 'upload article image'}
                </Text>
                <Box
                  bg="#EAEAEA"
                  h="64px"
                  w="120px"
                  borderTopRightRadius="8px"
                  borderBottomRightRadius="8px"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  cursor="pointer"
                  onClick={() => imageInputRef.current?.click()}
                  _hover={{ bg: '#D0D0D0' }}
                >
                  <Text fontFamily="IBM Plex Sans" fontSize="20px" color="#424242" fontWeight={500}>Choose File</Text>
                </Box>
              </Flex>
            </Box>
            {validationErrors.image && (
              <Text fontSize="sm" color="red.500" mt={1}>{validationErrors.image}</Text>
            )}
            {imagePreview && (
              <Box mt={2}>
                <Image src={imagePreview} alt="Preview" maxH="120px" borderRadius="md" />
              </Box>
            )}
            <Text fontFamily="IBM Plex Sans" fontSize="20px" color="#8D8D8D" mt={2}>
              Recommended size: 800x400px
            </Text>
          </Box>
        </Grid>

        {/* Article Content */}
        <Box>
          {isEdit ? (
            <MultilingualFieldComponent
              label="Article Content"
              fieldName="content"
              value={content}
              multilingualData={multilingualData.content || {}}
              onChange={(value) => {
                setContent(value);
                trackChange('content', value);
                updateEnglishValue('content', value);
                clearFieldError('content');
              }}
              onMultilingualChange={(lang, value) => trackMultilingualChange('content', lang, value)}
              isTextArea={true}
              isRequired={true}
              error={validationErrors.content}
              placeholder="Enter article content"
            />
          ) : (
            <>
              <Text fontFamily="IBM Plex Sans" fontSize="24px" fontWeight={500} color="#424242" mb={5}>
                Article Content *
              </Text>
              <Box
                border={`1px solid ${validationErrors.content ? '#E53E3E' : '#EAEAEA'}`}
                borderRadius="2xl"
                bg="#fff"
                minH="224px"
              >
                <ReactQuill
                  value={content}
                  onChange={(value) => {
                    setContent(value);
                    trackChange('content', value);
                    clearFieldError('content');
                  }}
                  style={{
                    height: '200px',
                    fontFamily: 'IBM Plex Sans',
                  }}
                  modules={{
                    toolbar: [
                      ['bold', 'italic', 'underline', 'strike'],
                      [{ 'color': [] }, { 'background': [] }],
                      ['link', 'image'],
                      [{ 'list': 'ordered' }, { 'list': 'bullet' }],
                      ['clean']
                    ],
                  }}
                />
              </Box>
              {validationErrors.content && (
                <Text fontSize="sm" color="red.500" mt={1}>{validationErrors.content}</Text>
              )}
              <Text fontSize="xs" color="#B40519" mt={3} cursor="pointer">
                🔗 Automatic translation
              </Text>
            </>
          )}
        </Box>

        {/* Action Buttons */}
        <AdminActionButtons
          onSave={handleSave}
          onCancel={handleCancel}
          saveLabel={isEdit ? 'Update Article' : 'Save Article'}
          isLoading={saving}
          isDisabled={saving}
        />
      </VStack>
    </Box>
  );
};

export default AdminEditArticle; 