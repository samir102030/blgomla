import React, { useState, useEffect } from 'react';
import {
  Box,
  Flex,
  Button,
  Input,
  InputGroup,
  InputLeftElement,
  Checkbox,
  IconButton,
  HStack,
  VStack,
  Text,
  Switch,
  Badge,
  useToast,
  Spinner,
  Alert,
  AlertIcon,
} from '@chakra-ui/react';
import { SearchIcon, ViewIcon, EditIcon, DeleteIcon, ChevronRightIcon } from '@chakra-ui/icons';
import AdminProtectedRoute from './AdminProtectedRoute';
import AdminQuoteDetailsModal from './AdminQuoteDetailsModal';
import { quotesAPI } from '../../utils/api';

interface Quote {
  _id: string;
  customerName: string;
  company: string;
  email: string;
  quantity: number;
  status: boolean;
  country?: string;
  product?: any;
  productName?: string;
  message?: string;
  userId?: any;
  createdAt: string;
  updatedAt: string;
  // CRM integration fields
  crmId?: string;
  leadSource?: 'crm' | 'direct' | 'website';
  crmStage?: string;
}

const AdminQuotes = () => {
  return (
    <AdminProtectedRoute>
      <AdminQuotesMainView />
    </AdminProtectedRoute>
  );
};

