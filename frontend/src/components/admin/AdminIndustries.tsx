import {
  Box,
  Flex,
  Heading,
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
  Modal,
  ModalOverlay,
  ModalContent,

  Spinner,
  Alert,
  AlertIcon,
  useToast,
} from '@chakra-ui/react';
import { SearchIcon, AddIcon, ViewIcon, EditIcon, DeleteIcon, ChevronRightIcon } from '@chakra-ui/icons';
import { useNavigate, Routes, Route } from 'react-router-dom';
import { useState, useEffect, useCallback } from 'react';
import AdminProtectedRoute from './AdminProtectedRoute';
import AdminAddIndustry from './AdminAddIndustry';
import AdminEditIndustry from './AdminEditIndustry';
import { categoriesAPI } from '../../utils/api';

interface Industry {
  _id: string;
  name: string;
  description?: string;
  image?: string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

const AdminIndustriesList = () => {
  const navigate = useNavigate();
  const toast = useToast();
  
  // State
  const [industries, setIndustries] = useState<Industry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIndustries, setSelectedIndustries] = useState<Set<string>>(new Set());
  
  // View modal state
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [viewedIndustry, setViewedIndustry] = useState<Industry | null>(null);

  // Fetch industries (categories)
  const fetchIndustries = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = {
        lang: 'en',
        ...(searchTerm && { search: searchTerm })
      };
      
