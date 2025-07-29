import { Box, Flex, Heading, FormControl, FormLabel, Input, Button, VStack, useToast, Alert, AlertIcon, Image } from '@chakra-ui/react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { brandsAPI, uploadAPI } from '../../utils/api';

const AdminAddBrand = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const [formData, setFormData] = useState({
    name: '',
    logo: ''
  });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setLogoFile(e.target.files[0]);
    }
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast({ title: 'Validation Error', description: 'Company name is required', status: 'error', duration: 3000, isClosable: true });
      return;
    }
    try {
      setSaving(true);
      setError(null);
      let logoUrl = formData.logo;
      if (logoFile) {
        const uploadResponse = await uploadAPI.uploadImage(logoFile);
        logoUrl = uploadResponse.url;
      }
      const brandData = {
        name: formData.name.trim(),
        logo: logoUrl
      };
      await brandsAPI.create(brandData);
      toast({ title: 'Success', description: 'Company created successfully', status: 'success', duration: 3000, isClosable: true });
      navigate('/admin/companies');
    } catch (err: any) {
      setError(err.message || 'Failed to create company');
      toast({ title: 'Error', description: err.message || 'Failed to create company', status: 'error', duration: 5000, isClosable: true });
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    navigate('/admin/companies');
  };

  return (
    <Box p={6}>
      <Heading mb={8}>Add Company</Heading>
      {error && <Alert status="error" mb={6}><AlertIcon />{error}</Alert>}
      <VStack spacing={6} align="stretch">
        <FormControl isRequired>
          <FormLabel>Company Name</FormLabel>
          <Input value={formData.name} onChange={e => handleInputChange('name', e.target.value)} placeholder="Enter Company name" />
        </FormControl>
        <FormControl>
          <FormLabel>Logo</FormLabel>
          <Input type="file" accept="image/*" onChange={handleLogoChange} />
          {logoFile && <Image src={URL.createObjectURL(logoFile)} alt="Logo Preview" boxSize="100px" mt={2} />}
        </FormControl>
        <Flex gap={4} mt={4}>
          <Button colorScheme="red" onClick={handleSave} isLoading={saving}>Save</Button>
          <Button variant="outline" onClick={handleCancel} isDisabled={saving}>Cancel</Button>
        </Flex>
      </VStack>
    </Box>
  );
};

export default AdminAddBrand; 