const AdminQuotesMainView = () => {
  const [search, setSearch] = useState('');
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedQuotes, setSelectedQuotes] = useState<string[]>([]);
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showCRMContext, setShowCRMContext] = useState(false);
  const toast = useToast();

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const itemsPerPage = 20;

  useEffect(() => {
    const delayedSearch = setTimeout(() => {
      loadQuotes();
    }, 300); // Debounce search by 300ms

    return () => clearTimeout(delayedSearch);
  }, [search, currentPage, showCRMContext]);

  const loadQuotes = async () => {
    try {
      setLoading(true);
      setError(null);

      // Use CRM endpoint if showing CRM context
      const response = showCRMContext 
        ? await quotesAPI.getAllWithCRM({
            page: currentPage,
            limit: itemsPerPage,
            search,
          })
        : await quotesAPI.getAll({
            page: currentPage,
            limit: itemsPerPage,
            search,
          });

      setQuotes(response.quotes || []);
      setTotal(response.total || 0);
      setTotalPages(response.totalPages || 0);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load quotes';
      console.error('Load quotes error:', err);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleViewQuote = (quoteId: string) => {
    const quote = quotes.find((q) => q._id === quoteId);
    setSelectedQuote(quote || null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedQuote(null);
  };

  const handleToggleStatus = async (quoteId: string, currentStatus: boolean) => {
    try {
      if (currentStatus) {
        await quotesAPI.reject(quoteId);
        toast({
          title: 'Success',
          description: 'Quote status updated to pending',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
      } else {
        await quotesAPI.approve(quoteId);
        toast({
          title: 'Success',
          description: 'Quote approved successfully',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
      }
      loadQuotes(); // Reload data
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update quote status';
      toast({
        title: 'Error',
        description: errorMessage,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const handleDeleteQuote = async (quoteId: string) => {
    if (!window.confirm('Are you sure you want to delete this quote?')) {
      return;
    }

    try {
      await quotesAPI.delete(quoteId);
      toast({
        title: 'Success',
        description: 'Quote deleted successfully',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      loadQuotes(); // Reload data
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete quote';
      toast({
        title: 'Error',
        description: errorMessage,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  if (loading) {
    return (
      <Box p={12}>
        <Flex justify="center" align="center" h="400px">
          <Spinner size="xl" color="blue.500" />
        </Flex>
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={12}>
        <Alert status="error">
          <AlertIcon />
          {error}
        </Alert>
      </Box>
    );
  }

  return (
    <Box p={12}>
      {/* Header with CRM toggle */}
      <Flex justify="space-between" align="center" mb={12}>
        <Text fontFamily="IBM Plex Sans" fontWeight={500} fontSize="32px" color="#3F0209" lineHeight="56px">
          Quote Management
        </Text>
        <HStack spacing={4}>
          <Text fontSize="16px" color="#424242">Show CRM Context:</Text>
          <Switch
            colorScheme="red"
            isChecked={showCRMContext}
            onChange={(e) => setShowCRMContext(e.target.checked)}
          />
        </HStack>
      </Flex>

      {/* Search Bar */}
      <Box mb={16} w="340px">
        <InputGroup size="lg">
          <InputLeftElement pointerEvents="none">
            <SearchIcon color="#8D8D8D" boxSize={6} />
          </InputLeftElement>
          <Input
            placeholder="Search quotes..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            fontFamily="IBM Plex Sans"
            fontSize="20px"
            color="#8D8D8D"
            bg="white"
            border="2px solid #BCBCBC"
            borderRadius="10px"
            h="72px"
            pl={12}
          />
        </InputGroup>
      </Box>

      {/* Quotes Grid */}
      <VStack spacing={4} align="stretch">
        {quotes.length === 0 ? (
          <Box textAlign="center" py={20}>
            <Text fontSize="20px" color="#8D8D8D">
              {search ? 'No quotes found matching your search.' : 'No quotes available.'}
            </Text>
          </Box>
        ) : (
          quotes.map((quote) => (
            <Box
              key={quote._id}
              bg="white"
              borderRadius="2xl"
              border="2px solid #EAEAEA"
              p={6}
              _hover={{
                borderColor: '#B40519',
                boxShadow: '0 4px 20px rgba(180, 5, 25, 0.1)',
              }}
              transition="all 0.2s"
            >
              <Flex justify="space-between" align="center">
                <VStack align="start" spacing={2}>
                  <HStack spacing={4}>
                    <Checkbox
                      size="lg"
                      colorScheme="red"
                      borderColor="#BCBCBC"
                      isChecked={selectedQuotes.includes(quote._id)}
                      onChange={() => {
                        setSelectedQuotes(prev =>
                          prev.includes(quote._id)
                            ? prev.filter(id => id !== quote._id)
                            : [...prev, quote._id]
                        );
                      }}
                    />
                    <Text fontFamily="IBM Plex Sans" fontSize="20px" fontWeight={500} color="#424242">
                      {quote.customerName}
                    </Text>
                    <Badge
                      colorScheme={quote.status ? 'green' : 'orange'}
                      variant="subtle"
                      fontSize="12px"
                      px={2}
                      py={1}
                      borderRadius="md"
                    >
                      {quote.status ? 'Approved' : 'Pending'}
                    </Badge>
                    {showCRMContext && quote.leadSource && (
                      <Badge
                        colorScheme="blue"
                        variant="outline"
                        fontSize="10px"
                        px={2}
                        py={1}
                        borderRadius="md"
                      >
                        {quote.leadSource.toUpperCase()}
                      </Badge>
                    )}
                  </HStack>
                  <Text fontFamily="IBM Plex Sans" fontSize="16px" color="#717171">
                    {quote.email} • {quote.company || 'No company'} • Qty: {quote.quantity}
                  </Text>
                  <Text fontFamily="IBM Plex Sans" fontSize="14px" color="#8D8D8D">
                    Product: {quote.productName || quote.product?.name || 'N/A'}
                  </Text>
                  {showCRMContext && quote.crmStage && (
                    <Text fontFamily="IBM Plex Sans" fontSize="12px" color="#8D8D8D">
                      CRM Stage: {quote.crmStage}
                    </Text>
                  )}
                </VStack>
                <HStack spacing={2}>
                  <IconButton
                    aria-label="View quote"
                    icon={<ViewIcon />}
                    size="md"
                    variant="ghost"
                    color="#8D8D8D"
                    _hover={{ color: '#B40519', bg: '#F8E6E8' }}
                    onClick={() => handleViewQuote(quote._id)}
                  />
                  <Switch
                    colorScheme="green"
                    isChecked={quote.status}
                    onChange={() => handleToggleStatus(quote._id, quote.status)}
                    size="md"
                  />
                  <IconButton
                    aria-label="Delete quote"
                    icon={<DeleteIcon />}
                    size="md"
                    variant="ghost"
                    color="#8D8D8D"
                    _hover={{ color: '#B40519', bg: '#F8E6E8' }}
                    onClick={() => handleDeleteQuote(quote._id)}
                  />
                </HStack>
              </Flex>
            </Box>
          ))
        )}
      </VStack>

      {/* Pagination */}
      {totalPages > 1 && (
        <Flex align="center" justify="space-between" mt={8}>
          <Text fontFamily="IBM Plex Sans" fontSize="16px" color="#8D8D8D">
            Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, total)} of {total} quotes
          </Text>
          <HStack spacing={2}>
            <IconButton
              aria-label="Previous page"
              icon={<ChevronRightIcon transform="rotate(180deg)" />}
              size="sm"
              variant="outline"
              borderColor="#BCBCBC"
              color="#8D8D8D"
              _hover={{ borderColor: '#B40519', color: '#B40519' }}
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              isDisabled={currentPage === 1}
            />
            <Text fontFamily="IBM Plex Sans" fontSize="16px" color="#424242" px={4}>
              {currentPage} of {totalPages}
            </Text>
            <IconButton
              aria-label="Next page"
              icon={<ChevronRightIcon />}
              size="sm"
              variant="outline"
              borderColor="#BCBCBC"
              color="#8D8D8D"
              _hover={{ borderColor: '#B40519', color: '#B40519' }}
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              isDisabled={currentPage === totalPages}
            />
          </HStack>
        </Flex>
      )}

      {/* Quote Details Modal */}
      <AdminQuoteDetailsModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        quote={selectedQuote}
      />
    </Box>
  );
};

export default AdminQuotes; 