import { Box, Text, Input, Flex, HStack, Button, useToast, Alert, AlertIcon, Textarea } from '@chakra-ui/react';
import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { categoriesAPI, uploadAPI } from '../../utils/api';
import { ChevronRightIcon } from '@chakra-ui/icons';

interface ValidationErrors {
  industryName: string;
  industryDescription: string;
  image: string;
}

const AdminAddIndustry = () => {
  const navigate = useNavigate();
  const toast = useToast();
  
  const [industryName, setIndustryName] = useState('');
  const [industryDescription, setIndustryDescription] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Component state
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({
    industryName: '',
    industryDescription: '',
    image: ''
  });

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImage(file);
      
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

  const validateForm = (): boolean => {
    const errors: ValidationErrors = {
      industryName: '',
      industryDescription: '',
      image: ''
    };

    if (!industryName.trim()) {
      errors.industryName = 'Industry name is required';
    }

    if (!industryDescription.trim()) {
      errors.industryDescription = 'Industry description is required';
    }

    if (!image) {
      errors.image = 'Industry image is required';
    }

    setValidationErrors(errors);
    return Object.values(errors).every(error => error === '');
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

      // Upload industry image
      if (image) {
        const uploadResponse = await uploadAPI.uploadImage(image);
        imageUrl = uploadResponse.url;
      }

      const categoryData = {
        name: industryName.trim(),
        description: industryDescription.trim(),
        image: imageUrl,
      };

      const response = await categoriesAPI.create(categoryData);

      toast({
        title: 'Success',
        description: 'Industry created successfully',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });

      navigate('/admin/industries');
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create industry';
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
    navigate('/admin/industries');
  };

  return (
    <Box px={0} pt={12} pb={0} bg="#F8F9FA" minH="100vh">
      <Box w="100%" maxW="1052px" mx="auto" bg="#fff" borderRadius="2xl" border="2px solid #E7E9EC" p={0}>
        <Box px={10} pt={10} pb={0}>
          {/* Breadcrumb */}
          <HStack spacing={4} align="center" mb={12}>
            <Text fontFamily="IBM Plex Sans" fontSize="24px" color="#8D8D8D" fontWeight={400} lineHeight="40px">Industries</Text>
            <ChevronRightIcon boxSize={7} color="#8D8D8D" />
            <Text fontFamily="IBM Plex Sans" fontSize="32px" color="#3F0209" fontWeight={500} lineHeight="56px">Add industry</Text>
          </HStack>

          {error && (
            <Alert status="error" mb={6}>
              <AlertIcon />
              {error}
            </Alert>
          )}

          {/* Form Fields: Vertical layout */}
          <Box mb={12}>
            {/* Industry Name */}
            <Box mb={8}>
              <Text fontFamily="IBM Plex Sans" fontSize="24px" color="#424242" fontWeight={500} mb={5}>Industry Name *</Text>
              <Box position="relative" mb={2}>
                <Input
                  h="64px"
                  fontSize="24px"
                  fontFamily="IBM Plex Sans"
                  color="#8D8D8D"
                  borderRadius="lg"
                  border={`2px solid ${validationErrors.industryName ? '#E53E3E' : '#EAEAEA'}`}
                  placeholder="Enter industry name"
                  value={industryName}
                  onChange={e => {
                    setIndustryName(e.target.value);
                    if (validationErrors.industryName) {
                      setValidationErrors(prev => ({ ...prev, industryName: '' }));
                    }
                  }}
                  _placeholder={{ color: '#8D8D8D', fontSize: '24px' }}
                  _focus={{ borderColor: validationErrors.industryName ? '#E53E3E' : '#B40519', boxShadow: 'none' }}
                />
              </Box>
              {validationErrors.industryName && (
                <Text color="#E53E3E" fontSize="14px" mb={2}>{validationErrors.industryName}</Text>
              )}
              <HStack spacing={2} mt={2}>
                <Box as="span" color="#B40519" fontWeight={600} fontSize="20px" textDecoration="underline" fontFamily="IBM Plex Sans">Automatic translation</Box>
              </HStack>
            </Box>
            
            {/* Industry Description */}
            <Box>
              <Text fontFamily="IBM Plex Sans" fontSize="24px" color="#424242" fontWeight={500} mb={5}>Industry Description *</Text>
              <Box position="relative" mb={2}>
                <Textarea
                  h="120px"
                  fontSize="24px"
                  fontFamily="IBM Plex Sans"
                  color="#8D8D8D"
                  borderRadius="lg"
                  border={`2px solid ${validationErrors.industryDescription ? '#E53E3E' : '#EAEAEA'}`}
                  placeholder="Enter industry description"
                  value={industryDescription}
                  onChange={e => {
                    setIndustryDescription(e.target.value);
                    if (validationErrors.industryDescription) {
                      setValidationErrors(prev => ({ ...prev, industryDescription: '' }));
                    }
                  }}
                  _placeholder={{ color: '#8D8D8D', fontSize: '24px' }}
                  _focus={{ borderColor: validationErrors.industryDescription ? '#E53E3E' : '#B40519', boxShadow: 'none' }}
                  resize="vertical"
                />
              </Box>
              {validationErrors.industryDescription && (
                <Text color="#E53E3E" fontSize="14px" mb={2}>{validationErrors.industryDescription}</Text>
              )}
              <HStack spacing={2} mt={2}>
                <Box as="span" color="#B40519" fontWeight={600} fontSize="20px" textDecoration="underline" fontFamily="IBM Plex Sans">Automatic translation</Box>
              </HStack>
            </Box>
          </Box>

          {/* Industry Image Section */}
          <Box mb={12}>
            <Text fontFamily="IBM Plex Sans" fontSize="24px" color="#424242" fontWeight={500} mb={5}>Industry Image *</Text>
            <Flex align="center" mb={2}>
              <Input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                display="none"
                onChange={handleImageChange}
              />
              <Box flex="1" position="relative">
                <Flex align="center" h="64px" borderRadius="lg" border={`2px solid ${validationErrors.image ? '#E53E3E' : '#EAEAEA'}`} pl={3} pr={0} py={3}>
                  <Text fontFamily="IBM Plex Sans" fontSize="24px" color="#8D8D8D" flex="1">{image ? image.name : 'upload industry image'}</Text>
                  <Box
                    bg="#EAEAEA"
                    h="64px"
                    w="156px"
                    borderTopRightRadius="8px"
                    borderBottomRightRadius="8px"
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    cursor="pointer"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Text fontFamily="IBM Plex Sans" fontSize="20px" color="#424242" fontWeight={500}>Choose File</Text>
                  </Box>
                </Flex>
              </Box>
            </Flex>
            {validationErrors.image && (
              <Text color="#E53E3E" fontSize="14px" mb={2}>{validationErrors.image}</Text>
            )}
            {imagePreview && (
              <Box mt={2} mb={2}>
                <img src={imagePreview} alt="Preview" style={{ maxHeight: '120px', borderRadius: '8px' }} />
              </Box>
            )}
            <Text fontFamily="IBM Plex Sans" fontSize="20px" color="#8D8D8D" mt={2}>Recommended size: 400x300px</Text>
          </Box>
          {/* Buttons */}
          <Flex gap={5} mt={12} mb={8}>
            <Button
              flex={1}
              h="80px"
              bg="#B40519"
              color="#fff"
              fontFamily="IBM Plex Sans"
              fontSize="24px"
              fontWeight={600}
              borderRadius="xl"
              _hover={{ bg: '#9A0416' }}
              _active={{ bg: '#7A0312' }}
              onClick={handleSave}
              isLoading={saving}
              loadingText="Creating..."
            >
              Save
            </Button>
            <Button
              flex={1}
              h="80px"
              bg="#F8E6E8"
              color="#B40519"
              fontFamily="IBM Plex Sans"
              fontSize="24px"
              fontWeight={400}
              borderRadius="xl"
              _hover={{ bg: '#F0D6D9' }}
              _active={{ bg: '#E8C6CA' }}
              onClick={handleCancel}
              isDisabled={saving}
            >
              Cancel
            </Button>
          </Flex>
        </Box>
      </Box>
    </Box>
  );
};

export default AdminAddIndustry; 