      const response = await categoriesAPI.getAll(params);
      setIndustries(Array.isArray(response) ? response : []);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch industries';
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
  }, [searchTerm, toast]);

  // Load industries on mount and when dependencies change
  useEffect(() => {
    fetchIndustries();
  }, [fetchIndustries]);

  // Search with debouncing
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchIndustries();
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  const handleViewIndustry = (industry: Industry) => {
    setViewedIndustry(industry);
    setIsViewOpen(true);
  };
  const handleCloseView = () => {
    setIsViewOpen(false);
    setViewedIndustry(null);
  };

  const handleEditIndustry = (industryId: string) => {
    navigate(`/admin/industries/${industryId}/edit`);
  };

  const handleDeleteIndustry = async (industryId: string) => {
    if (!window.confirm('Are you sure you want to delete this industry?')) {
      return;
    }

    try {
      await categoriesAPI.delete(industryId);
      toast({
        title: 'Success',
        description: 'Industry deleted successfully',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      fetchIndustries(); // Refresh the list
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete industry';
      toast({
        title: 'Error',
        description: errorMessage,
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const handleSelectIndustry = (industryId: string, isChecked: boolean) => {
    const newSelected = new Set(selectedIndustries);
    if (isChecked) {
      newSelected.add(industryId);
    } else {
      newSelected.delete(industryId);
    }
    setSelectedIndustries(newSelected);
  };

  return (
    <Box p={8}>
      <Breadcrumb spacing="8px" separator={<ChevronRightIcon color="gray.500" />} mb={6}>
        <BreadcrumbItem>
          <BreadcrumbLink href="/admin/industries" color="gray.600">Industries</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbItem isCurrentPage>
          <BreadcrumbLink href="#" fontWeight="bold">Industries List</BreadcrumbLink>
        </BreadcrumbItem>
      </Breadcrumb>
      <Flex justify="space-between" align="center" mb={8}>
        <Heading size="lg" color="#3F0209">Industries</Heading>
        <Button
          leftIcon={<AddIcon />}
          bg="#B40519"
          color="white"
          _hover={{ bg: '#9A0416' }}
          borderRadius="md"
          px={8}
          fontSize="lg"
          onClick={() => navigate('/admin/industries/add')}
        >
          Add Industry
        </Button>
      </Flex>
      <Flex mb={6} justify="flex-end">
        <InputGroup maxW="340px">
          <InputLeftElement pointerEvents="none">
            <SearchIcon color="#8D8D8D" />
          </InputLeftElement>
          <Input 
            placeholder="Search"
            borderRadius="lg"
            bg="#F8F8F8"
            border="2px solid #E9ECEF"
            fontSize="lg"
            color="#8D8D8D"
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

      <Box bg="white" borderRadius="2xl" boxShadow="sm" p={0} border="1.5px solid #E9ECEF">
        <Table variant="simple" sx={{ border: '1.5px solid #E9ECEF', borderRadius: '16px' }}>
          <Thead bg="#F8F8F8">
            <Tr>
              <Th w="50px" color="#3F0209" borderColor="#E9ECEF">
                <Checkbox 
                  isChecked={industries.length > 0 && selectedIndustries.size === industries.length}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedIndustries(new Set(industries.map(i => i._id)));
                    } else {
                      setSelectedIndustries(new Set());
                    }
                  }}
                  colorScheme="red"
                />
              </Th>
              <Th color="#3F0209" borderColor="#E9ECEF">Industry Image</Th>
              <Th color="#3F0209" borderColor="#E9ECEF">Industry Name</Th>
              <Th w="180px" color="#3F0209" borderColor="#E9ECEF">Action</Th>
            </Tr>
          </Thead>
          <Tbody>
            {loading ? (
              <Tr>
                <Td colSpan={4} textAlign="center" p={10}>
                  <Spinner size="lg" color="#B40519" />
                </Td>
              </Tr>
            ) : industries.length === 0 ? (
              <Tr>
                <Td colSpan={4} textAlign="center" p={10}>
                  <Text fontSize="20px" color="#717171">No industries found</Text>
                </Td>
              </Tr>
            ) : (
              industries.map((industry) => (
                <Tr key={industry._id} borderColor="#E9ECEF">
                  <Td borderColor="#E9ECEF">
                    <Checkbox 
                      isChecked={selectedIndustries.has(industry._id)} 
                      onChange={(e) => handleSelectIndustry(industry._id, e.target.checked)}
                      colorScheme="red" 
                    />
                  </Td>
                  <Td borderColor="#E9ECEF">
                    <Image
                      src={industry.image || '/images/industries/paints.jpg'}
                      alt={industry.name}
                      w="60px"
                      h="60px"
                      borderRadius="md"
                      objectFit="cover"
                    />
                  </Td>
                  <Td color="#717171" fontSize="20px" borderColor="#E9ECEF">{industry.name}</Td>
                  <Td borderColor="#E9ECEF">
                    <HStack spacing={2}>
                      <IconButton
                        aria-label="View"
                        icon={<ViewIcon />}
                        variant="ghost"
                        colorScheme="gray"
                        onClick={() => handleViewIndustry(industry)}
                      />
                      <IconButton
                        aria-label="Edit"
                        icon={<EditIcon />}
                        variant="ghost"
                        colorScheme="gray"
                        onClick={() => handleEditIndustry(industry._id)}
                      />
                      <IconButton
                        aria-label="Delete"
                        icon={<DeleteIcon />}
                        variant="ghost"
                        colorScheme="gray"
                        onClick={() => handleDeleteIndustry(industry._id)}
                      />
                    </HStack>
                  </Td>
                </Tr>
              ))
            )}
          </Tbody>
        </Table>
        <Flex justify="space-between" align="center" p={6}>
          <Text color="#8D8D8D" fontSize="20px">Showing table 1 to 4 of 12</Text>
          <HStack spacing={2}>
            <Button size="sm" bg="#F8F8F8" borderRadius="lg">{'<'}</Button>
            <Button size="sm" bg="#B40519" color="white" borderRadius="lg">1</Button>
            <Button size="sm" bg="#F8E6E8" color="#555" borderRadius="lg">2</Button>
            <Button size="sm" bg="#F8E6E8" color="#555" borderRadius="lg">...</Button>
            <Button size="sm" bg="#F8F8F8" borderRadius="lg">{'>'}</Button>
          </HStack>
        </Flex>
      </Box>
      {/* View Industry Modal */}
      <Modal isOpen={isViewOpen} onClose={handleCloseView} size="2xl" isCentered>
        <ModalOverlay />
        <ModalContent borderRadius="2xl" p={0} maxW="700px" bg="#fff" position="relative" boxShadow="0 8px 32px rgba(31, 31, 31, 0.12)">
          {/* Top row: Title and Close */}
          <Box display="flex" flexDir="row" alignItems="center" justifyContent="space-between" px={8} pt={10} pb={0}>
            <Text fontFamily="IBM Plex Sans" fontSize="32px" fontWeight={500} color="#000000e5" lineHeight="56px">
              Industry details
            </Text>
            <Box bg="#EAEAEA" borderRadius="50%" w="56px" h="56px" display="flex" alignItems="center" justifyContent="center" cursor="pointer" onClick={handleCloseView} boxShadow="sm" _hover={{ bg: '#e0e0e0' }} transition="all 0.2s">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M17.19 0.403334C16.67 -0.116666 15.83 -0.116666 15.31 0.403334L8.79 6.91L2.27 0.39C1.75 -0.13 0.91 -0.13 0.39 0.39C-0.13 0.91 -0.13 1.75 0.39 2.27L6.91 8.79L0.39 15.31C-0.13 15.83 -0.13 16.67 0.39 17.19C0.91 17.71 1.75 17.71 2.27 17.19L8.79 10.67L15.31 17.19C15.83 17.71 16.67 17.71 17.19 17.19C17.71 16.67 17.71 15.83 17.19 15.31L10.67 8.79L17.19 2.27C17.6967 1.76333 17.6967 0.91 17.19 0.403334Z" fill="#555"/>
              </svg>
            </Box>
          </Box>
          {viewedIndustry && (
            <>
              <Box w="100%" h="324px" mt={8} px={8}>
                <Image
                  src={viewedIndustry.image || '/images/industries/paints.jpg'}
                  alt={viewedIndustry.name}
                  w="100%"
                  h="324px"
                  borderRadius="lg"
                  objectFit="cover"
                  boxShadow="0 4px 24px rgba(31, 31, 31, 0.10)"
                  border="2px solid #E9ECEF"
                  bg="#EEE"
                />
              </Box>
              <Text fontFamily="IBM Plex Sans" fontSize="24px" fontWeight={500} color="#424242" lineHeight="40px" mt={10} mb={0} px={8} textAlign="left">
                {viewedIndustry.name}
              </Text>
              <Text fontFamily="IBM Plex Sans" fontSize="16px" color="#717171" lineHeight="24px" mt={4} mb={10} px={8} textAlign="left">
                {viewedIndustry.description || 'No description available'}
              </Text>
            </>
          )}
          <Box px={8}>
            <Button w="full" h="80px" bg="#555555" color="#fff" fontFamily="IBM Plex Sans" fontSize="24px" fontWeight={600} borderRadius="xl" mt={14} mb={8} onClick={handleCloseView} _hover={{ bg: '#333' }} _active={{ bg: '#222' }} transition="all 0.2s">
              Close
            </Button>
          </Box>
        </ModalContent>
      </Modal>
    </Box>
  );
};

const AdminIndustries = () => {
  return (
    <AdminProtectedRoute>
      <Routes>
        {/* Main industries list */}
        <Route path="/" element={<AdminIndustriesList />} />
        
        {/* Child routes - these inherit protection from the parent */}
        <Route path="/add" element={<AdminAddIndustry />} />
        <Route path="/:id/edit" element={<AdminEditIndustry />} />
      </Routes>
    </AdminProtectedRoute>
  );
};

export default AdminIndustries; 