import {
  Box,
  Flex,
  Button,
  Input,
  InputGroup,
  InputLeftElement,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Checkbox,
  Image,
  IconButton,
  HStack,
  Text,
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  VStack,
  Textarea,
  Modal,
  ModalOverlay,
  ModalContent,
  Alert,
  AlertIcon,
  useToast,
  Spinner,
  Grid,
  useDisclosure,
  FormControl,
  FormLabel,
  SimpleGrid,
} from '@chakra-ui/react';
import { SearchIcon, AddIcon, ViewIcon, EditIcon, DeleteIcon, ChevronRightIcon } from '@chakra-ui/icons';
import { useNavigate } from 'react-router-dom';

import { useState, useEffect, useCallback, useRef } from 'react';
import Pagination from '../common/Pagination';
import AdminActionButtons from './AdminActionButtons';
import AdminProtectedRoute from './AdminProtectedRoute';

import { slidersAPI, visionAPI, missionAPI, valuesAPI, uploadAPI, metaContentAPI } from '../../utils/api';
import { MultilingualFieldComponent } from './MultilingualField';
import { useMultilingualForm } from '../../hooks/useMultilingualForm';
import { useAboutStore } from '../../stores/about.store';
import { MdVisibility, MdStar, MdEmojiObjects, MdTrendingUp, MdGroups, MdLocalPharmacy, MdHealthAndSafety } from 'react-icons/md';
import { FaLightbulb, FaRegEye, FaRocket, FaBullseye, FaCrown, FaShieldAlt } from 'react-icons/fa';
import { GiPotionBall } from 'react-icons/gi';
import { IconType } from 'react-icons';
import React from 'react';

interface Slider {
  _id: string;
  title: { en: string } | string;
  content: { en: string } | string;
  image: string;
  createdAt: string;
}

type Vision = {
  _id: string;
  title: { en: string } | string;
  content: { en: string } | string;
  image: string;
};

type MetaContent = {
  _id: string;
  title: { en: string; ar?: string; fr?: string; de?: string; zh?: string; es?: string; ru?: string; ja?: string; tr?: string };
  description: { en: string; ar?: string; fr?: string; de?: string; zh?: string; es?: string; ru?: string; ja?: string; tr?: string };
};

const visionIconOptions: { name: string; icon: IconType }[] = [
  { name: 'MdVisibility', icon: MdVisibility },
  { name: 'FaLightbulb', icon: FaLightbulb },
  { name: 'MdStar', icon: MdStar },
  { name: 'FaRegEye', icon: FaRegEye },
  { name: 'MdEmojiObjects', icon: MdEmojiObjects },
  { name: 'FaRocket', icon: FaRocket },
  { name: 'MdTrendingUp', icon: MdTrendingUp },
  { name: 'FaBullseye', icon: FaBullseye },
  { name: 'MdGroups', icon: MdGroups },
  { name: 'FaCrown', icon: FaCrown },
  { name: 'GiPotionBall', icon: GiPotionBall },
  { name: 'MdLocalPharmacy', icon: MdLocalPharmacy },
  { name: 'MdHealthAndSafety', icon: MdHealthAndSafety },
  { name: 'FaShieldAlt', icon: FaShieldAlt },
];

const tabList = [
  { label: 'Slider', key: 'slider' },
  { label: 'Mission', key: 'mission' },
  { label: 'Visions', key: 'visions' },
  { label: 'Values', key: 'values' },
  { label: 'Meta content', key: 'meta' },
];

const fieldLabelMap: Record<string, string> = {
  'title': 'Title',
  'content': 'Content',
  'image': 'Image',
};
const languageLabelMap: Record<string, string> = {
  'en': 'English',
  'ar': 'Arabic',
  'fr': 'French',
  'de': 'German',
  'es': 'Spanish',
  'it': 'Italian',
  'ru': 'Russian',
  'zh': 'Chinese',
  'tr': 'Turkish',
  'ja': 'Japanese',
};
function getFriendlyChangeLabel(field: string): string {
  const match = field.match(/^(.+?)\((.+)\)$/);
  if (match) {
    const [, fieldName, lang] = match;
    return `${fieldLabelMap[fieldName] || fieldName} (${languageLabelMap[lang] || lang}) changed`;
  }
  return `${fieldLabelMap[field] || field} changed`;
}

