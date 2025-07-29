import React, { useState, useEffect } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Button,
  VStack,
  HStack,
  Text,
  Input,
  Textarea,
  FormControl,
  FormLabel,
  useToast,
  Alert,
  AlertIcon,
  Spinner,
  Box,
  Divider,
} from '@chakra-ui/react';
import { useCRMStore } from '../../stores/crm.store';
import { productsAPI } from '../../utils/api';
import { CRMCustomerInfoResponse, QuoteCreationData } from '../../types/crmQuote';

interface CRMQuoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  crmItemId: string;
  onQuoteCreated?: () => void;
}

const CRMQuoteModal: React.FC<CRMQuoteModalProps> = ({
  isOpen,
  onClose,
  crmItemId,
  onQuoteCreated,
}) => {
  const { getCustomerInfo, createQuoteFromCRM } = useCRMStore();
  const [customerInfo, setCustomerInfo] = useState<CRMCustomerInfoResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [formData, setFormData] = useState<QuoteCreationData>({
    productName: '',
    quantity: 1,
    message: '',
    product: '',
  });
  const toast = useToast();

  useEffect(() => {
    if (isOpen && crmItemId) {
      loadCustomerInfo();
      loadProducts();
    }
  }, [isOpen, crmItemId]);

  const loadCustomerInfo = async () => {
    try {
      setLoading(true);
      const response = await getCustomerInfo(crmItemId);
      setCustomerInfo(response.data);
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message || 'Failed to load customer information',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  const loadProducts = async () => {
    try {
      const response = await productsAPI.getAll({ limit: 100 });
      setProducts(response.products || []);
    } catch (err: any) {
      console.error('Failed to load products:', err);
    }
  };

  const handleSubmit = async () => {
    if (!customerInfo?.validation.isValid) {
      toast({
        title: 'Error',
        description: customerInfo?.validation.message || 'Invalid customer data',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      return;
    }

    try {
      setCreating(true);
      await createQuoteFromCRM(crmItemId, formData);
      
      toast({
        title: 'Success',
        description: 'Quote created successfully from CRM',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });

      onQuoteCreated?.();
      handleClose();
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message || 'Failed to create quote',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setCreating(false);
    }
  };

  const handleClose = () => {
    setFormData({
      productName: '',
      quantity: 1,
      message: '',
      product: '',
    });
    setCustomerInfo(null);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="xl">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>Create Quote from CRM</ModalHeader>
        <ModalCloseButton />
        
        <ModalBody>
          {loading ? (
            <VStack spacing={4} py={8}>
              <Spinner size="lg" color="red.500" />
              <Text>Loading customer information...</Text>
            </VStack>
          ) : customerInfo ? (
            <VStack spacing={6} align="stretch">
              {/* Customer Information Display */}
              <Box>
                <Text fontSize="lg" fontWeight="semibold" mb={3}>Customer Information</Text>
                <VStack spacing={2} align="stretch" bg="gray.50" p={4} borderRadius="md">
                  <HStack>
                    <Text fontWeight="medium" w="120px">Name:</Text>
                    <Text>{customerInfo.customerInfo.name}</Text>
                  </HStack>
                  <HStack>
                    <Text fontWeight="medium" w="120px">Email:</Text>
                    <Text>{customerInfo.customerInfo.email}</Text>
                  </HStack>
                  <HStack>
                    <Text fontWeight="medium" w="120px">Company:</Text>
                    <Text>{customerInfo.customerInfo.company || 'Not specified'}</Text>
                  </HStack>
                  <HStack>
                    <Text fontWeight="medium" w="120px">Phone:</Text>
                    <Text>{customerInfo.customerInfo.phone || 'Not specified'}</Text>
                  </HStack>
                  <HStack>
                    <Text fontWeight="medium" w="120px">CRM Stage:</Text>
                    <Text textTransform="capitalize">{customerInfo.crmStage}</Text>
                  </HStack>
                  <HStack>
                    <Text fontWeight="medium" w="120px">Quote Count:</Text>
                    <Text>{customerInfo.quoteCount}</Text>
                  </HStack>
                </VStack>
              </Box>

              {/* Validation Status */}
              {!customerInfo.validation.isValid && (
                <Alert status="warning">
                  <AlertIcon />
                  {customerInfo.validation.message}
                </Alert>
              )}

              <Divider />

              {/* Quote Creation Form */}
              <Box>
                <Text fontSize="lg" fontWeight="semibold" mb={3}>Quote Details</Text>
                
                <VStack spacing={4} align="stretch">
                  <FormControl>
                    <FormLabel>Product Name</FormLabel>
                    <Input
                      value={formData.productName}
                      onChange={(e) => setFormData({ ...formData, productName: e.target.value })}
                      placeholder="Enter product name or general inquiry"
                    />
                  </FormControl>

                  <FormControl>
                    <FormLabel>Quantity</FormLabel>
                    <Input
                      type="number"
                      min="1"
                      value={formData.quantity}
                      onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })}
                    />
                  </FormControl>

                  <FormControl>
                    <FormLabel>Message/Notes</FormLabel>
                    <Textarea
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      placeholder="Additional details or requirements..."
                      rows={4}
                    />
                  </FormControl>
                </VStack>
              </Box>
            </VStack>
          ) : (
            <Alert status="error">
              <AlertIcon />
              Failed to load customer information
            </Alert>
          )}
        </ModalBody>

        <ModalFooter>
          <Button variant="ghost" mr={3} onClick={handleClose}>
            Cancel
          </Button>
          <Button
            colorScheme="red"
            onClick={handleSubmit}
            isLoading={creating}
            loadingText="Creating..."
            isDisabled={!customerInfo?.validation.isValid || loading}
          >
            Create Quote
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default CRMQuoteModal; 