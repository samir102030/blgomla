import React from 'react';
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
  Badge,
  Box,
  Divider,
  Grid,
  GridItem,
  Avatar,
  Heading,
  Alert,
  AlertIcon,
  FormControl,
  FormLabel,
} from '@chakra-ui/react';
import { CRMItem, UserDetails } from '../../types/crmQuote';

interface CRMItemDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: CRMItem | null;
}

const CRMItemDetailsModal: React.FC<CRMItemDetailsModalProps> = ({
  isOpen,
  onClose,
  item,
}) => {
  if (!item) return null;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderFormFields = (data: any, source: string) => {
    if (source === 'gitCode') {
      return [
        // First row: First Name | Last Name
        <GridItem key="name-row" colSpan={2}>
          <Grid templateColumns="repeat(2, 1fr)" gap={4}>
            <FormControl>
              <FormLabel fontSize="sm" fontWeight="medium" color="gray.700" mb={2}>First Name:</FormLabel>
              <Box bg="white" p={3} borderRadius="md" border="1px solid" borderColor="gray.200">
                <Text fontSize="sm">{data.firstName || ''}</Text>
              </Box>
            </FormControl>
            <FormControl>
              <FormLabel fontSize="sm" fontWeight="medium" color="gray.700" mb={2}>Last Name:</FormLabel>
              <Box bg="white" p={3} borderRadius="md" border="1px solid" borderColor="gray.200">
                <Text fontSize="sm">{data.lastName || ''}</Text>
              </Box>
            </FormControl>
          </Grid>
        </GridItem>,
        // Second row: Email | Company Name
        <GridItem key="contact-row" colSpan={2}>
          <Grid templateColumns="repeat(2, 1fr)" gap={4}>
            <FormControl>
              <FormLabel fontSize="sm" fontWeight="medium" color="gray.700" mb={2}>Email:</FormLabel>
              <Box bg="white" p={3} borderRadius="md" border="1px solid" borderColor="gray.200">
                <Text fontSize="sm">{data.email || ''}</Text>
              </Box>
            </FormControl>
            <FormControl>
              <FormLabel fontSize="sm" fontWeight="medium" color="gray.700" mb={2}>Company Name:</FormLabel>
              <Box bg="white" p={3} borderRadius="md" border="1px solid" borderColor="gray.200">
                <Text fontSize="sm">{data.companyName || ''}</Text>
              </Box>
            </FormControl>
          </Grid>
        </GridItem>,
        // Third row: Phone | Country
        <GridItem key="location-row" colSpan={2}>
          <Grid templateColumns="repeat(2, 1fr)" gap={4}>
            <FormControl>
              <FormLabel fontSize="sm" fontWeight="medium" color="gray.700" mb={2}>Phone:</FormLabel>
              <Box bg="white" p={3} borderRadius="md" border="1px solid" borderColor="gray.200">
                <Text fontSize="sm">{data.phone || ''}</Text>
              </Box>
            </FormControl>
            <FormControl>
              <FormLabel fontSize="sm" fontWeight="medium" color="gray.700" mb={2}>Country:</FormLabel>
              <Box bg="white" p={3} borderRadius="md" border="1px solid" borderColor="gray.200">
                <Text fontSize="sm">{data.country || ''}</Text>
              </Box>
            </FormControl>
          </Grid>
        </GridItem>,
        // Fourth row: Product | Quantity
        <GridItem key="product-row" colSpan={2}>
          <Grid templateColumns="repeat(2, 1fr)" gap={4}>
            <FormControl>
              <FormLabel fontSize="sm" fontWeight="medium" color="gray.700" mb={2}>Product:</FormLabel>
              <Box bg="white" p={3} borderRadius="md" border="1px solid" borderColor="gray.200">
                <Text fontSize="sm">{data.product || ''}</Text>
              </Box>
            </FormControl>
            <FormControl>
              <FormLabel fontSize="sm" fontWeight="medium" color="gray.700" mb={2}>Quantity:</FormLabel>
              <Box bg="white" p={3} borderRadius="md" border="1px solid" borderColor="gray.200">
                <Text fontSize="sm">{data.quantity || ''}</Text>
              </Box>
            </FormControl>
          </Grid>
        </GridItem>,
        // Fifth row: Message (full width)
        <GridItem key="message-row" colSpan={2}>
          {data.message ? renderDataField('message', data.message) : null}
        </GridItem>
      ];
    } else if (source === 'supplier') {
      return [
        // First row: Item | Quantity
        <GridItem key="item-row" colSpan={2}>
          <Grid templateColumns="repeat(2, 1fr)" gap={4}>
            <FormControl>
              <FormLabel fontSize="sm" fontWeight="medium" color="gray.700" mb={2}>Item:</FormLabel>
              <Box bg="white" p={3} borderRadius="md" border="1px solid" borderColor="gray.200">
                <Text fontSize="sm">{data.item || ''}</Text>
              </Box>
            </FormControl>
            <FormControl>
              <FormLabel fontSize="sm" fontWeight="medium" color="gray.700" mb={2}>Quantity:</FormLabel>
              <Box bg="white" p={3} borderRadius="md" border="1px solid" borderColor="gray.200">
                <Text fontSize="sm">{data.quantity || ''}</Text>
              </Box>
            </FormControl>
          </Grid>
        </GridItem>,
        // Second row: Email | Phone
        <GridItem key="contact-row" colSpan={2}>
          <Grid templateColumns="repeat(2, 1fr)" gap={4}>
            <FormControl>
              <FormLabel fontSize="sm" fontWeight="medium" color="gray.700" mb={2}>Email:</FormLabel>
              <Box bg="white" p={3} borderRadius="md" border="1px solid" borderColor="gray.200">
                <Text fontSize="sm">{data.email || ''}</Text>
              </Box>
            </FormControl>
            <FormControl>
              <FormLabel fontSize="sm" fontWeight="medium" color="gray.700" mb={2}>Phone:</FormLabel>
              <Box bg="white" p={3} borderRadius="md" border="1px solid" borderColor="gray.200">
                <Text fontSize="sm">{data.phone || ''}</Text>
              </Box>
            </FormControl>
          </Grid>
        </GridItem>,
        // Third row: Details (full width as message)
        <GridItem key="details-row" colSpan={2}>
          {data.details ? renderDataField('details', data.details) : null}
        </GridItem>
      ];
    } else {
      // fallback: show nothing
      return null;
    }
  };

  const renderDataField = (key: string, value: any) => {
    if (value === null || value === undefined) return null;
    
    if (typeof value === 'object' && value !== null && 'original' in value && typeof (value as any).original === 'string') {
      // Handle multilingual message objects
      const messageObj = value as { original: string; en?: string; ar?: string };
      return (
        <FormControl key={key}>
          <FormLabel fontSize="sm" fontWeight="medium" color="gray.700" mb={2}>
            {key.charAt(0).toUpperCase() + key.slice(1)}:
          </FormLabel>
          <Box bg="white" p={3} borderRadius="md" border="1px solid" borderColor="gray.200">
            <Text fontSize="sm" mb={2}>
              <strong>Original:</strong> {messageObj.original}
            </Text>
            {messageObj.en && (
              <Text fontSize="sm" mb={1}>
                <strong>English:</strong> {messageObj.en}
              </Text>
            )}
            {messageObj.ar && (
              <Text fontSize="sm" mb={1}>
                <strong>Arabic:</strong> {messageObj.ar}
              </Text>
            )}
          </Box>
        </FormControl>
      );
    }
    
    if (Array.isArray(value)) {
      return (
        <FormControl key={key}>
          <FormLabel fontSize="sm" fontWeight="medium" color="gray.700" mb={2}>
            {key.charAt(0).toUpperCase() + key.slice(1)}:
          </FormLabel>
          <Box bg="white" p={3} borderRadius="md" border="1px solid" borderColor="gray.200">
            <Text fontSize="sm">
              {value.join(', ')}
            </Text>
          </Box>
        </FormControl>
      );
    }

    return (
      <FormControl key={key}>
        <FormLabel fontSize="sm" fontWeight="medium" color="gray.700" mb={2}>
          {key.charAt(0).toUpperCase() + key.slice(1)}:
        </FormLabel>
        <Box bg="white" p={3} borderRadius="md" border="1px solid" borderColor="gray.200">
          <Text fontSize="sm">
            {String(value)}
          </Text>
        </Box>
      </FormControl>
    );
  };

  const renderUserDetails = (userDetails: UserDetails) => (
    <Box>
      <Heading size="md" mb={4} color="gray.700">User Profile</Heading>
      <Grid templateColumns="repeat(2, 1fr)" gap={4}>
        <GridItem>
          <HStack spacing={3} mb={3}>
            <Avatar 
              size="md" 
              src={userDetails.profilePic} 
              name={userDetails.username}
            />
            <VStack align="start" spacing={0}>
              <Text fontWeight="bold" fontSize="lg">
                {userDetails.username}
              </Text>
              <Text fontSize="sm" color="gray.600">
                {userDetails.email}
              </Text>
              <Badge 
                colorScheme={userDetails.isApproved ? "green" : "red"}
                size="sm"
                mt={1}
              >
                {userDetails.approvalStatus}
              </Badge>
            </VStack>
          </HStack>
        </GridItem>
        
        <GridItem>
          <VStack align="start" spacing={2}>
            {userDetails.companyName && (
              <Text fontSize="sm">
                <strong>Company:</strong> {userDetails.companyName}
              </Text>
            )}
            {userDetails.phoneNumber && (
              <Text fontSize="sm">
                <strong>Phone:</strong> {userDetails.phoneNumber}
              </Text>
            )}
            {userDetails.bio && (
              <Text fontSize="sm">
                <strong>Bio:</strong> {userDetails.bio}
              </Text>
            )}
            <Text fontSize="sm">
              <strong>Member since:</strong> {formatDate(userDetails.createdAt)}
            </Text>
          </VStack>
        </GridItem>
      </Grid>
    </Box>
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl" scrollBehavior="inside">
      <ModalOverlay />
      <ModalContent maxW="800px">
        <ModalHeader>
          <HStack justify="space-between" align="center">
            <Text>CRM Item Details</Text>
            <Badge colorScheme="blue" variant="subtle">
              {item.source}
            </Badge>
          </HStack>
        </ModalHeader>
        <ModalCloseButton />
        
        <ModalBody>
          <VStack spacing={6} align="stretch">
            {/* Form Data */}
            <Box>
              <Heading size="sm" mb={3} color="gray.700">Form Data</Heading>
              <Text fontSize="xs" color="gray.500" mb={4} fontStyle="italic">
                This is the data that the customer filled in the form
              </Text>
              <VStack spacing={4} align="stretch" bg="gray.50" p={4} borderRadius="md">
                {item.data && (
                  <Grid templateColumns="repeat(2, 1fr)" gap={4}>
                    {renderFormFields(item.data, item.source)}
                  </Grid>
                )}
              </VStack>
            </Box>

            <Divider />

            {/* User Details */}
            {item.userDetails ? (
              renderUserDetails(item.userDetails)
            ) : (
              <Alert status="info">
                <AlertIcon />
                No user details available for this item.
              </Alert>
            )}
          </VStack>
        </ModalBody>

        <ModalFooter>
          <Button colorScheme="blue" mr={3} onClick={onClose}>
            Close
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default CRMItemDetailsModal;