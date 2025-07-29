import React, { useState, useEffect, useRef } from 'react';
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
import AdminActionButtons from '../components/admin/AdminActionButtons';
import { missionAPI } from '../utils/api';
import { useMultilingualForm } from '../hooks/useMultilingualForm';
import { MultilingualFieldComponent } from '../components/admin/MultilingualField';
import AdminProtectedRoute from '../components/admin/AdminProtectedRoute';

const MissionEdit = () => {
  const navigate = useNavigate();
  const toast = useToast();
  
  // Form state
  const [content, setContent] = useState('');
  
  // UI state
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<{ [key: string]: string }>({});

  // Track which languages have been changed for each field
  const changedContentLangs = useRef<Set<string>>(new Set(['en']));
  const changedTitleLangs = useRef<Set<string>>(new Set(['en']));

  // Multilingual form hook
  const {
    multilingualData,
    updateEnglishValue,
    updateMultilingualValue,
    initializeFromData,
    buildUpdatePayload,
  } = useMultilingualForm(['title', 'content']);

  const contentPadding = useBreakpointValue({ base: 4, md: 10 });

  useEffect(() => {
    loadMission();
  }, []);

  useEffect(() => {
    console.log('Component state:', { content, multilingualData, loading });
  }, [content, multilingualData, loading]);

  const loadMission = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const mission = await missionAPI.get();
      console.log('Loaded mission:', mission); // Debug log
      
      // Handle both old format (string) and new format (multilingual object)
      if (mission.content) {
        if (typeof mission.content === 'string') {
          setContent(mission.content);
        } else {
          setContent(mission.content.en || '');
        }
      }
      // Always initialize multilingual data for both title and content
      initializeFromData(mission, ['title', 'content']);
      // Reset change tracking sets after loading data
      changedContentLangs.current = new Set();
      changedTitleLangs.current = new Set();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load mission';
      setError(errorMessage);
      toast({
        title: 'Error',
        description: 'Failed to load mission data',
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
      errors.content = 'Mission content is required';
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

      // Defensive: if English content has changed but 'en' is not in the set, add it
      const currentEn = multilingualData.content?.en || '';
      if (content.trim() !== '' && content.trim() !== currentEn && !changedContentLangs.current.has('en')) {
        changedContentLangs.current.add('en');
        console.log('Defensive: Added en to changedContentLangs because content changed');
      }

      // Build payload: only include changed languages and only include fields that have changes
      const buildMissionPayload = () => {
        const payload: any = {};
        // Content
        const contentData = multilingualData.content as { [key: string]: string } | undefined;
        if (contentData && changedContentLangs.current.size > 0) {
          payload.content = {};
          changedContentLangs.current.forEach(lang => {
            if (contentData[lang] && contentData[lang].trim() !== '') {
              payload.content[lang] = contentData[lang];
            }
          });
          if (Object.keys(payload.content).length === 0) {
            delete payload.content;
          }
        }
        // Title
        const titleData = multilingualData.title as { [key: string]: string } | undefined;
        if (titleData && changedTitleLangs.current.size > 0) {
          payload.title = {};
          changedTitleLangs.current.forEach(lang => {
            if (titleData[lang] && titleData[lang].trim() !== '') {
              payload.title[lang] = titleData[lang];
            }
          });
          if (Object.keys(payload.title).length === 0) {
            delete payload.title;
          }
        }
        return payload;
      };

      const missionData = buildMissionPayload();

      console.log('Saving mission data:', missionData); // Debug log

      await missionAPI.update(missionData);
      
      toast({
        title: 'Success',
        description: 'Mission updated successfully',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });

      navigate('/admin/about');
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save mission';
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
              dont Edit Mission
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
          {/* Mission Content - Multilingual Form */}
          <Box>
            <MultilingualFieldComponent
              label="Mission Content"
              fieldName="content"
              value={content}
              multilingualData={multilingualData.content || {}}
              onChange={(value) => {
                setContent(value);
                updateEnglishValue('content', value);
                multilingualData.content.en = value; // Ensure sync
                clearFieldError('content');
                changedContentLangs.current.add('en');
                console.log('English content changed, set:', Array.from(changedContentLangs.current));
              }}
              onMultilingualChange={(lang, value) => {
                updateMultilingualValue('content', lang, value);
                if (lang === 'en') {
                  setContent(value); // Ensure sync
                }
                changedContentLangs.current.add(lang);
              }}
              isTextArea={true}
              isRequired={true}
              error={validationErrors.content}
              placeholder="Enter mission content"
            />
          </Box>

          {/* Action Buttons */}
          <AdminActionButtons
            onSave={handleSave}
            onCancel={handleCancel}
            saveLabel="Update Mission"
            isLoading={saving}
            isDisabled={saving}
          />
        </VStack>
      </Box>
    </AdminProtectedRoute>
  );
};

export default MissionEdit; 