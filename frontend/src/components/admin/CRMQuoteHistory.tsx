import React, { useState, useEffect } from 'react';
import {
  Drawer,
  DrawerBody,
  DrawerFooter,
  DrawerHeader,
  DrawerOverlay,
  DrawerContent,
  DrawerCloseButton,
  VStack,
  HStack,
  Text,
  Badge,
  Box,
  Button,
  Spinner,
  Alert,
  AlertIcon,
  Divider,
  IconButton,
  useToast,
} from '@chakra-ui/react';
import { ChevronLeftIcon, ChevronRightIcon } from '@chakra-ui/icons';
import { useCRMStore } from '../../stores/crm.store';
import { Quote, CRMQuoteHistoryResponse } from '../../types/crmQuote';

interface CRMQuoteHistoryProps {
  isOpen: boolean;
  onClose: () => void;
  crmItemId: string;
  customerName?: string;
}

const QuoteItem: React.FC<{ quote: Quote }> = ({ quote }) => {
  const statusColor = quote.status ? 'green' : 'yellow';
  const statusText = quote.status ? 'Approved' : 'Pending';

  return (
    <Box p={4} border="1px solid" borderColor="gray.200" borderRadius="md" bg="white">
      <VStack align="stretch" spacing={2}>
        <HStack justify="space-between">
          <Text fontSize="sm" fontWeight="semibold" color="gray.700">
            Quote #{quote._id.slice(-6)}
          </Text>
          <Badge colorScheme={statusColor} size="sm">
            {statusText}
          </Badge>
        </HStack>
        
        <VStack align="stretch" spacing={1} fontSize="sm">
          <HStack>
            <Text fontWeight="medium" w="80px">Product:</Text>
            <Text color="gray.600">{quote.productName || 'General inquiry'}</Text>
          </HStack>
          <HStack>
            <Text fontWeight="medium" w="80px">Quantity:</Text>
            <Text color="gray.600">{quote.quantity}</Text>
          </HStack>
          <HStack>
            <Text fontWeight="medium" w="80px">Country:</Text>
            <Text color="gray.600">{quote.country || 'Not specified'}</Text>
          </HStack>
          <HStack>
            <Text fontWeight="medium" w="80px">Date:</Text>
            <Text color="gray.600">
              {new Date(quote.createdAt).toLocaleDateString()}
            </Text>
          </HStack>
          {quote.crmStage && (
            <HStack>
              <Text fontWeight="medium" w="80px">Stage:</Text>
              <Text color="gray.600" textTransform="capitalize">{quote.crmStage}</Text>
            </HStack>
          )}
        </VStack>

        {quote.message && (
          <Box>
            <Text fontSize="sm" fontWeight="medium" mb={1}>Message:</Text>
            <Text fontSize="sm" color="gray.600" bg="gray.50" p={2} borderRadius="md">
              {quote.message}
            </Text>
          </Box>
        )}
      </VStack>
    </Box>
  );
};

const CRMQuoteHistory: React.FC<CRMQuoteHistoryProps> = ({
  isOpen,
  onClose,
  crmItemId,
  customerName,
}) => {
  const { getQuoteHistory } = useCRMStore();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [totalQuotes, setTotalQuotes] = useState(0);
  const toast = useToast();

  useEffect(() => {
    if (isOpen && crmItemId) {
      loadQuoteHistory();
    }
  }, [isOpen, crmItemId, currentPage]);

  const loadQuoteHistory = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response: CRMQuoteHistoryResponse = await getQuoteHistory(crmItemId, {
        page: currentPage,
        limit: 10,
      });

      setQuotes(response.data || []);
      setTotalPages(response.pagination?.totalPages || 0);
      setTotalQuotes(response.pagination?.totalQuotes || 0);
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to load quote history';
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
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  const handleClose = () => {
    setCurrentPage(1);
    setQuotes([]);
    setError(null);
    onClose();
  };

  return (
    <Drawer isOpen={isOpen} placement="right" onClose={handleClose} size="lg">
      <DrawerOverlay />
      <DrawerContent>
        <DrawerCloseButton />
        <DrawerHeader borderBottomWidth="1px">
          <VStack align="stretch" spacing={2}>
            <Text fontSize="lg" fontWeight="bold">
              Quote History
            </Text>
            {customerName && (
              <Text fontSize="md" color="gray.600" fontWeight="normal">
                Customer: {customerName}
              </Text>
            )}
            <Text fontSize="sm" color="gray.500" fontWeight="normal">
              Total quotes: {totalQuotes}
            </Text>
          </VStack>
        </DrawerHeader>

        <DrawerBody>
          {loading ? (
            <VStack spacing={4} py={8}>
              <Spinner size="lg" color="red.500" />
              <Text>Loading quote history...</Text>
            </VStack>
          ) : error ? (
            <Alert status="error">
              <AlertIcon />
              {error}
            </Alert>
          ) : quotes.length === 0 ? (
            <VStack spacing={4} py={8}>
              <Text fontSize="lg" color="gray.500">No quotes found</Text>
              <Text fontSize="sm" color="gray.400" textAlign="center">
                This customer hasn't requested any quotes yet.
              </Text>
            </VStack>
          ) : (
            <VStack spacing={4} align="stretch">
              {quotes.map((quote, index) => (
                <React.Fragment key={quote._id}>
                  <QuoteItem quote={quote} />
                  {index < quotes.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </VStack>
          )}
        </DrawerBody>

        {totalPages > 1 && (
          <DrawerFooter borderTopWidth="1px">
            <HStack spacing={2} justify="center" w="full">
              <IconButton
                aria-label="Previous page"
                icon={<ChevronLeftIcon />}
                onClick={() => handlePageChange(currentPage - 1)}
                isDisabled={currentPage === 1}
                size="sm"
              />
              
              <Text fontSize="sm">
                Page {currentPage} of {totalPages}
              </Text>
              
              <IconButton
                aria-label="Next page"
                icon={<ChevronRightIcon />}
                onClick={() => handlePageChange(currentPage + 1)}
                isDisabled={currentPage === totalPages}
                size="sm"
              />
            </HStack>
          </DrawerFooter>
        )}
      </DrawerContent>
    </Drawer>
  );
};

export default CRMQuoteHistory; 