import { Box, Flex, Heading, FormControl, FormLabel, Input, Button, VStack, useToast, Alert, AlertIcon, Image, Spinner, Text } from '@chakra-ui/react';
import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { brandsAPI, uploadAPI } from '../../utils/api';

const AdminEditBrand = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const { brandId } = useParams<{ brandId: string }>();
  const [formData, setFormData] = useState({
    name: '',
    logo: ''
  });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Change tracking
  const [originalData, setOriginalData] = useState<any>(null);
  const [changedFields, setChangedFields] = useState<Set<string>>(new Set());
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    const loadBrand = async () => {
      if (!brandId) {
        setError('Brand ID is required');
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const brand = await brandsAPI.getById(brandId);
        
        // Store original data for change tracking
        setOriginalData(brand);
        
        setFormData({
          name: brand.name?.en || brand.name || '',
          logo: brand.logo || ''
        });
        
        setIsInitializing(false);
      } catch (err: any) {
        setError(err.message || 'Failed to load company');
      } finally {
        setLoading(false);
      }
    };
    loadBrand();
  }, [brandId]);

  const trackChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    if (isInitializing || !originalData) return;
    
    const originalValue = field === 'name' ? 
      (originalData.name?.en || originalData.name || '') : 
      originalData[field] || '';
    
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

  const handleInputChange = (field: string, value: string) => {
    trackChange(field, value);
  };

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setLogoFile(e.target.files[0]);
      setChangedFields(prev => new Set(prev).add('logo'));
    }
  };

  const buildUpdateData = () => {
    const updateData: any = {};
    
    // Handle field changes
    changedFields.forEach(field => {
      if (field === 'logo') {
        // Logo will be handled separately
        return;
      }
      
      // Handle regular field changes
      if (formData[field as keyof typeof formData] !== undefined) {
        const value = formData[field as keyof typeof formData];
        if (value !== '') {
          updateData[field] = value;
        }
      }
    });
    
    return updateData;
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast({ title: 'Validation Error', description: 'Company name is required', status: 'error', duration: 3000, isClosable: true });
      return;
    }
    if (!brandId) {
      setError('Brand ID is required');
      return;
    }
    try {
      setSaving(true);
      setError(null);
      
      // Build minimal update data
      const updateData = buildUpdateData();
      
      // Handle logo upload if changed
      if (changedFields.has('logo') && logoFile) {
        const uploadResponse = await uploadAPI.uploadImage(logoFile);
        updateData.logo = uploadResponse.url;
      }
      
      // Only send update if there are changes
      if (Object.keys(updateData).length > 0) {
        await brandsAPI.update(brandId, updateData);
        toast({ title: 'Success', description: 'Company updated successfully', status: 'success', duration: 3000, isClosable: true });
      } else {
        toast({ title: 'Info', description: 'No changes detected', status: 'info', duration: 3000, isClosable: true });
      }
      
      navigate('/admin/companies');
    } catch (err: any) {
      setError(err.message || 'Failed to update company');
      toast({ title: 'Error', description: err.message || 'Failed to update company', status: 'error', duration: 5000, isClosable: true });
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    navigate('/admin/companies');
  };

  if (loading) {
    return (
      <Box p={6} display="flex" justifyContent="center" alignItems="center" minH="400px">
        <Spinner size="xl" color="red.500" />
      </Box>
    );
  }

  return (
    <Box p={6}>
      <Heading mb={8}>Edit Company</Heading>
      {error && <Alert status="error" mb={6}><AlertIcon />{error}</Alert>}
      
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
      
      <VStack spacing={6} align="stretch">
        <FormControl isRequired>
          <FormLabel>Company Name</FormLabel>
          <Input
            value={formData.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            placeholder="Enter company name"
          />
        </FormControl>
        <FormControl>
          <FormLabel>Logo</FormLabel>
          <Input type="file" accept="image/*" onChange={handleLogoChange} />
          {(logoFile || formData.logo) && <Image src={logoFile ? URL.createObjectURL(logoFile) : formData.logo} alt="Logo Preview" boxSize="100px" mt={2} />}
        </FormControl>
        <Flex gap={4} mt={4}>
          <Button colorScheme="red" onClick={handleSave} isLoading={saving}>Save</Button>
          <Button variant="outline" onClick={handleCancel} isDisabled={saving}>Cancel</Button>
        </Flex>
      </VStack>
    </Box>
  );
};

export default AdminEditBrand; 