import {
  Box,
  Flex,
  Button,
  Input,
  InputGroup,
  InputLeftElement,
  Checkbox,
  Image,
  IconButton,
  HStack,
  Text,
  Spinner,
  Alert,
  AlertIcon,
  useToast,
} from '@chakra-ui/react';
import { SearchIcon, AddIcon, ViewIcon, EditIcon, DeleteIcon } from '@chakra-ui/icons';
import { useNavigate, Routes, Route } from 'react-router-dom';
import { useState, useEffect, useCallback } from 'react';
import AdminProtectedRoute from './AdminProtectedRoute';
import AdminAddBrand from './AdminAddBrand';
import AdminEditBrand from './AdminEditBrand';
import AdminCompanyDetailsModal from './AdminCompanyDetailsModal';
import { brandsAPI } from '../../utils/api';

interface Brand {
  _id: string;
  name: string;
  logo: string;
  createdAt: string;
  updatedAt: string;
}

const AdminCompaniesList = () => {
  const navigate = useNavigate();
  const toast = useToast();
  
  // State
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBrands, setSelectedBrands] = useState<Set<string>>(new Set());
  const [selectedBrand, setSelectedBrand] = useState<Brand | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Fetch brands
  const fetchBrands = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = {
        page: page.toString(),
        limit: '10',
        lang: 'en',
        ...(searchTerm && { search: searchTerm })
      };
      
      const response = await brandsAPI.getAll(params);
      setBrands(response || []);
      setTotalPages(response.totalPages || 1);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch brands';
      setError(errorMessage);
      toast({
        title: 'Error',
        description: errorMessage,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  }, [page, searchTerm, toast]);

  // Load brands on mount and when dependencies change
  useEffect(() => {
    fetchBrands();
  }, [fetchBrands]);

  // Search with debouncing
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setPage(1); // Reset to first page when searching
      fetchBrands();
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  const handleAddBrand = () => {
    navigate('/admin/companies/add');
  };

  const handleViewBrand = async (brandId: string) => {
    try {
      const brand = await brandsAPI.getById(brandId);
      setSelectedBrand(brand);
      setIsModalOpen(true);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load company details';
      toast({
        title: 'Error',
        description: errorMessage,
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const handleEditBrand = (brandId: string) => {
    navigate(`/admin/companies/${brandId}/edit`);
  };

  const handleDeleteBrand = async (brandId: string) => {
    if (!window.confirm('Are you sure you want to delete this Company?')) {
      return;
    }

    try {
      await brandsAPI.delete(brandId);
      toast({
        title: 'Success',
        description: 'Company deleted successfully',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      fetchBrands(); // Refresh the list
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete company';
      toast({
        title: 'Error',
        description: errorMessage,
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedBrand(null);
  };

  const handleSelectBrand = (brandId: string, isChecked: boolean) => {
    const newSelected = new Set(selectedBrands);
    if (isChecked) {
      newSelected.add(brandId);
    } else {
      newSelected.delete(brandId);
    }
    setSelectedBrands(newSelected);
  };

  const handleSelectAll = (isChecked: boolean) => {
    if (isChecked) {
      setSelectedBrands(new Set(brands.map(b => b._id)));
    } else {
      setSelectedBrands(new Set());
    }
  };

  const isAllSelected = brands.length > 0 && selectedBrands.size === brands.length;

  return (
    <Box p={0}>
      {/* Header */}
      <Box px={10} pt={10} pb={0}>
        <Text fontFamily="IBM Plex Sans" fontSize="32px" fontWeight={500} color="#3F0209" lineHeight="56px" mb={12}>Companies</Text>
        {/* Add/Search Row */}
        <Flex justify="space-between" align="center" mb={12} gap={6}>
          <Button
            leftIcon={<AddIcon boxSize={6} color="#B40519" />}
            variant="outline"
            borderColor="#B40519"
            color="#B40519"
            fontFamily="IBM Plex Sans"
            fontSize="24px"
            fontWeight={500}
            borderRadius="lg"
            px={8}
            py={5}
            h="56px"
            _hover={{ bg: '#B40519', color: 'white' }}
            onClick={handleAddBrand}
          >
            Add Company
          </Button>
          <InputGroup maxW="340px" h="56px" bg="#F8F8F8" borderRadius="lg" border="2px solid #BCBCBC">
            <InputLeftElement pointerEvents="none">
              <SearchIcon color="#8D8D8D" boxSize={8} />
            </InputLeftElement>
            <Input
              placeholder="Search"
              fontFamily="IBM Plex Sans"
              fontSize="24px"
              color="#424242"
              border="none"
              bg="transparent"
              h="56px"
              pl={14}
              _placeholder={{ color: '#424242', fontSize: '24px' }}
              borderRadius="lg"
              _focus={{ boxShadow: 'none' }}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </InputGroup>
        </Flex>
        {/* Error Alert */}
        {error && (
          <Alert status="error" mb={6}>
            <AlertIcon />
            {error}
          </Alert>
        )}

        {/* Loading State */}
        {loading ? (
          <Box bg="white" borderRadius="2xl" border="2px solid #EAEAEA" boxShadow="sm" p={20}>
            <Flex justify="center" align="center">
              <Spinner size="xl" color="#B40519" />
            </Flex>
          </Box>
        ) : (
          /* Table Container */
          <Box bg="white" borderRadius="2xl" border="2px solid #EAEAEA" boxShadow="sm" p={0}>
            {/* Table Header */}
            <Box bg="#F8F8F8" borderTopLeftRadius="12px" borderTopRightRadius="12px" px={6} py={8}>
              <Flex align="center" gap={0}>
                <Box w="64px" display="flex" justifyContent="center">
                  <Checkbox 
                    size="lg" 
                    colorScheme="red" 
                    borderColor="#BCBCBC" 
                    isChecked={isAllSelected}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                  />
                </Box>
                <Box w="80px" textAlign="center"><Text fontFamily="IBM Plex Sans" fontSize="20px" fontWeight={500} color="#3F0209">Logo</Text></Box>
                <Box flex="1" minW="180px" textAlign="center"><Text fontFamily="IBM Plex Sans" fontSize="20px" fontWeight={500} color="#3F0209">Company Name</Text></Box>
                <Box w="160px" textAlign="center"><Text fontFamily="IBM Plex Sans" fontSize="20px" fontWeight={500} color="#3F0209">Action</Text></Box>
              </Flex>
            </Box>
            {/* Table Rows */}
            {brands.map((brand) => (
              <Box key={brand._id} borderBottom="2px solid #EAEAEA" px={6} py={8}>
                <Flex align="center" gap={0}>
                  <Box w="64px" display="flex" justifyContent="center">
                    <Checkbox 
                      size="lg" 
                      colorScheme="red" 
                      borderColor={selectedBrands.has(brand._id) ? '#B40519' : '#EAEAEA'} 
                      isChecked={selectedBrands.has(brand._id)}
                      onChange={(e) => handleSelectBrand(brand._id, e.target.checked)}
                    />
                  </Box>
                  <Box w="80px" display="flex" alignItems="center" justifyContent="center">
                    <Image src={brand.logo} alt="Brand Logo" w="64px" h="40px" objectFit="contain" borderRadius="lg" bg="#EEE" />
                  </Box>
                  <Box flex="1" minW="180px" display="flex" alignItems="center" justifyContent="center">
                    <Text fontFamily="IBM Plex Sans" fontSize="20px" color="#717171">{brand.name}</Text>
                  </Box>
                  <Box w="160px" display="flex" alignItems="center" justifyContent="center">
                    <HStack spacing={2} justify="center">
                      <IconButton
                        aria-label="View"
                        icon={<ViewIcon />}
                        size="md"
                        variant="ghost"
                        color="#8D8D8D"
                        _hover={{ color: '#B40519', bg: '#F8E6E8' }}
                        onClick={() => handleViewBrand(brand._id)}
                      />
                      <IconButton
                        aria-label="Edit"
                        icon={<EditIcon />}
                        size="md"
                        variant="ghost"
                        color="#8D8D8D"
                        _hover={{ color: '#B40519', bg: '#F8E6E8' }}
                        onClick={() => handleEditBrand(brand._id)}
                      />
                      <IconButton
                        aria-label="Delete"
                        icon={<DeleteIcon />}
                        size="md"
                        variant="ghost"
                        color="#8D8D8D"
                        _hover={{ color: '#B40519', bg: '#F8E6E8' }}
                        onClick={() => handleDeleteBrand(brand._id)}
                      />
                    </HStack>
                  </Box>
                </Flex>
              </Box>
            ))}

            {/* Empty State */}
            {brands.length === 0 && !loading && (
              <Box p={20} textAlign="center">
                <Text fontFamily="IBM Plex Sans" fontSize="20px" color="#717171">
                  No companies found
                </Text>
              </Box>
            )}
          </Box>
        )}
      </Box>

      {/* Brand Details Modal */}
      <AdminCompanyDetailsModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        brand={selectedBrand as any}
      />
    </Box>
  );
};

const AdminCompaniesLanding = () => {
  return (
    <AdminProtectedRoute>
      <Routes>
        {/* Main companies list */}
        <Route path="/" element={<AdminCompaniesList />} />
        
        {/* Child routes - these inherit protection from the parent */}
        <Route path="/add" element={<AdminAddBrand />} />
        <Route path="/:brandId/edit" element={<AdminEditBrand />} />
      </Routes>
    </AdminProtectedRoute>
  );
};

export default AdminCompaniesLanding; 