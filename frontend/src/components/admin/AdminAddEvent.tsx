import React, { useState, useRef } from 'react';
import {
  Box,
  Button,
  Flex,
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
  Alert,
  AlertIcon,
  Image
} from '@chakra-ui/react';
import { ChevronRightIcon } from '@chakra-ui/icons';
import { useNavigate } from 'react-router-dom';
import AdminActionButtons from './AdminActionButtons';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { eventsAPI, uploadAPI } from '../../utils/api';

const AdminAddEvent: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();
  
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [eventName, setEventName] = useState('');
  const [eventImage, setEventImage] = useState<File | null>(null);
  const [eventContent, setEventContent] = useState('');
  const [eventShortDescription, setEventShortDescription] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventLocation, setEventLocation] = useState('');
  
  const [validationErrors, setValidationErrors] = useState<{[key: string]: string}>({});
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setEventImage(e.target.files[0]);
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
    
    if (!eventImage) {
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

      // Upload event image
      const uploadResponse = await uploadAPI.uploadImage(eventImage!);
      const imageUrl = uploadResponse.url;

      const eventData = {
        title: eventName.trim(),
        description: eventContent.trim(),
        shortDescription: eventShortDescription.trim(),
        mainImage: imageUrl,
        date: eventDate,
        location: eventLocation.trim(),
      };

      await eventsAPI.create(eventData);
      
      toast({
        title: 'Success',
        description: 'Event created successfully',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });

      navigate('/admin/events');
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create event';
      setError(errorMessage);
      toast({
        title: 'Error',
        description: 'Failed to create event',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      console.error('Error creating event:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    navigate('/admin/events');
  };

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
            Add Event
          </BreadcrumbLink>
        </BreadcrumbItem>
      </Breadcrumb>

      {error && (
        <Alert status="error" mb={6}>
          <AlertIcon />
          {error}
        </Alert>
      )}

      <VStack spacing={16} align="stretch">
        {/* Event Name */}
        <Box>
          <Text fontFamily="IBM Plex Sans" fontSize="24px" fontWeight={500} color="#3F0209" mb={4}>
            Event Name *
          </Text>
          <Input
            placeholder="Enter event name"
            value={eventName}
            onChange={(e) => {
              setEventName(e.target.value);
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
                {eventImage ? (
                  <VStack spacing={4}>
                    <Image
                      src={URL.createObjectURL(eventImage)}
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

        {/* Event Short Description */}
        <Box>
          <Text fontFamily="IBM Plex Sans" fontSize="24px" fontWeight={500} color="#3F0209" mb={4}>
            Short Description *
          </Text>
          <Input
            placeholder="Enter short description"
            value={eventShortDescription}
            onChange={(e) => {
              setEventShortDescription(e.target.value);
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
            <Input
              placeholder="Enter event location"
              value={eventLocation}
              onChange={(e) => {
                setEventLocation(e.target.value);
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
          </Box>
        </Grid>

        {/* Event Content */}
        <Box>
          <Text fontFamily="IBM Plex Sans" fontSize="24px" fontWeight={500} color="#3F0209" mb={4}>
            Event Content *
          </Text>
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
        </Box>

        {/* Action Buttons */}
        <AdminActionButtons
          onSave={handleSave}
          onCancel={handleCancel}
          isLoading={saving}
          saveLabel="Create Event"
        />
      </VStack>
    </Box>
  );
};

export default AdminAddEvent; 