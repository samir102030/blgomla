import React, { useState, useEffect } from 'react';
import {
  Box,
  Flex,
  Button,
  Input,
  VStack,
  Text,
  Heading,
  FormControl,
  FormLabel,
  Select,
  Divider,
  Alert,
  AlertIcon,
  useToast,
  Spinner,
  Grid,
} from '@chakra-ui/react';
import { EditIcon } from '@chakra-ui/icons';
import { metaContentAPI } from '../../utils/api';
import { useMultilingualForm } from '../../hooks/useMultilingualForm';
import { MultilingualFieldComponent } from './MultilingualField';

interface SEOData {
  title: { [key: string]: string };
  description: { [key: string]: string };
  keywords: { [key: string]: string };
  ogTitle: { [key: string]: string };
  ogDescription: { [key: string]: string };
  ogImage: string;
  ogType: string;
  ogSiteName: string;
  ogLocale: string;
  twitterCard: string;
  twitterSite: string;
  twitterCreator: string;
  canonicalUrl: string;
  robots: string;
  author: string;
}

const AdminSEO: React.FC = () => {
  const toast = useToast();
  const [seoData, setSeoData] = useState<SEOData | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Multilingual form hooks
  const titleMultilingual = useMultilingualForm(['title']);
  const descriptionMultilingual = useMultilingualForm(['description']);
  const keywordsMultilingual = useMultilingualForm(['keywords']);

  // Form state
  const [formData, setFormData] = useState({
    ogImage: '',
    ogType: 'website',
    ogSiteName: 'EGY-CHEM-HUB',
    ogLocale: 'en_US',
    twitterCard: 'summary_large_image',
    twitterSite: '@egychemhub',
    twitterCreator: '@egychemhub',
    canonicalUrl: 'https://egy-chem-hub.com',
    robots: 'index, follow',
    author: 'EGY-CHEM-HUB',
  });

  useEffect(() => {
    loadSEOData();
  }, []);

  const loadSEOData = async () => {
    try {
      setLoading(true);
      const data = await metaContentAPI.get();
      setSeoData(data);
      
      // Initialize multilingual forms
      if (data) {
        titleMultilingual.initializeFromData(data, ['title']);
        descriptionMultilingual.initializeFromData(data, ['description']);
        keywordsMultilingual.initializeFromData(data, ['keywords']);
        
        // Set form data
        setFormData({
          ogImage: data.ogImage || '/images/logo1.png',
          ogType: data.ogType || 'website',
          ogSiteName: data.ogSiteName || 'EGY-CHEM-HUB',
          ogLocale: data.ogLocale || 'en_US',
          twitterCard: data.twitterCard || 'summary_large_image',
          twitterSite: data.twitterSite || '@egychemhub',
          twitterCreator: data.twitterCreator || '@egychemhub',
          canonicalUrl: data.canonicalUrl || 'https://egy-chem-hub.com',
          robots: data.robots || 'index, follow',
          author: data.author || 'EGY-CHEM-HUB',
        });
      }
    } catch (error) {
      console.error('Failed to load SEO data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load SEO data',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      
      const updateData = {
        title: titleMultilingual.multilingualData.title,
        description: descriptionMultilingual.multilingualData.description,
        keywords: keywordsMultilingual.multilingualData.keywords,
        ...formData,
      };

      await metaContentAPI.update(updateData);
      
      toast({
        title: 'Success',
        description: 'SEO settings saved successfully',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      
      setEditing(false);
      await loadSEOData();
    } catch (error) {
      console.error('Failed to save SEO data:', error);
      toast({
        title: 'Error',
        description: 'Failed to save SEO settings',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditing(false);
    loadSEOData();
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  if (loading) {
    return (
      <Flex justify="center" align="center" h="400px">
        <Spinner size="xl" color="blue.500" />
      </Flex>
    );
  }

  return (
    <Box bg="white" borderRadius="2xl" p={8} boxShadow="sm" border="1.5px solid #E9ECEF" maxW="1200px" mx="auto">
      <Flex justify="space-between" align="center" mb={8}>
        <Heading size="lg" color="#3F0209" fontFamily="IBM Plex Sans">
          SEO Management
        </Heading>
        {!editing && (
          <Button
            leftIcon={<EditIcon />}
            bg="#B40519"
            color="white"
            fontSize="16px"
            fontWeight="500"
            h="48px"
            px={6}
            borderRadius="lg"
            fontFamily="IBM Plex Sans"
            _hover={{ bg: '#9A0416' }}
            _active={{ bg: '#7A0312' }}
            onClick={() => setEditing(true)}
          >
            Edit SEO Settings
          </Button>
        )}
      </Flex>

      <Alert status="info" borderRadius="lg" mb={6}>
        <AlertIcon />
        <Box>
          <Text fontWeight="bold">SEO Optimization Tips:</Text>
          <Text fontSize="sm">
            • Keep titles under 60 characters • Descriptions under 160 characters • Use relevant keywords naturally
          </Text>
        </Box>
      </Alert>

      {editing ? (
        <VStack spacing={8} align="stretch">
          {/* Basic SEO Section */}
          <Box>
            <Heading size="md" color="gray.700" mb={4}>Basic SEO</Heading>
            <Grid templateColumns={{ base: '1fr', lg: '1fr 1fr' }} gap={6}>
              <MultilingualFieldComponent
                label="Meta Title"
                fieldName="title"
                value={titleMultilingual.multilingualData.title?.en || ''}
                multilingualData={titleMultilingual.multilingualData.title || {}}
                onChange={(value) => titleMultilingual.updateEnglishValue('title', value)}
                onMultilingualChange={(lang, value) => titleMultilingual.updateMultilingualValue('title', lang, value)}
                isRequired={true}
                placeholder="Enter meta title (max 60 characters)"
              />
              
              <MultilingualFieldComponent
                label="Meta Description"
                fieldName="description"
                value={descriptionMultilingual.multilingualData.description?.en || ''}
                multilingualData={descriptionMultilingual.multilingualData.description || {}}
                onChange={(value) => descriptionMultilingual.updateEnglishValue('description', value)}
                onMultilingualChange={(lang, value) => descriptionMultilingual.updateMultilingualValue('description', lang, value)}
                isTextArea={true}
                isRequired={true}
                placeholder="Enter meta description (max 160 characters)"
              />
            </Grid>
            
            <MultilingualFieldComponent
              label="Keywords"
              fieldName="keywords"
              value={keywordsMultilingual.multilingualData.keywords?.en || ''}
              multilingualData={keywordsMultilingual.multilingualData.keywords || {}}
              onChange={(value) => keywordsMultilingual.updateEnglishValue('keywords', value)}
              onMultilingualChange={(lang, value) => keywordsMultilingual.updateMultilingualValue('keywords', lang, value)}
              placeholder="Enter keywords separated by commas"
            />
          </Box>

          <Divider />

          {/* Social Media Section */}
          <Box>
            <Heading size="md" color="gray.700" mb={4}>Social Media & Advanced</Heading>
            <Grid templateColumns={{ base: '1fr', md: '1fr 1fr', lg: '1fr 1fr 1fr' }} gap={6}>
              <FormControl>
                <FormLabel>OG Image URL</FormLabel>
                <Input
                  value={formData.ogImage}
                  onChange={(e) => handleInputChange('ogImage', e.target.value)}
                  placeholder="/images/logo1.png"
                />
              </FormControl>
              
              <FormControl>
                <FormLabel>OG Type</FormLabel>
                <Select value={formData.ogType} onChange={(e) => handleInputChange('ogType', e.target.value)}>
                  <option value="website">Website</option>
                  <option value="article">Article</option>
                  <option value="product">Product</option>
                  <option value="company">Company</option>
                </Select>
              </FormControl>
              
              <FormControl>
                <FormLabel>Twitter Card</FormLabel>
                <Select value={formData.twitterCard} onChange={(e) => handleInputChange('twitterCard', e.target.value)}>
                  <option value="summary">Summary</option>
                  <option value="summary_large_image">Summary Large Image</option>
                  <option value="app">App</option>
                  <option value="player">Player</option>
                </Select>
              </FormControl>
              
              <FormControl>
                <FormLabel>Canonical URL</FormLabel>
                <Input
                  value={formData.canonicalUrl}
                  onChange={(e) => handleInputChange('canonicalUrl', e.target.value)}
                  placeholder="https://egy-chem-hub.com"
                />
              </FormControl>
              
              <FormControl>
                <FormLabel>Robots Meta</FormLabel>
                <Select value={formData.robots} onChange={(e) => handleInputChange('robots', e.target.value)}>
                  <option value="index, follow">Index, Follow</option>
                  <option value="noindex, follow">No Index, Follow</option>
                  <option value="index, nofollow">Index, No Follow</option>
                  <option value="noindex, nofollow">No Index, No Follow</option>
                </Select>
              </FormControl>
              
              <FormControl>
                <FormLabel>Author</FormLabel>
                <Input
                  value={formData.author}
                  onChange={(e) => handleInputChange('author', e.target.value)}
                  placeholder="EGY-CHEM-HUB"
                />
              </FormControl>
            </Grid>
          </Box>

          {/* Action Buttons */}
          <Flex justify="flex-end" gap={4} pt={4}>
            <Button
              onClick={handleCancel}
              variant="outline"
              colorScheme="gray"
              isLoading={saving}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              bg="#B40519"
              color="white"
              _hover={{ bg: '#9A0416' }}
              _active={{ bg: '#7A0312' }}
              isLoading={saving}
            >
              Save SEO Settings
            </Button>
          </Flex>
        </VStack>
      ) : (
        <VStack spacing={6} align="stretch">
          {/* Display current SEO settings */}
          <Grid templateColumns={{ base: '1fr', lg: '1fr 1fr' }} gap={6}>
            <Box>
              <Text fontSize="lg" fontWeight="bold" mb={2}>Meta Title</Text>
              <Text color="gray.600">{seoData?.title?.en || 'Not set'}</Text>
            </Box>
            <Box>
              <Text fontSize="lg" fontWeight="bold" mb={2}>Meta Description</Text>
              <Text color="gray.600">{seoData?.description?.en || 'Not set'}</Text>
            </Box>
          </Grid>
          
          <Box>
            <Text fontSize="lg" fontWeight="bold" mb={2}>Keywords</Text>
            <Text color="gray.600">{seoData?.keywords?.en || 'Not set'}</Text>
          </Box>
          
          <Divider />
          
          <Text fontSize="lg" fontWeight="bold" mb={2}>Social Media & Advanced Settings</Text>
          <Grid templateColumns={{ base: '1fr', md: '1fr 1fr' }} gap={4}>
            <Box>
              <Text fontWeight="medium">OG Type:</Text>
              <Text color="gray.600">{seoData?.ogType || 'website'}</Text>
            </Box>
            <Box>
              <Text fontWeight="medium">OG Image:</Text>
              <Text color="gray.600">{seoData?.ogImage || '/images/logo1.png'}</Text>
            </Box>
            <Box>
              <Text fontWeight="medium">Twitter Card:</Text>
              <Text color="gray.600">{seoData?.twitterCard || 'summary_large_image'}</Text>
            </Box>
            <Box>
              <Text fontWeight="medium">Robots:</Text>
              <Text color="gray.600">{seoData?.robots || 'index, follow'}</Text>
            </Box>
          </Grid>
        </VStack>
      )}
    </Box>
  );
};

export default AdminSEO; 