const AdminAbout = () => {
  const navigate = useNavigate();
  const toast = useToast();
  // Removed individual user store usage - auth handled by AdminProtectedRoute
  const { isOpen, onOpen, onClose } = useDisclosure();

  // Auth state removed - handled by AdminProtectedRoute

  // About store
  const { 
    mission, vision, values, loading: aboutLoading, error: aboutError,
    fetchMission, fetchVision, fetchValues, updateMission, updateVision, updateValues 
  } = useAboutStore();

  const [activeTab, setActiveTab] = useState('slider');
  const [error, setError] = useState<string | null>(null);

  // Change tracking state
  const [changedFields, setChangedFields] = useState<Set<string>>(new Set());
  const [originalData, setOriginalData] = useState<any>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  // Slider state
  const [sliders, setSliders] = useState<Slider[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(4);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSliders, setSelectedSliders] = useState<string[]>([]);

  // About content state (mission, vision, values)
  const [editingTab, setEditingTab] = useState<null | 'mission' | 'vision' | 'values' | 'meta'>(null);

  // Meta content state
  const [metaContent, setMetaContent] = useState<MetaContent | null>(null);
  const [loadingMeta, setLoadingMeta] = useState(false);

  // Modal state
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [viewedSlider, setViewedSlider] = useState<Slider | null>(null);

  // Multilingual form states
  const [missionEditTitle, setMissionEditTitle] = useState('');
  const [missionEditContent, setMissionEditContent] = useState('');
  const [missionEditImage, setMissionEditImage] = useState('');
  const [visionEditContent, setVisionEditContent] = useState('');
  const [valuesEditTitle, setValuesEditTitle] = useState('');
  const [valuesEditContent, setValuesEditContent] = useState('');
  const [valuesEditImage, setValuesEditImage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const valuesFileInputRef = useRef<HTMLInputElement>(null);

  // Multilingual form hooks
  const missionMultilingual = useMultilingualForm(['title', 'content']);
  const visionMultilingual = useMultilingualForm(['content']);
  const valuesMultilingual = useMultilingualForm(['title', 'content']);
  const metaContentMultilingual = useMultilingualForm(['title', 'description']);

  // Visions tab state
  const [visions, setVisions] = useState<Vision[]>([]);
  const [loadingVisions, setLoadingVisions] = useState(false);
  const [editingVision, setEditingVision] = useState<Vision | null>(null);
  const [visionForm, setVisionForm] = useState({ title: '', content: '', image: visionIconOptions[0].name });
  const [showVisionForm, setShowVisionForm] = useState(false);
  const visionFormMultilingual = useMultilingualForm(['title', 'content']);

  // Removed individual auth checks - now handled by AdminProtectedRoute

  const loadTabData = useCallback(async () => {
    try {
      setError(null);

      if (activeTab === 'slider') {
        await loadSliders();
      } else if (activeTab === 'mission') {
        await fetchMission('en');
      } else if (activeTab === 'vision') {
        await fetchVision('en');
      } else if (activeTab === 'values') {
        await fetchValues('en');
      } else if (activeTab === 'meta') {
        await loadMetaContent();
      } else if (activeTab === 'visions') {
        await fetchAllVisions();
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load data';
      console.error('Load error:', err);
      setError(errorMessage);
    }
  }, [activeTab, currentPage, itemsPerPage, searchTerm]);

  // Load data based on active tab
  useEffect(() => {
    loadTabData();
  }, [loadTabData]);

  const loadSliders = async () => {
    const response = await slidersAPI.getAll({
      page: currentPage,
      limit: itemsPerPage,
      search: searchTerm,
      lang: 'en'
    });
    setSliders(response.sliders || []);
    setTotalPages(response.totalPages || 1);
    setTotalItems(response.total || 0);
  };

  const loadMetaContent = async () => {
    setLoadingMeta(true);
    try {
      const data = await metaContentAPI.get();
      setMetaContent(data);
      
      // Initialize multilingual form with current data
      if (data && typeof data.title === 'object' && typeof data.description === 'object') {
        metaContentMultilingual.initializeFromData(data, ['title', 'description']);
      }
    } catch (err) {
      console.error('Failed to load meta content:', err);
      toast({
        title: 'Error',
        description: 'Failed to load meta content',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoadingMeta(false);
    }
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setCurrentPage(1);
    setSearchTerm('');
    setError(null);
  };

  const handleAddSlider = () => {
    navigate('/admin/about/slider/add');
  };

  const handleViewSlider = (slider: Slider) => {
    setViewedSlider(slider);
    setIsViewOpen(true);
  };

  const handleCloseView = () => {
    setIsViewOpen(false);
    setViewedSlider(null);
  };

  const handleEditSlider = (sliderId: string) => {
    navigate(`/admin/about/slider/${sliderId}/edit`);
  };

  const handleDeleteSlider = async (sliderId: string) => {
    if (!window.confirm('Are you sure you want to delete this slider?')) {
      return;
    }

    try {
      await slidersAPI.delete(sliderId);
      toast({
        title: 'Success',
        description: 'Slider deleted successfully',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      loadSliders();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete slider';
      toast({
        title: 'Error',
        description: errorMessage,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const handleSelectSlider = (sliderId: string) => {
    setSelectedSliders(prev => 
      prev.includes(sliderId) 
        ? prev.filter(id => id !== sliderId)
        : [...prev, sliderId]
    );
  };

  const handleSelectAllSliders = () => {
    if (selectedSliders.length === sliders.length) {
      setSelectedSliders([]);
    } else {
      setSelectedSliders(sliders.map(s => s._id));
    }
  };

  const handleSaveAboutContent = async (content: string, type: 'mission' | 'vision' | 'values') => {
    try {
      // Get the appropriate multilingual hook
      const multilingualHook = type === 'mission' ? missionMultilingual : 
                              type === 'vision' ? visionMultilingual : valuesMultilingual;
      
      const data = {
        content: multilingualHook.multilingualData.content,
      };

      if (type === 'mission') {
        await updateMission(data);
      } else if (type === 'vision') {
        await updateVision(data);
      } else if (type === 'values') {
        await updateValues(data);
      }

      toast({
        title: 'Success',
        description: `${type.charAt(0).toUpperCase() + type.slice(1)} updated successfully`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });

      setEditingTab(null);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : `Failed to update ${type}`;
      toast({
        title: 'Error',
        description: errorMessage,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const handleSaveMetaContent = async () => {
    try {
      // Build update data with only changed fields
      const updateData: any = {};

      changedFields.forEach((field) => {
        const match = field.match(/^(title|description)\((.+)\)$/);
        if (match) {
          const [, key, lang] = match;
          updateData[key] = updateData[key] || {};
          // Use type assertion to avoid TS error
          updateData[key][lang] = (metaContentMultilingual.multilingualData[key as 'title' | 'description'] as any)?.[lang];
        }
      });

      // Only send update if there are changes
      if (Object.keys(updateData).length === 0) {
        toast({
          title: 'Info',
          description: 'No changes to save',
          status: 'info',
          duration: 3000,
          isClosable: true,
        });
        return;
      }

      console.log('Sending update data:', updateData);

      const updatedMetaContent = await metaContentAPI.update(updateData);
      setMetaContent(updatedMetaContent);

      toast({
        title: 'Success',
        description: 'Meta content saved successfully',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });

      setEditingTab(null);
      setChangedFields(new Set());
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save meta content';
      toast({
        title: 'Error',
        description: errorMessage,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const handleCancelMetaEdit = () => {
    // Reset form values to original content
    if (metaContent) {
      metaContentMultilingual.initializeFromData(metaContent, ['title', 'description']);
    }
    setEditingTab(null);
  };

  const getDisplayText = (field: { en: string } | string): string => {
    return typeof field === 'string' ? field : (field?.en || '');
  };

  // Authentication checks removed - now handled by AdminProtectedRoute

  const handleSaveAboutContentMission = async () => {
    try {
      // Build minimal update data based on changes
      const updateData = buildUpdateData('mission');
      
      // Add image if changed
      if (changedFields.has('image')) {
        updateData.image = missionEditImage;
      }

      console.log('Changed fields:', Array.from(changedFields));
      console.log('Sending update data:', updateData);

      await updateMission(updateData);
      toast({
        title: 'Success',
        description: 'Mission updated successfully',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      setEditingTab(null);
      setChangedFields(new Set());
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update mission';
      toast({
        title: 'Error',
        description: errorMessage,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const handleSaveAboutContentValues = async () => {
    try {
      // Build minimal update data based on changes
      const updateData = buildUpdateData('values');
      
      // Add image if changed
      if (changedFields.has('image')) {
        updateData.image = valuesEditImage;
      }

      console.log('Changed fields:', Array.from(changedFields));
      console.log('Sending update data:', updateData);

      await updateValues(updateData);
      toast({
        title: 'Success',
        description: 'Values updated successfully',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      setEditingTab(null);
      setChangedFields(new Set());
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update values';
      toast({
        title: 'Error',
        description: errorMessage,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const fetchAllVisions = async () => {
    setLoadingVisions(true);
    try {
      const data = await visionAPI.getAll();
      setVisions(Array.isArray(data) ? data : (data.vision ? [data.vision] : []));
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to load visions', status: 'error' });
    } finally {
      setLoadingVisions(false);
    }
  };

  const handleVisionFormChange = (field: string, value: string) => {
    setVisionForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleEditVision = (vision: Vision) => {
    setEditingVision(vision);
    setVisionForm({
      title: typeof vision.title === 'string' ? vision.title : vision.title?.en || '',
      content: typeof vision.content === 'string' ? vision.content : vision.content?.en || '',
      image: vision.image || visionIconOptions[0].name,
    });
    
    // Initialize multilingual data
    if (typeof vision.title === 'object' && typeof vision.content === 'object') {
      visionFormMultilingual.initializeFromData(vision, ['title', 'content']);
    }
    
    setShowVisionForm(true);
  };

  const handleDeleteVision = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this vision?')) return;
    try {
      await visionAPI.delete(id);
      toast({ title: 'Success', description: 'Vision deleted', status: 'success' });
      fetchAllVisions();
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to delete vision', status: 'error' });
    }
  };

  const handleSaveVision = async () => {
    try {
      const data = {
        title: visionFormMultilingual.multilingualData.title,
        content: visionFormMultilingual.multilingualData.content,
        image: visionForm.image,
      };
      
      if (editingVision) {
        await visionAPI.update(editingVision._id, data);
        toast({ title: 'Success', description: 'Vision updated', status: 'success' });
      } else {
        await visionAPI.create(data);
        toast({ title: 'Success', description: 'Vision created', status: 'success' });
      }
      setShowVisionForm(false);
      setEditingVision(null);
      setVisionForm({ title: '', content: '', image: visionIconOptions[0].name });
      visionFormMultilingual.initializeFromData({}, ['title', 'content']);
      fetchAllVisions();
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to save vision', status: 'error' });
    }
  };

  const handleCancelVisionForm = () => {
    setShowVisionForm(false);
    setEditingVision(null);
    setVisionForm({ title: '', content: '', image: visionIconOptions[0].name });
    visionFormMultilingual.initializeFromData({}, ['title', 'content']);
  };

  // Change tracking functions
  const trackMultilingualChange = (field: string, language: string, value: string, multilingualHook: any) => {
    if (isInitializing) return;

    if (originalData) {
      const stripHtml = (html: string) => {
        if (!html) return "";
        const tmp = document.createElement("div");
        tmp.innerHTML = html;
        return tmp.textContent || tmp.innerText || "";
      };

      const originalLangValue = (originalData[field] as any)?.[language] || "";
      const isContentField = field === 'content' || field === 'description';
      const compareValue = isContentField ? stripHtml(value) : value;
      const compareOriginal = isContentField ? stripHtml(originalLangValue) : originalLangValue;

      if (compareOriginal !== compareValue) {
        setChangedFields((prev) => new Set(prev).add(`${field}(${language})`));
      } else {
        setChangedFields((prev) => {
          const newSet = new Set(prev);
          newSet.delete(`${field}(${language})`);
          return newSet;
        });
      }
    }
  };

  const trackImageChange = (field: string, newImage: string) => {
    if (isInitializing) return;

    if (originalData) {
      const originalImage = originalData[field] || "";
      if (originalImage !== newImage) {
        setChangedFields((prev) => new Set(prev).add(field));
      } else {
        setChangedFields((prev) => {
          const newSet = new Set(prev);
          newSet.delete(field);
          return newSet;
        });
      }
    }
  };

  // Build minimal update data based on tracked changes
  const buildUpdateData = (type: 'mission' | 'vision' | 'values') => {
    const updateData: any = {};

    // Get the appropriate multilingual hook
    const multilingualHook = type === 'mission' ? missionMultilingual : 
                            type === 'vision' ? visionMultilingual : valuesMultilingual;

    // Handle multilingual field changes
    changedFields.forEach((field) => {
      // Check if this is a multilingual field change (format: fieldName(language))
      const languageMatch = field.match(/^(.+)\((.+)\)$/);
      if (languageMatch) {
        const [, fieldName, language] = languageMatch;
        const value = (multilingualHook.multilingualData[fieldName] as any)?.[language];
        if (value !== undefined) {
          if (!updateData[fieldName]) {
            updateData[fieldName] = {};
          }
          updateData[fieldName][language] = value;
        }
        return;
      }

      // Handle image changes
      if (field === 'image') {
        const imageField = type === 'mission' ? missionEditImage : 
                          type === 'values' ? valuesEditImage : '';
        if (imageField) {
          updateData.image = imageField;
        }
        return;
      }
    });

    return updateData;
  };

  return (
    <AdminProtectedRoute>
      <Box p={8}>

            {/* Change Tracking Debug */}
            {editingTab && (
              <Alert status="info" mb={4}>
                <AlertIcon />
                <Box>
                  <Text fontWeight="bold">Change Tracking Debug</Text>
                  <Text fontSize="sm">
                    Changed Fields: {Array.from(changedFields).length === 0
                      ? "None"
                      : Array.from(changedFields).map(getFriendlyChangeLabel).join(", ")
                    }
                  </Text>
          </Box>
              </Alert>
            )}

          {/* Breadcrumb */}
          <Breadcrumb spacing="8px" separator={<ChevronRightIcon color="#6C757D" />} mb={4}>
            <BreadcrumbItem>
              <BreadcrumbLink href="/admin/about" color="#6C757D">About company</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbItem isCurrentPage>
              <BreadcrumbLink href="#" fontWeight="bold">{tabList.find(t => t.key === activeTab)?.label}</BreadcrumbLink>
            </BreadcrumbItem>
          </Breadcrumb>

          {/* Figma-style Tab Bar */}
          <HStack spacing={4} mb={8}>
            {tabList.map(tab => (
              <Button
                key={tab.key}
                onClick={() => handleTabChange(tab.key)}
                h="56px"
                w="132px"
                borderRadius="lg"
                fontFamily="IBM Plex Sans"
                fontSize="21px"
                fontWeight={tab.key === activeTab ? 600 : 400}
                lineHeight="40px"
                bg={tab.key === activeTab ? 'linear-gradient(90deg, #b40519 0%, #4e020b 100%)' : '#F8E6E8'}
                color={tab.key === activeTab ? 'white' : '#B40519'}
                boxShadow={tab.key === activeTab ? '0 2px 8px rgba(180,5,25,0.08)' : undefined}
                _hover={{ bg: tab.key === activeTab ? 'linear-gradient(90deg, #b40519 0%, #4e020b 100%)' : '#F0D6D9' }}
                _active={{ bg: tab.key === activeTab ? 'linear-gradient(90deg, #b40519 0%, #4e020b 100%)' : '#E8C6CA' }}
                transition="all 0.2s"
              >
                {tab.label}
              </Button>
            ))}
          </HStack>

          {error && (
            <Alert status="error" mb={6}>
              <AlertIcon />
              {error}
            </Alert>
          )}

            {aboutError && (
              <Alert status="error" mb={6}>
                <AlertIcon />
                {aboutError}
              </Alert>
            )}

          {/* Main Content */}
          <Box bg="white" borderRadius="2xl" p={8} boxShadow="sm" border="1.5px solid #E9ECEF">
              {aboutLoading ? (
              <Flex justify="center" align="center" h="400px">
                <Spinner size="xl" color="blue.500" />
              </Flex>
            ) : (
              <>
                {activeTab === 'slider' && (
                  <>
                    {/* Add Button and Search */}
                    <Flex justify="space-between" align="center" mb={8}>
                      <Button
                        leftIcon={<AddIcon />}
                        bg="#B40519"
                        color="white"
                        fontSize="20px"
                        fontWeight="500"
                        h="56px"
                        w="140px"
                        borderRadius="lg"
                        fontFamily="IBM Plex Sans"
                        _hover={{ bg: '#9A0416' }}
                        _active={{ bg: '#7A0312' }}
                        onClick={handleAddSlider}
                      >
                        Add
                      </Button>
                      <InputGroup maxW="340px" h="56px" bg="#F8F8F8" borderRadius="lg" border="2px solid #BCBCBC">
                        <InputLeftElement pointerEvents="none" h="full">
                          <SearchIcon color="#8D8D8D" boxSize={6} />
                        </InputLeftElement>
                        <Input
                          placeholder="Search"
                          border="none"
                          fontSize="24px"
                          color="#424242"
                          fontFamily="IBM Plex Sans"
                          h="56px"
                          bg="transparent"
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          _placeholder={{ color: '#424242' }}
                          _focus={{ outline: 'none', boxShadow: 'none' }}
                        />
                      </InputGroup>
                    </Flex>

                    {/* Table */}
                    <Box borderRadius="2xl" border="1.5px solid #E9ECEF" overflow="hidden">
                      <Table variant="simple" sx={{ borderRadius: '16px' }}>
                        <Thead bg="#F8F8F8">
                          <Tr>
                            <Th w="50px" color="#3F0209" borderColor="#E9ECEF" fontSize="20px" fontWeight={500} fontFamily="IBM Plex Sans">
                              <Checkbox 
                                isChecked={selectedSliders.length === sliders.length && sliders.length > 0}
                                isIndeterminate={selectedSliders.length > 0 && selectedSliders.length < sliders.length}
                                onChange={handleSelectAllSliders}
                                colorScheme="red"
                              />
                            </Th>
                            <Th color="#3F0209" borderColor="#E9ECEF" fontSize="20px" fontWeight={500} fontFamily="IBM Plex Sans">Image</Th>
                            <Th color="#3F0209" borderColor="#E9ECEF" fontSize="20px" fontWeight={500} fontFamily="IBM Plex Sans">Title</Th>
                            <Th color="#3F0209" borderColor="#E9ECEF" fontSize="20px" fontWeight={500} fontFamily="IBM Plex Sans">Content</Th>
                            <Th w="180px" color="#3F0209" borderColor="#E9ECEF" fontSize="20px" fontWeight={500} fontFamily="IBM Plex Sans">Action</Th>
                          </Tr>
                        </Thead>
                        <Tbody>
                          {sliders.length === 0 ? (
                            <Tr>
                              <Td colSpan={5} textAlign="center" py={8}>
                                <Text fontSize="18px" color="#8D8D8D">No sliders found</Text>
                              </Td>
                            </Tr>
                          ) : (
                            sliders.map((slider) => (
                              <Tr key={slider._id}>
                                <Td borderColor="#E9ECEF">
                                  <Checkbox 
                                    isChecked={selectedSliders.includes(slider._id)}
                                    onChange={() => handleSelectSlider(slider._id)}
                                    colorScheme="red"
                                  />
                                </Td>
                                <Td borderColor="#E9ECEF">
                                  <Image
                                    src={slider.image || '/images/admin/image.png'}
                                    alt="Slider item"
                                    w="60px"
                                    h="40px"
                                    borderRadius="md"
                                    objectFit="cover"
                                  />
                                </Td>
                                <Td color="#717171" borderColor="#E9ECEF" fontSize="20px" fontFamily="IBM Plex Sans">
                                  {getDisplayText(slider.title)}
                                </Td>
                                <Td color="#717171" borderColor="#E9ECEF" fontSize="20px" fontFamily="IBM Plex Sans">
                                  {getDisplayText(slider.content).substring(0, 50)}...
                                </Td>
                                <Td borderColor="#E9ECEF">
                                  <HStack spacing={2}>
                                    <IconButton
                                      aria-label="View"
                                      icon={<ViewIcon />}
                                      size="md"
                                      variant="ghost"
                                      color="#8D8D8D"
                                      _hover={{ color: '#B40519' }}
                                      onClick={() => handleViewSlider(slider)}
                                    />
                                    <IconButton
                                      aria-label="Edit"
                                      icon={<EditIcon />}
                                      size="md"
                                      variant="ghost"
                                      color="#8D8D8D"
                                      _hover={{ color: '#B40519' }}
                                      onClick={() => handleEditSlider(slider._id)}
                                    />
                                    <IconButton
                                      aria-label="Delete"
                                      icon={<DeleteIcon />}
                                      size="md"
                                      variant="ghost"
                                      color="#8D8D8D"
                                      _hover={{ color: '#B40519' }}
                                      onClick={() => handleDeleteSlider(slider._id)}
                                    />
                                  </HStack>
                                </Td>
                              </Tr>
                            ))
                          )}
                        </Tbody>
                      </Table>
                    </Box>

                    {/* Pagination Info and Controls */}
                    <Flex justify="space-between" align="center" mt={8}>
                      <Text fontSize="20px" color="#8D8D8D" fontFamily="IBM Plex Sans">
                        {`Showing ${(currentPage-1)*itemsPerPage+1} to ${Math.min(currentPage*itemsPerPage, totalItems)} of ${totalItems}`}
                      </Text>
                      <Box>
                        <Pagination
                          currentPage={currentPage}
                          totalPages={totalPages}
                          itemsPerPage={itemsPerPage}
                          onPageChange={setCurrentPage}
                          onItemsPerPageChange={setItemsPerPage}
                        />
                      </Box>
                    </Flex>
                  </>
                )}

                {activeTab === 'mission' && (
                  editingTab === 'mission' ? (
                    <Box bg="white" borderRadius="2xl" p={8} boxShadow="sm" border="1.5px solid #E9ECEF" maxW="900px" mx="auto">
                      <Text fontSize="32px" fontWeight={600} color="#3F0209" fontFamily="IBM Plex Sans" mb={6}>Edit Mission</Text>
                      <VStack spacing={8} align="stretch">
                          {/* Title Field */}
                          <MultilingualFieldComponent
                            label="Mission Title"
                            fieldName="title"
                            value={missionEditTitle}
                            multilingualData={missionMultilingual.multilingualData.title || {}}
                            onChange={(value) => {
                              setMissionEditTitle(value);
                              missionMultilingual.updateEnglishValue('title', value);
                              trackMultilingualChange('title', 'en', value, missionMultilingual);
                            }}
                            onMultilingualChange={(lang, value) => {
                              missionMultilingual.updateMultilingualValue('title', lang, value);
                              trackMultilingualChange('title', lang, value, missionMultilingual);
                            }}
                            isRequired={true}
                            placeholder="Enter mission title"
                          />

                          {/* Image Upload Field */}
                          <Box>
                            <Text fontSize="24px" color="#424242" fontWeight={500} fontFamily="IBM Plex Sans" mb={2}>
                              Mission Image
                            </Text>
                            <Box display="flex" alignItems="center" gap={4}>
                              {missionEditImage && (
                                <Image src={missionEditImage} alt="Mission" boxSize="80px" borderRadius="lg" objectFit="cover" />
                              )}
                              <Button onClick={() => fileInputRef.current?.click()} variant="outline" colorScheme="red">
                                {missionEditImage ? 'Change Image' : 'Upload Image'}
                              </Button>
                              <input
                                type="file"
                                accept="image/*"
                                style={{ display: 'none' }}
                                ref={fileInputRef}
                                onChange={async (e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    try {
                                      const res = await uploadAPI.uploadImage(file);
                                      setMissionEditImage(res.url);
                                      trackImageChange('image', res.url);
                                    } catch (err) {
                                      toast({
                                        title: 'Error',
                                        description: 'Image upload failed',
                                        status: 'error',
                                        duration: 5000,
                                        isClosable: true,
                                      });
                                    }
                                  }
                                }}
                              />
                            </Box>
                          </Box>

                          {/* Content Field */}
                        <MultilingualFieldComponent
                          label="Mission Content"
                          fieldName="content"
                          value={missionEditContent}
                          multilingualData={missionMultilingual.multilingualData.content || {}}
                          onChange={(value) => {
                            setMissionEditContent(value);
                            missionMultilingual.updateEnglishValue('content', value);
                            trackMultilingualChange('content', 'en', value, missionMultilingual);
                          }}
                            onMultilingualChange={(lang, value) => {
                              missionMultilingual.updateMultilingualValue('content', lang, value);
                              trackMultilingualChange('content', lang, value, missionMultilingual);
                            }}
                          isTextArea={true}
                          isRequired={true}
                          placeholder="Enter mission content"
                        />
                        <AdminActionButtons
                            onSave={handleSaveAboutContentMission}
                          onCancel={() => setEditingTab(null)}
                        />
                      </VStack>
                    </Box>
                  ) : (
                    <Box bg="white" borderRadius="2xl" p={8} boxShadow="sm" border="1.5px solid #E9ECEF" maxW="900px" mx="auto">
                      <Flex justify="space-between" align="center" mb={6}>
                        <Text fontSize="32px" fontWeight={600} color="#3F0209" fontFamily="IBM Plex Sans">Mission</Text>
                        <Button
                          leftIcon={<EditIcon />}
                          bg="#B40519"
                          color="white"
                          fontSize="20px"
                          fontWeight="500"
                          h="56px"
                          w="140px"
                          borderRadius="lg"
                          fontFamily="IBM Plex Sans"
                          _hover={{ bg: '#9A0416' }}
                          _active={{ bg: '#7A0312' }}
                          onClick={() => {
                              const title = mission ? getDisplayText(mission.title) : "Mission";
                              const content = mission ? getDisplayText(mission.content) : "Our mission is to deliver high-quality chemical solutions that empower industries and improve lives, while maintaining a commitment to sustainability and innovation.";
                              setMissionEditTitle(title);
                            setMissionEditContent(content);
                              setMissionEditImage(mission?.image || '');
                              if (mission && typeof mission.title === 'object' && typeof mission.content === 'object') {
                                missionMultilingual.initializeFromData(mission, ['title', 'content']);
                            }
                              // Store original data for change tracking
                              setOriginalData(mission);
                              setChangedFields(new Set());
                              setIsInitializing(false);
                            setEditingTab('mission');
                          }}
                        >
                          Edit
                        </Button>
                      </Flex>
                        <Flex align="center" gap={6} mb={6}>
                          {mission?.image && (
                            <Image src={mission.image} alt="Mission" boxSize="80px" borderRadius="lg" objectFit="cover" />
                          )}
                          <Text fontSize="24px" fontWeight={600} color="#3F0209" fontFamily="IBM Plex Sans">
                            {mission ? getDisplayText(mission.title) : 'Mission Title'}
                          </Text>
                        </Flex>
                      <Text fontSize="20px" color="#717171" fontFamily="IBM Plex Sans">
                          {mission ? getDisplayText(mission.content) : "Our mission is to deliver high-quality chemical solutions that empower industries and improve lives, while maintaining a commitment to sustainability and innovation."}
                      </Text>
                    </Box>
                  )
                )}

                {activeTab === 'visions' && (
                  <Box
                    bg="white"
                    borderRadius="2xl"
                    p={8}
                    boxShadow="sm"
                    border="1.5px solid #E9ECEF"
                    maxW="1200px"
                    mx="auto"
                  >
                    <Flex justify="space-between" align="center" mb={6}>
                      <Text fontSize="32px" fontWeight={600} color="#3F0209" fontFamily="IBM Plex Sans">Visions</Text>
                      <Button
                        bg="#B40519"
                        color="white"
                        fontSize="20px"
                        fontWeight="500"
                        h="56px"
                        w="180px"
                        borderRadius="lg"
                        fontFamily="IBM Plex Sans"
                        _hover={{ bg: '#9A0416' }}
                        _active={{ bg: '#7A0312' }}
                        onClick={() => {
                          setEditingVision(null);
                          setVisionForm({ title: '', content: '', image: visionIconOptions[0].name });
                          setShowVisionForm(true);
                        }}
                      >
                        Add Vision
                      </Button>
                    </Flex>
                    {loadingVisions ? (
                      <Flex justify="center" align="center" h="200px"><Spinner size="xl" /></Flex>
                    ) : (
                      <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={8}>
                        {visions.map((vision) => (
                          <Box
                            key={vision._id}
                            border="1.5px solid #E9ECEF"
                            borderRadius="xl"
                            p={6}
                            bg="#F8F8F8"
                            boxShadow="sm"
                            transition="box-shadow 0.2s, transform 0.2s"
                            _hover={{ boxShadow: 'md', transform: 'translateY(-4px)' }}
                            display="flex"
                            flexDirection="column"
                            minH="180px"
                            maxW="360px"
                            w="100%"
                            mx="auto"
                          >
                            <Flex align="center" gap={4} mb={4}>
                              {(() => {
                                const iconObj = visionIconOptions.find(opt => opt.name === vision.image);
                                if (iconObj) {
                                  const IconComp = iconObj.icon;
                                  return React.createElement(IconComp as React.ComponentType<any>, { size: 36, color: "#B40519" });
                                }
                                return null;
                              })()}
                              <Text fontSize="xl" fontWeight={600}>{typeof vision.title === 'string' ? vision.title : vision.title?.en || ''}</Text>
                            </Flex>
                            <Text color="#717171" mb={4} noOfLines={4}>
                              {/* Remove HTML tags if present */}
                              {typeof vision.content === 'string'
                                ? vision.content.replace(/<[^>]+>/g, '')
                                : vision.content?.en?.replace(/<[^>]+>/g, '') || ''}
                            </Text>
                            <Flex gap={2} mt="auto" justify="flex-end">
                              <Button size="sm" colorScheme="blue" onClick={() => handleEditVision(vision)}>Edit</Button>
                              <Button size="sm" colorScheme="red" onClick={() => handleDeleteVision(vision._id)}>Delete</Button>
                            </Flex>
                          </Box>
                        ))}
                      </SimpleGrid>
                    )}
                    {/* Vision Create/Edit Form Modal */}
                    {showVisionForm && (
                      <Box mt={10} p={8} bg="white" borderRadius="xl" boxShadow="md" maxW="600px" mx="auto">
                        <Text fontSize="2xl" fontWeight={600} mb={4}>{editingVision ? 'Edit Vision' : 'Add Vision'}</Text>
                        <VStack spacing={6} align="stretch">
                          <MultilingualFieldComponent
                            label="Vision Title"
                            fieldName="title"
                            value={visionForm.title}
                            multilingualData={visionFormMultilingual.multilingualData.title || {}}
                            onChange={(value) => {
                              setVisionForm(prev => ({ ...prev, title: value }));
                              visionFormMultilingual.updateEnglishValue('title', value);
                            }}
                            onMultilingualChange={(lang, value) => visionFormMultilingual.updateMultilingualValue('title', lang, value)}
                            isRequired={true}
                            placeholder="Enter vision title"
                          />
                          <MultilingualFieldComponent
                            label="Vision Content"
                            fieldName="content"
                            value={visionForm.content}
                            multilingualData={visionFormMultilingual.multilingualData.content || {}}
                            onChange={(value) => {
                              setVisionForm(prev => ({ ...prev, content: value }));
                              visionFormMultilingual.updateEnglishValue('content', value);
                            }}
                            onMultilingualChange={(lang, value) => {
                              visionFormMultilingual.updateMultilingualValue('content', lang, value);
                            }}
                            isTextArea={true}
                            isRequired={true}
                            placeholder="Enter vision content"
                          />
                          <Box>
                            <Text mb={2}>Select Icon</Text>
                            <Flex gap={4} flexWrap="wrap">
                              {visionIconOptions.map(({ name, icon: IconComp }) => (
                                <Box
                                  key={name}
                                  border={visionForm.image === name ? '2px solid #B40519' : '2px solid transparent'}
                                  borderRadius="md"
                                  p={1}
                                  cursor="pointer"
                                  onClick={() => handleVisionFormChange('image', name)}
                                  _hover={{ border: '2px solid #B40519' }}
                                  fontSize="2xl"
                                  bg={visionForm.image === name ? '#F8E6E8' : 'transparent'}
                                >
                                  {React.createElement(IconComp as React.ComponentType<any>, { size: 32 })}
                                </Box>
                              ))}
                            </Flex>
                          </Box>
                          <Flex gap={4} mt={4}>
                            <Button colorScheme="red" onClick={handleSaveVision}>{editingVision ? 'Update' : 'Create'}</Button>
                            <Button variant="outline" onClick={handleCancelVisionForm}>Cancel</Button>
                          </Flex>
                        </VStack>
                      </Box>
                    )}
                  </Box>
                )}

                {activeTab === 'values' && (
                  editingTab === 'values' ? (
                    <Box bg="white" borderRadius="2xl" p={8} boxShadow="sm" border="1.5px solid #E9ECEF" maxW="900px" mx="auto">
                      <Text fontSize="32px" fontWeight={600} color="#3F0209" fontFamily="IBM Plex Sans" mb={6}>Edit Values</Text>
                      <VStack spacing={8} align="stretch">
                          {/* Title Field */}
                          <MultilingualFieldComponent
                            label="Values Title"
                            fieldName="title"
                            value={valuesEditTitle}
                            multilingualData={valuesMultilingual.multilingualData.title || {}}
                            onChange={(value) => {
                              setValuesEditTitle(value);
                              valuesMultilingual.updateEnglishValue('title', value);
                            }}
                            onMultilingualChange={(lang, value) => {
                              valuesMultilingual.updateMultilingualValue('title', lang, value);
                              trackMultilingualChange('title', lang, value, valuesMultilingual);
                            }}
                            isRequired={true}
                            placeholder="Enter values title"
                          />

                          {/* Image Upload Field */}
                          <Box>
                            <Text fontSize="24px" color="#424242" fontWeight={500} fontFamily="IBM Plex Sans" mb={2}>
                              Values Image
                            </Text>
                            <Box display="flex" alignItems="center" gap={4}>
                              {valuesEditImage && (
                                <Image src={valuesEditImage} alt="Values" boxSize="80px" borderRadius="lg" objectFit="cover" />
                              )}
                              <Button onClick={() => valuesFileInputRef.current?.click()} variant="outline" colorScheme="red">
                                {valuesEditImage ? 'Change Image' : 'Upload Image'}
                              </Button>
                              <input
                                type="file"
                                accept="image/*"
                                style={{ display: 'none' }}
                                ref={valuesFileInputRef}
                                onChange={async (e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    try {
                                      const res = await uploadAPI.uploadImage(file);
                                      setValuesEditImage(res.url);
                                      trackImageChange('image', res.url);
                                    } catch (err) {
                                      toast({
                                        title: 'Error',
                                        description: 'Image upload failed',
                                        status: 'error',
                                        duration: 5000,
                                        isClosable: true,
                                      });
                                    }
                                  }
                                }}
                              />
                            </Box>
                          </Box>

                          {/* Content Field */}
                        <MultilingualFieldComponent
                          label="Values Content"
                          fieldName="content"
                          value={valuesEditContent}
                          multilingualData={valuesMultilingual.multilingualData.content || {}}
                          onChange={(value) => {
                            setValuesEditContent(value);
                            valuesMultilingual.updateEnglishValue('content', value);
                          }}
                            onMultilingualChange={(lang, value) => {
                              valuesMultilingual.updateMultilingualValue('content', lang, value);
                              trackMultilingualChange('content', lang, value, valuesMultilingual);
                            }}
                          isTextArea={true}
                          isRequired={true}
                          placeholder="Enter values content"
                        />
                        <AdminActionButtons
                            onSave={handleSaveAboutContentValues}
                          onCancel={() => setEditingTab(null)}
                        />
                      </VStack>
                    </Box>
                  ) : (
                    <Box bg="white" borderRadius="2xl" p={8} boxShadow="sm" border="1.5px solid #E9ECEF" maxW="900px" mx="auto">
                      <Flex justify="space-between" align="center" mb={6}>
                        <Text fontSize="32px" fontWeight={600} color="#3F0209" fontFamily="IBM Plex Sans">Values</Text>
                        <Button
                          leftIcon={<EditIcon />}
                          bg="#B40519"
                          color="white"
                          fontSize="20px"
                          fontWeight="500"
                          h="56px"
                          w="140px"
                          borderRadius="lg"
                          fontFamily="IBM Plex Sans"
                          _hover={{ bg: '#9A0416' }}
                          _active={{ bg: '#7A0312' }}
                          onClick={() => {
                              const title = values ? getDisplayText(values.title) : "Values";
                              const content = values ? getDisplayText(values.content) : "Integrity, innovation, customer focus, and sustainability are the core values that guide our actions and decisions every day.";
                              setValuesEditTitle(title);
                            setValuesEditContent(content);
                              setValuesEditImage(values?.image || '');
                              if (values && typeof values.title === 'object' && typeof values.content === 'object') {
                                valuesMultilingual.initializeFromData(values, ['title', 'content']);
                            }
                              // Store original data for change tracking
                              setOriginalData(values);
                              setChangedFields(new Set());
                              setIsInitializing(false);
                            setEditingTab('values');
                          }}
                        >
                          Edit
                        </Button>
                      </Flex>
                        <Flex align="center" gap={6} mb={6}>
                          {values?.image && (
                            <Image src={values.image} alt="Values" boxSize="80px" borderRadius="lg" objectFit="cover" />
                          )}
                          <Text fontSize="24px" fontWeight={600} color="#3F0209" fontFamily="IBM Plex Sans">
                            {values ? getDisplayText(values.title) : 'Values Title'}
                          </Text>
                        </Flex>
                      <Text fontSize="20px" color="#717171" fontFamily="IBM Plex Sans">
                          {values ? getDisplayText(values.content) : "Integrity, innovation, customer focus, and sustainability are the core values that guide our actions and decisions every day."}
                      </Text>
                    </Box>
                  )
                )}

                {activeTab === 'meta' && (
                  editingTab === 'meta' ? (
                    <Box bg="white" borderRadius="2xl" p={8} boxShadow="sm" border="1.5px solid #E9ECEF" maxW="900px" mx="auto">
                      <Text fontSize="32px" fontWeight={600} color="#3F0209" fontFamily="IBM Plex Sans" mb={6}>Edit Meta content</Text>
                      <VStack spacing={8} align="stretch">
                        {/* Meta Title Field */}
                        <MultilingualFieldComponent
                          label="Meta Title"
                          fieldName="title"
                          value={metaContentMultilingual.multilingualData.title?.en || ''}
                          multilingualData={metaContentMultilingual.multilingualData.title || {}}
                          onChange={(value) => {
                            metaContentMultilingual.updateEnglishValue('title', value);
                            trackMultilingualChange('title', 'en', value, metaContentMultilingual);
                          }}
                          onMultilingualChange={(lang, value) => {
                            metaContentMultilingual.updateMultilingualValue('title', lang, value);
                            trackMultilingualChange('title', lang, value, metaContentMultilingual);
                          }}
                          isRequired={true}
                          placeholder="Enter meta title"
                        />

                        {/* Meta Description Field with language dropdown */}
                        <MultilingualFieldComponent
                          label="Meta Description"
                          fieldName="description"
                          value={metaContentMultilingual.multilingualData.description?.en || ''}
                          multilingualData={metaContentMultilingual.multilingualData.description || {}}
                          onChange={(value) => {
                            metaContentMultilingual.updateEnglishValue('description', value);
                            trackMultilingualChange('description', 'en', value, metaContentMultilingual);
                          }}
                          onMultilingualChange={(lang, value) => {
                            metaContentMultilingual.updateMultilingualValue('description', lang, value);
                            trackMultilingualChange('description', lang, value, metaContentMultilingual);
                          }}
                          isTextArea={true}
                          isRequired={true}
                          placeholder="Enter meta description"
                        />

                        {/* Action Buttons */}
                        <AdminActionButtons
                          onSave={handleSaveMetaContent}
                          onCancel={handleCancelMetaEdit}
                        />
                      </VStack>
                    </Box>
                  ) : (
                    <Box bg="white" borderRadius="2xl" p={8} boxShadow="sm" border="1.5px solid #E9ECEF" maxW="900px" mx="auto">
                      <Flex justify="space-between" align="center" mb={6}>
                        <Text fontSize="32px" fontWeight={600} color="#3F0209" fontFamily="IBM Plex Sans">Meta content</Text>
                        <Button
                          leftIcon={<EditIcon />}
                          bg="#B40519"
                          color="white"
                          fontSize="20px"
                          fontWeight="500"
                          h="56px"
                          w="140px"
                          borderRadius="lg"
                          fontFamily="IBM Plex Sans"
                          _hover={{ bg: '#9A0416' }}
                          _active={{ bg: '#7A0312' }}
                          onClick={() => {
                            // Initialize form values with current meta content
                            if (metaContent) {
                              metaContentMultilingual.initializeFromData(metaContent, ['title', 'description']);
                              // Store original data for change tracking
                              setOriginalData(metaContent);
                              setChangedFields(new Set());
                              setIsInitializing(false);
                            }
                            setEditingTab('meta');
                          }}
                        >
                          Edit
                        </Button>
                      </Flex>
                      
                      {loadingMeta ? (
                        <Flex justify="center" align="center" h="200px">
                          <Spinner size="xl" color="blue.500" />
                        </Flex>
                      ) : (
                        <VStack spacing={6} align="stretch">
                          <Box>
                            <Text fontSize="24px" color="#424242" fontWeight={500} fontFamily="IBM Plex Sans" mb={3}>
                              Meta Title
                            </Text>
                            <Box
                              bg="#F8F8F8"
                              border="1.5px solid #E9ECEF"
                              borderRadius="12px"
                              p={4}
                              minH="60px"
                              display="flex"
                              alignItems="center"
                            >
                              <Text fontSize="20px" color="#717171" fontFamily="IBM Plex Sans">
                                {metaContent?.title?.en }
                              </Text>
                            </Box>
                          </Box>

                          <Box>
                            <Text fontSize="24px" color="#424242" fontWeight={500} fontFamily="IBM Plex Sans" mb={3}>
                              Meta Description
                            </Text>
                            <Box
                              bg="#F8F8F8"
                              border="1.5px solid #E9ECEF"
                              borderRadius="16px"
                              p={4}
                              minH="120px"
                            >
                              <Text fontSize="20px" color="#717171" fontFamily="IBM Plex Sans" lineHeight="1.5">
                                {metaContent?.description?.en }
                              </Text>
                            </Box>
                            <Text fontSize="16px" color="#040C18CC" fontFamily="Inter" fontWeight={500} mt={2}>
                              {metaContent?.description?.en ? 
                                `${metaContent.description.en.trim().split(/\s+/).length} words` : 
                                '65 words'
                              }
                            </Text>
                          </Box>
                        </VStack>
                      )}
                    </Box>
                  )
                )}
              </>
            )}
          </Box>

      {/* View Slider Modal */}
      <Modal isOpen={isViewOpen} onClose={handleCloseView} size="2xl" isCentered>
        <ModalOverlay />
        <ModalContent borderRadius="2xl" p={0} maxW="700px" bg="#fff" position="relative">
          {/* Close Button */}
          <Box position="absolute" top={4} right={4} zIndex={2}>
            <Box 
              bg="#EAEAEA" 
              borderRadius="50%" 
              w="48px" 
              h="48px" 
              display="flex" 
              alignItems="center" 
              justifyContent="center" 
              cursor="pointer" 
              onClick={handleCloseView} 
              boxShadow="sm" 
              _hover={{ bg: '#ccc' }}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M12.8 4.4L11.6 3.2L8 6.8L4.4 3.2L3.2 4.4L6.8 8L3.2 11.6L4.4 12.8L8 9.2L11.6 12.8L12.8 11.6L9.2 8L12.8 4.4Z" fill="#555" strokeWidth="0.5"/>
              </svg>
            </Box>
          </Box>
          
          <Box px={8} pt={10} pb={0}>
            <Flex align="center" justify="space-between" mb={12}>
              <Text fontFamily="IBM Plex Sans" fontSize="32px" fontWeight={500} color="#000000e5" lineHeight="56px">
                Slider details
              </Text>
            </Flex>
            
            <Box mb={10}>
              <Image 
                src={viewedSlider?.image || "/images/admin/slider.png"} 
                alt="Slider banner" 
                borderRadius="lg" 
                w="100%" 
                h="324px" 
                objectFit="cover" 
                mb={6} 
                bg="#EEE" 
              />
              <Text fontFamily="IBM Plex Sans" fontSize="24px" color="#424242" fontWeight={500} mb={2}>
                  {viewedSlider?.title ? getDisplayText(viewedSlider.title) : 'Title'}
              </Text>
              <Text fontFamily="IBM Plex Sans" fontSize="20px" color="#717171" fontWeight={400} mb={2}>
                  {viewedSlider?.content ? getDisplayText(viewedSlider.content) : 'Content'}
              </Text>
            </Box>
            
            <Button 
              w="full" 
              h="80px" 
              bg="#555555" 
              color="#fff" 
              fontFamily="IBM Plex Sans" 
              fontSize="24px" 
              fontWeight={600} 
              borderRadius="xl" 
              mt={8} 
              mb={4} 
              onClick={handleCloseView} 
              _hover={{ bg: '#333' }}
            >
              Close
            </Button>
          </Box>
        </ModalContent>
      </Modal>
    </Box>
    </AdminProtectedRoute>
  );
};

export default AdminAbout;