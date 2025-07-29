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
import { eventsAPI, uploadAPI } from '../../utils/api';
import { useMultilingualForm } from '../../hooks/useMultilingualForm';
import { MultilingualFieldComponent } from './MultilingualField';

interface EventData {
  _id?: string;
  title: string;
  description: string;
  shortDescription: string;
  mainImage: string;
  date: string;
  location: string;
}

const AdminEditEvent: React.FC = () => {
  const { eventId } = useParams();
  const isEdit = Boolean(eventId);
  const navigate = useNavigate();
  const toast = useToast();
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [eventName, setEventName] = useState('');
  const [eventImage, setEventImage] = useState<File | null>(null);
  const [currentImageUrl, setCurrentImageUrl] = useState('');
  const [eventContent, setEventContent] = useState('');
  const [eventShortDescription, setEventShortDescription] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventLocation, setEventLocation] = useState('');
  
  const [validationErrors, setValidationErrors] = useState<{[key: string]: string}>({});
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Change tracking
  const [originalData, setOriginalData] = useState<any>(null);
  const [changedFields, setChangedFields] = useState<Set<string>>(new Set());
  const [isInitializing, setIsInitializing] = useState(true);
  
  // Multilingual form hook (only used in edit mode)
  const {
    multilingualData,
    getEnglishValue,
    updateEnglishValue,
    updateMultilingualValue,
    initializeFromData,
    buildUpdatePayload,
  } = useMultilingualForm(isEdit ? ['title', 'description', 'shortDescription', 'location'] : []);

  // Load existing event data when editing
  useEffect(() => {
    if (isEdit && eventId) {
      loadEventData();
    }
  }, [isEdit, eventId]);

  const loadEventData = async () => {
    try {
      setLoading(true);
      setError(null);
      // Use admin endpoint to get full multilingual data for editing
      const event = await eventsAPI.getByIdAdmin(eventId!);
      
      // Store original data for change tracking
      setOriginalData(event);
      
      setEventName(event.title?.en || event.title || '');
      setEventContent(event.description?.en || event.description || '');
      setEventShortDescription(event.shortDescription?.en || event.shortDescription || '');
      setCurrentImageUrl(event.mainImage || '');
      setEventLocation(event.location?.en || event.location || '');
      
      // Initialize multilingual data with full structure (only in edit mode)
      if (isEdit) {
        initializeFromData(event, ['title', 'description', 'shortDescription', 'location']);
      }
      
      // Format date for input field (YYYY-MM-DD)
      if (event.date) {
        const date = new Date(event.date);
        const formattedDate = date.toISOString().split('T')[0];
        setEventDate(formattedDate);
      }
      
      setIsInitializing(false);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load event data';
      setError(errorMessage);
      console.error('Error loading event:', err);
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
      case 'description':
        originalValue = originalData.description?.en || originalData.description || '';
        break;
      case 'shortDescription':
        originalValue = originalData.shortDescription?.en || originalData.shortDescription || '';
        break;
      case 'location':
        originalValue = originalData.location?.en || originalData.location || '';
        break;
      case 'date':
        if (originalData.date) {
          const date = new Date(originalData.date);
          originalValue = date.toISOString().split('T')[0];
        }
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
    if (e.target.files && e.target.files[0]) {
      setEventImage(e.target.files[0]);
      setChangedFields(prev => new Set(prev).add('image'));
      // Clear validation error when user selects an image
      if (validationErrors.image) {
        setValidationErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors.image;
          return newErrors;
        });
      }
    }
  };

  const validateForm = () => {
    const errors: {[key: string]: string} = {};
    
    if (!eventName.trim()) {
      errors.title = 'Event name is required';
    }
    
    if (!eventContent.trim()) {
      errors.content = 'Event content is required';
    }
    
    if (!eventShortDescription.trim()) {
      errors.shortDescription = 'Short description is required';
    }
    
    if (!eventDate) {
      errors.date = 'Event date is required';
    }
    
    if (!eventLocation.trim()) {
      errors.location = 'Event location is required';
    }
    
    if (!currentImageUrl && !eventImage) {
      errors.image = 'Event image is required';
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
    
    // Only send specific changed fields to avoid triggering API translation
    changedFields.forEach(field => {
      if (field === 'image') {
        // Image will be handled separately
        return;
      }
      
      // Handle multilingual field changes with specific language targeting
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
      
      // Handle English changes for multilingual fields
      if (['title', 'description', 'shortDescription', 'location'].includes(field)) {
        if (!updateData[field]) {
          updateData[field] = {};
        }
        
        switch (field) {
          case 'title':
            updateData.title.en = eventName.trim();
            break;
          case 'description':
            updateData.description.en = eventContent.trim();
            break;
          case 'shortDescription':
            updateData.shortDescription.en = eventShortDescription.trim();
            break;
          case 'location':
            updateData.location.en = eventLocation.trim();
            break;
        }
        return;
      }
      
      // Handle non-multilingual field changes
      if (field === 'date') {
        updateData.date = eventDate;
      }
    });
    
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

    try {
      setSaving(true);
      setError(null);

      // Build minimal update data
      const updateData = buildUpdateData();

      // Handle image upload if changed
      if (changedFields.has('image') && eventImage) {
        const uploadResponse = await uploadAPI.uploadImage(eventImage);
        updateData.mainImage = uploadResponse.url;
      }

      // Only send update if there are changes
      if (Object.keys(updateData).length > 0) {
        await eventsAPI.update(eventId!, updateData);
        toast({
          title: 'Success',
          description: 'Event updated successfully',
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

      navigate('/admin/events');
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update event';
      setError(errorMessage);
      toast({
        title: 'Error',
        description: 'Failed to update event',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      console.error('Error updating event:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    navigate('/admin/events');
  };

  if (loading) {
    return (
      <Box px={10} py={10} display="flex" justifyContent="center" alignItems="center" minH="400px">
        <Spinner size="xl" color="#B40519" />
      </Box>
    );
  }

  return (
    <Box px={10} py={10}>
      {/* Breadcrumb */}
      <Breadcrumb spacing="8px" separator={<ChevronRightIcon color="#8D8D8D" />} mb={12}>
        <BreadcrumbItem>
          <BreadcrumbLink 
            fontFamily="IBM Plex Sans" 
            fontSize="24px" 
            color="#8D8D8D"
            onClick={() => navigate('/admin/events')}
            cursor="pointer"
          >
            Events
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbItem isCurrentPage>
          <BreadcrumbLink 
            fontFamily="IBM Plex Sans" 
            fontSize="32px" 
            fontWeight={500}
            color="#3F0209"
          >
            Edit Event
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
        {/* Event Name - Multilingual */}
        <Box>
          <Text fontFamily="IBM Plex Sans" fontSize="24px" fontWeight={500} color="#3F0209" mb={4}>
            Event Name *
          </Text>
          {isEdit ? (
            <MultilingualFieldComponent
              label="Event Name"
              fieldName="title"
              value={eventName}
              multilingualData={multilingualData.title || {}}
              onChange={(value) => {
                setEventName(value);
                trackChange('title', value);
                clearFieldError('title');
              }}
              onMultilingualChange={(language, value) => trackMultilingualChange('title', language, value)}
              isRequired={true}
              error={validationErrors.title}
              placeholder="Enter event name"
            />
          ) : (
            <>
              <Input
                placeholder="Enter event name"
                value={eventName}
                onChange={(e) => {
                  setEventName(e.target.value);
                  trackChange('title', e.target.value);
                  clearFieldError('title');
                }}
                fontFamily="IBM Plex Sans"
                fontSize="20px"
                color="#424242"
                bg="white"
                borderColor={validationErrors.title ? "red.500" : "#BCBCBC"}
                borderWidth="2px"
                borderRadius="lg"
                h="56px"
                _placeholder={{
                  color: '#8D8D8D',
                  fontSize: '20px'
                }}
                _focus={{
                  borderColor: validationErrors.title ? "red.500" : "#B40519",
                  boxShadow: 'none'
                }}
              />
              {validationErrors.title && (
                <Text color="red.500" fontSize="14px" mt={1}>
                  {validationErrors.title}
                </Text>
              )}
            </>
          )}
        </Box>

        {/* Event Image */}
        <Box>
          <Text fontFamily="IBM Plex Sans" fontSize="24px" fontWeight={500} color="#3F0209" mb={4}>
            Event Image *
          </Text>
          <FormControl>
            <FormLabel>
              <Box
                border="2px dashed"
                borderColor={validationErrors.image ? "red.500" : "#BCBCBC"}
                borderRadius="lg"
                p={8}
                textAlign="center"
                cursor="pointer"
                _hover={{ borderColor: validationErrors.image ? "red.500" : "#B40519" }}
              >
                {eventImage || currentImageUrl ? (
                  <VStack spacing={4}>
                    <Image
                      src={eventImage ? URL.createObjectURL(eventImage) : currentImageUrl}
                      alt="Event preview"
                      maxH="200px"
                      borderRadius="lg"
                    />
                    <Text fontFamily="IBM Plex Sans" fontSize="16px" color="#8D8D8D">
                      Click to change image
                    </Text>
                  </VStack>
                ) : (
                  <VStack spacing={4}>
                    <Text fontFamily="IBM Plex Sans" fontSize="20px" color="#8D8D8D">
                      Click to upload event image
                    </Text>
                    <Text fontFamily="IBM Plex Sans" fontSize="16px" color="#8D8D8D">
                      PNG, JPG up to 10MB
                    </Text>
                  </VStack>
                )}
              </Box>
              <Input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                display="none"
              />
            </FormLabel>
          </FormControl>
          {validationErrors.image && (
            <Text color="red.500" fontSize="14px" mt={1}>
              {validationErrors.image}
            </Text>
          )}
        </Box>

        {/* Event Short Description - Multilingual */}
        <Box>
          <Text fontFamily="IBM Plex Sans" fontSize="24px" fontWeight={500} color="#3F0209" mb={4}>
            Short Description *
          </Text>
          {isEdit ? (
            <MultilingualFieldComponent
              label="Short Description"
              fieldName="shortDescription"
              value={eventShortDescription}
              multilingualData={multilingualData.shortDescription || {}}
              onChange={(value) => {
                setEventShortDescription(value);
                trackChange('shortDescription', value);
                clearFieldError('shortDescription');
              }}
              onMultilingualChange={(language, value) => trackMultilingualChange('shortDescription', language, value)}
              isRequired={true}
              error={validationErrors.shortDescription}
              placeholder="Enter short description"
            />
          ) : (
            <>
              <Input
                placeholder="Enter short description"
                value={eventShortDescription}
                onChange={(e) => {
                  setEventShortDescription(e.target.value);
                  trackChange('shortDescription', e.target.value);
                  clearFieldError('shortDescription');
                }}
                fontFamily="IBM Plex Sans"
                fontSize="20px"
                color="#424242"
                bg="white"
                borderColor={validationErrors.shortDescription ? "red.500" : "#BCBCBC"}
                borderWidth="2px"
                borderRadius="lg"
                h="56px"
                _placeholder={{
                  color: '#8D8D8D',
                  fontSize: '20px'
                }}
                _focus={{
                  borderColor: validationErrors.shortDescription ? "red.500" : "#B40519",
                  boxShadow: 'none'
                }}
              />
              {validationErrors.shortDescription && (
                <Text color="red.500" fontSize="14px" mt={1}>
                  {validationErrors.shortDescription}
                </Text>
              )}
            </>
          )}
        </Box>

        {/* Event Date and Location */}
        <Grid templateColumns={{ base: '1fr', md: '1fr 1fr' }} gap={8}>
          <Box>
            <Text fontFamily="IBM Plex Sans" fontSize="24px" fontWeight={500} color="#3F0209" mb={4}>
              Event Date *
            </Text>
            <Input
              type="date"
              value={eventDate}
              onChange={(e) => {
                setEventDate(e.target.value);
                trackChange('date', e.target.value);
                clearFieldError('date');
              }}
              fontFamily="IBM Plex Sans"
              fontSize="20px"
              color="#424242"
              bg="white"
              borderColor={validationErrors.date ? "red.500" : "#BCBCBC"}
              borderWidth="2px"
              borderRadius="lg"
              h="56px"
              _focus={{
                borderColor: validationErrors.date ? "red.500" : "#B40519",
                boxShadow: 'none'
              }}
            />
            {validationErrors.date && (
              <Text color="red.500" fontSize="14px" mt={1}>
                {validationErrors.date}
              </Text>
            )}
          </Box>

          <Box>
            <Text fontFamily="IBM Plex Sans" fontSize="24px" fontWeight={500} color="#3F0209" mb={4}>
              Event Location *
            </Text>
            {isEdit ? (
              <MultilingualFieldComponent
                label="Event Location"
                fieldName="location"
                value={eventLocation}
                multilingualData={multilingualData.location || {}}
                onChange={(value) => {
                  setEventLocation(value);
                  trackChange('location', value);
                  clearFieldError('location');
                }}
                onMultilingualChange={(language, value) => trackMultilingualChange('location', language, value)}
                isRequired={true}
                error={validationErrors.location}
                placeholder="Enter event location"
              />
            ) : (
              <>
                <Input
                  placeholder="Enter event location"
                  value={eventLocation}
                  onChange={(e) => {
                    setEventLocation(e.target.value);
                    trackChange('location', e.target.value);
                    clearFieldError('location');
                  }}
                  fontFamily="IBM Plex Sans"
                  fontSize="20px"
                  color="#424242"
                  bg="white"
                  borderColor={validationErrors.location ? "red.500" : "#BCBCBC"}
                  borderWidth="2px"
                  borderRadius="lg"
                  h="56px"
                  _placeholder={{
                    color: '#8D8D8D',
                    fontSize: '20px'
                  }}
                  _focus={{
                    borderColor: validationErrors.location ? "red.500" : "#B40519",
                    boxShadow: 'none'
                  }}
                />
                {validationErrors.location && (
                  <Text color="red.500" fontSize="14px" mt={1}>
                    {validationErrors.location}
                  </Text>
                )}
              </>
            )}
          </Box>
        </Grid>

        {/* Event Content - Multilingual */}
        <Box>
          <Text fontFamily="IBM Plex Sans" fontSize="24px" fontWeight={500} color="#3F0209" mb={4}>
            Event Content *
          </Text>
          {isEdit ? (
            <MultilingualFieldComponent
              label="Event Content"
              fieldName="description"
              value={eventContent}
              multilingualData={multilingualData.description || {}}
              onChange={(value) => {
                setEventContent(value);
                trackChange('description', value);
                clearFieldError('content');
              }}
              onMultilingualChange={(language, value) => trackMultilingualChange('description', language, value)}
              isTextArea={true}
              isRequired={true}
              error={validationErrors.content}
              placeholder="Enter event content"
            />
          ) : (
            <>
              <Box
                border="2px solid"
                borderColor={validationErrors.content ? "red.500" : "#BCBCBC"}
                borderRadius="lg"
                overflow="hidden"
                bg="white"
              >
                <ReactQuill
                  value={eventContent}
                  onChange={(value) => {
                    setEventContent(value);
                    trackChange('description', value);
                    clearFieldError('content');
                  }}
                  theme="snow"
                  modules={{
                    toolbar: [
                      [{ 'header': [1, 2, 3, false] }],
                      ['bold', 'italic', 'underline', 'strike'],
                      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                      [{ 'align': [] }],
                      ['link', 'image'],
                      ['clean']
                    ],
                  }}
                  style={{ 
                    height: '200px',
                    fontFamily: 'IBM Plex Sans'
                  }}
                />
              </Box>
              {validationErrors.content && (
                <Text color="red.500" fontSize="14px" mt={1}>
                  {validationErrors.content}
                </Text>
              )}
            </>
          )}
        </Box>

        {/* Action Buttons */}
        <AdminActionButtons
          onSave={handleSave}
          onCancel={handleCancel}
          isLoading={saving}
          saveLabel="Update Event"
        />
      </VStack>
    </Box>
  );
};

export default AdminEditEvent; 