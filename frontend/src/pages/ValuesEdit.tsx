import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Flex, 
  Text, 
  useToast,
  VStack,
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  Spinner,
  Alert,
  AlertIcon,
  useBreakpointValue
} from '@chakra-ui/react';
import { ChevronRightIcon } from '@chakra-ui/icons';
import { useNavigate } from 'react-router-dom';
import AdminProtectedRoute from '../components/admin/AdminProtectedRoute';
import AdminActionButtons from '../components/admin/AdminActionButtons';
import { valuesAPI } from '../utils/api';
import { useMultilingualForm } from '../hooks/useMultilingualForm';
import { MultilingualFieldComponent } from '../components/admin/MultilingualField';

const ValuesEdit = () => {
  const navigate = useNavigate();
  const toast = useToast();
  
  // Form state
  const [content, setContent] = useState('');
  
  // UI state
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<{ [key: string]: string }>({});
  
  // Multilingual form hook
  const {
    multilingualData,
    updateEnglishValue,
    updateMultilingualValue,
    initializeFromData,
    buildUpdatePayload,
  } = useMultilingualForm(['content']);

  const contentPadding = useBreakpointValue({ base: 4, md: 10 });

  useEffect(() => {
    loadValues();
  }, []);

  const loadValues = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const values = await valuesAPI.get();
      
      // Handle both old format (string) and new format (multilingual object)
      if (values.content) {
        if (typeof values.content === 'string') {
          setContent(values.content);
        } else {
          setContent(values.content.en || '');
          initializeFromData(values, ['content']);
        }
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load values';
      setError(errorMessage);
      toast({
        title: 'Error',
        description: 'Failed to load values data',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const errors: { [key: string]: string } = {};

    if (!content.trim()) {
      errors.content = 'Values content is required';
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

      const valuesData = {
        title: 'Values',
        content: content.trim(),
        ...buildUpdatePayload(),
      };

      await valuesAPI.update(valuesData);
      
      toast({
        title: 'Success',
        description: 'Values updated successfully',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });

      navigate('/admin/about');
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save values';
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
    navigate('/admin/about');
  };

  if (loading) {
    return (
      <AdminProtectedRoute>
        <Flex justify="center" align="center" h="400px" px={contentPadding}>
          <Spinner size="xl" color="#B40519" />
        </Flex>
      </AdminProtectedRoute>
    );
  }

  return (
    <AdminProtectedRoute>
      <Box px={contentPadding} py={10}>
        {/* Breadcrumb */}
        <Breadcrumb spacing="8px" separator={<ChevronRightIcon color="#8D8D8D" />} mb={12}>
          <BreadcrumbItem>
            <BreadcrumbLink 
              fontFamily="IBM Plex Sans" 
              fontSize="24px" 
              color="#8D8D8D"
              onClick={() => navigate('/admin/about')}
              cursor="pointer"
            >
              About
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbItem isCurrentPage>
            <BreadcrumbLink 
              fontFamily="IBM Plex Sans" 
              fontSize="32px" 
              fontWeight={500}
              color="#3F0209"
            >
              Edit Values
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
          {/* Values Content - Multilingual Form */}
          <Box>
            <MultilingualFieldComponent
              label="Values Content"
              fieldName="content"
              value={content}
              multilingualData={multilingualData.content || {}}
              onChange={(value) => {
                setContent(value);
                updateEnglishValue('content', value);
                clearFieldError('content');
              }}
              onMultilingualChange={(lang, value) => updateMultilingualValue('content', lang, value)}
              isTextArea={true}
              isRequired={true}
              error={validationErrors.content}
              placeholder="Enter values content"
            />
          </Box>

          {/* Action Buttons */}
          <AdminActionButtons
            onSave={handleSave}
            onCancel={handleCancel}
            saveLabel="Update Values"
            isLoading={saving}
            isDisabled={saving}
          />
        </VStack>
      </Box>
    </AdminProtectedRoute>
  );
};

export default ValuesEdit; 