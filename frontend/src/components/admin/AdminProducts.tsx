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
import { useNavigate, Routes, Route, useLocation } from 'react-router-dom';
import { useState, useEffect, useCallback } from 'react';
import AdminProtectedRoute from './AdminProtectedRoute';
import AdminAddProduct from './AdminAddProduct';
import AdminEditProduct from './AdminEditProduct';
import AdminProductDetails from './AdminProductDetails';
import { productsAPI } from '../../utils/api';

interface Product {
  _id: string;
  name: string;
  description: string;
  category: {
    _id: string;
    name: string;
  };
  brand: {
    _id: string;
    name: string;
  };
  image?: string;
  additionalImages?: string[];
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

const AdminProductsList = () => {
  const navigate = useNavigate();
  const toast = useToast();
  
  // State
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Fetch products
  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = {
        page: page.toString(),
        limit: '10',
        lang: 'en',
        ...(searchTerm && { search: searchTerm })
      };
      
      const response = await productsAPI.getAll(params);
      setProducts(Array.isArray(response) ? response : []);
      setTotalPages(1); // API returns plain array, no pagination info
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch products';
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

  // Load products on mount and when dependencies change
  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Search with debouncing
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setPage(1); // Reset to first page when searching
      fetchProducts();
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  const handleViewProduct = (productId: string) => {
    navigate(`/admin/products/${productId}`);
  };

  const handleAddProduct = () => {
    navigate('/admin/products/add');
  };

  const handleEditProduct = (productId: string) => {
    navigate(`/admin/products/${productId}/edit`);
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!window.confirm('Are you sure you want to delete this product?')) {
      return;
    }

    try {
      await productsAPI.delete(productId);
      toast({
        title: 'Success',
        description: 'Product deleted successfully',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      fetchProducts(); // Refresh the list
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete product';
      toast({
        title: 'Error',
        description: errorMessage,
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const handleSelectProduct = (productId: string, isChecked: boolean) => {
    const newSelected = new Set(selectedProducts);
    if (isChecked) {
      newSelected.add(productId);
    } else {
      newSelected.delete(productId);
    }
    setSelectedProducts(newSelected);
  };

  const handleSelectAll = (isChecked: boolean) => {
    if (isChecked) {
      setSelectedProducts(new Set(products.map(p => p._id)));
    } else {
      setSelectedProducts(new Set());
    }
  };

  const isAllSelected = products.length > 0 && selectedProducts.size === products.length;

  return (
    <Box p={0}>
      {/* Header */}
      <Box px={10} pt={10} pb={0}>
        <Text fontFamily="IBM Plex Sans" fontSize="32px" fontWeight={500} color="#3F0209" lineHeight="56px" mb={12}>Products</Text>
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
            onClick={handleAddProduct}
          >
            Add Product
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
                <Box w="80px" textAlign="left"><Text fontFamily="IBM Plex Sans" fontSize="20px" fontWeight={500} color="#3F0209">Image</Text></Box>
                <Box flex="1" minW="180px"><Text fontFamily="IBM Plex Sans" fontSize="20px" fontWeight={500} color="#3F0209">Product Name</Text></Box>
                <Box flex="1" minW="180px"><Text fontFamily="IBM Plex Sans" fontSize="20px" fontWeight={500} color="#3F0209">Brand</Text></Box>
                <Box flex="1" minW="180px"><Text fontFamily="IBM Plex Sans" fontSize="20px" fontWeight={500} color="#3F0209">Category</Text></Box>
                <Box w="160px"><Text fontFamily="IBM Plex Sans" fontSize="20px" fontWeight={500} color="#3F0209">Action</Text></Box>
              </Flex>
            </Box>
            {/* Table Rows */}
            {products.map((product) => (
              <Box key={product._id} borderBottom="2px solid #EAEAEA" px={6} py={8}>
                <Flex align="center" gap={0}>
                  <Box w="64px" display="flex" justifyContent="center">
                    <Checkbox 
                      size="lg" 
                      colorScheme="red" 
                      borderColor={selectedProducts.has(product._id) ? '#B40519' : '#EAEAEA'} 
                      isChecked={selectedProducts.has(product._id)}
                      onChange={(e) => handleSelectProduct(product._id, e.target.checked)}
                    />
                  </Box>
                  <Box w="80px" display="flex" alignItems="center" justifyContent="center">
                    <Image 
                      src={product.image || '/images/admin/product.png'} 
                      alt="Product" 
                      w="64px" 
                      h="40px" 
                      objectFit="cover" 
                      borderRadius="lg" 
                    />
                  </Box>
                  <Box flex="1" minW="180px">
                    <Text fontFamily="IBM Plex Sans" fontSize="20px" color="#717171">{product.name}</Text>
                  </Box>
                  <Box flex="1" minW="180px">
                    <Text fontFamily="IBM Plex Sans" fontSize="20px" color="#717171">{product.brand?.name || 'N/A'}</Text>
                  </Box>
                  <Box flex="1" minW="180px">
                    <Text fontFamily="IBM Plex Sans" fontSize="20px" color="#717171">{product.category?.name || 'N/A'}</Text>
                  </Box>
                  <Box w="160px">
                    <HStack spacing={4}>
                      <IconButton
                        aria-label="View"
                        icon={<ViewIcon />}
                        size="lg"
                        variant="ghost"
                        color="#8D8D8D"
                        _hover={{ color: '#B40519' }}
                        onClick={() => handleViewProduct(product._id)}
                      />
                      <IconButton
                        aria-label="Edit"
                        icon={<EditIcon />}
                        size="lg"
                        variant="ghost"
                        color="#8D8D8D"
                        _hover={{ color: '#B40519' }}
                        onClick={() => handleEditProduct(product._id)}
                      />
                      <IconButton
                        aria-label="Delete"
                        icon={<DeleteIcon />}
                        size="lg"
                        variant="ghost"
                        color="#8D8D8D"
                        _hover={{ color: '#B40519' }}
                        onClick={() => handleDeleteProduct(product._id)}
                      />
                    </HStack>
                  </Box>
                </Flex>
              </Box>
            ))}

            {/* Empty State */}
            {products.length === 0 && !loading && (
              <Box p={20} textAlign="center">
                <Text fontFamily="IBM Plex Sans" fontSize="20px" color="#717171">
                  No products found
                </Text>
              </Box>
            )}
          </Box>
        )}
      </Box>
    </Box>
  );
};

const AdminProducts = () => {
  const location = useLocation();
  
  return (
    <AdminProtectedRoute>
      <Routes>
        {/* Main products list */}
        <Route path="/" element={<AdminProductsList />} />
        
        {/* Child routes - these inherit protection from the parent */}
        <Route path="/add" element={<AdminAddProduct />} />
        <Route path="/:id/edit" element={<AdminEditProduct />} />
        <Route path="/:id" element={<AdminProductDetails />} />
      </Routes>
    </AdminProtectedRoute>
  );
};

export default AdminProducts; 