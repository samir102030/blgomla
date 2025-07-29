import { Modal, ModalOverlay, ModalContent, Box, Text, Flex, Button } from '@chakra-ui/react';
import React from 'react';

interface AdminQuoteDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  quote: {
    customerName: string;
    company: string;
    quantity: number;
    email: string;
    status: boolean;
    country?: string;
    product?: string;
    date?: string;
    message?: string;
  } | null;
}

const labelStyle = {
  fontFamily: 'IBM Plex Sans',
  fontSize: '20px',
  fontWeight: 500,
  color: '#424242',
  lineHeight: '40px',
};
const valueStyle = {
  fontFamily: 'IBM Plex Sans',
  fontSize: '20px',
  fontWeight: 400,
  color: '#717171',
  lineHeight: '40px',
};

const AdminQuoteDetailsModal: React.FC<AdminQuoteDetailsModalProps> = ({ isOpen, onClose, quote }) => {
  if (!quote) return null;
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="2xl" isCentered>
      <ModalOverlay />
      <ModalContent borderRadius="2xl" p={0} maxW="700px" bg="#fff">
        <Box px={8} pt={10} pb={0}>
          {/* Header */}
          <Flex align="center" justify="space-between" mb={12}>
            <Text fontFamily="IBM Plex Sans" fontSize="32px" fontWeight={500} color="#000000e5" lineHeight="56px">Customer details</Text>
            <Box bg="#EAEAEA" borderRadius="32px" w="56px" h="56px" display="flex" alignItems="center" justifyContent="center" cursor="pointer" onClick={onClose}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <line x1="7" y1="7" x2="17" y2="17" stroke="#555" strokeWidth="1.5" strokeLinecap="round" />
                <line x1="17" y1="7" x2="7" y2="17" stroke="#555" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </Box>
          </Flex>
          {/* Customer Info */}
          <Box mb={10}>
            {/* Row 1: Labels */}
            <Box bg="#EAEAEA" borderRadius="lg" mb={0} p={0} px={4}>
              <Flex gap={4} py={0} align="center">
                <Box flex={1} {...labelStyle}>Customer Name</Box>
                <Box flex={1} {...labelStyle}>Company</Box>
                <Box flex={1} {...labelStyle}>Email</Box>
              </Flex>
            </Box>
            {/* Row 1: Values */}
            <Box borderBottom="1px solid #e3e2e5" px={4} pb={4}>
              <Flex gap={4} align="center">
                <Box flex={1} {...valueStyle}>{quote.customerName}</Box>
                <Box flex={1} {...valueStyle}>{quote.company}</Box>
                <Box flex={1} {...valueStyle}>{quote.email}</Box>
              </Flex>
            </Box>
            {/* Row 2: Labels */}
            <Box bg="#EAEAEA" borderRadius="lg" mb={0} mt={8} p={0} px={4}>
              <Flex gap={4} py={0} align="center">
                <Box flex={1} {...labelStyle}>Country</Box>
                <Box flex={1} {...labelStyle}>Product & Quantity</Box>
                <Box flex={1} {...labelStyle}>Date</Box>
              </Flex>
            </Box>
            {/* Row 2: Values */}
            <Box borderBottom="1px solid #e3e2e5" px={4} pb={4}>
              <Flex gap={4} align="center">
                <Box flex={1} {...valueStyle}>{quote.country || '-'}</Box>
                <Box flex={1} {...valueStyle}>{quote.product ? `${quote.product} (${quote.quantity})` : quote.quantity}</Box>
                <Box flex={1} {...valueStyle}>{quote.date || '-'}</Box>
              </Flex>
            </Box>
            {/* Row 3: Label */}
            <Box bg="#EAEAEA" borderRadius="lg" mb={0} mt={8} p={0} px={4}>
              <Flex gap={4} py={0} align="center">
                <Box flex={1} {...labelStyle}>Quote status</Box>
              </Flex>
            </Box>
            {/* Row 3: Value */}
            <Box borderBottom="1px solid #e3e2e5" px={4} pb={4}>
              <Flex gap={4} align="center">
                <Box flex={1} fontFamily="IBM Plex Sans" fontSize="20px" fontWeight={400} color="#1aac35" lineHeight="40px">{quote.status ? 'Answered' : 'Pending'}</Box>
              </Flex>
            </Box>
            {/* Message (English) Label */}
            <Box mt={8} mb={2} px={4}>
              <Text fontFamily="IBM Plex Sans" fontSize="20px" fontWeight={500} color="#424242">Message (English)</Text>
            </Box>
            {/* Message (English) Value */}
            <Box bg="#F8F8F8" borderRadius="lg" border="2px solid #EAEAEA" minH="120px" px={4} py={4} mx={4} mb={0}>
              <Text fontFamily="IBM Plex Sans" fontSize="20px" color="#717171">{quote.message || 'Enter description'}</Text>
            </Box>
          </Box>
          {/* Actions */}
          <Flex gap={5} mt={8} mb={4}>
            <Button flex={1} h="80px" bg="#B40519" color="#fff" fontFamily="IBM Plex Sans" fontSize="24px" fontWeight={600} borderRadius="xl" _hover={{ bg: '#8B0000' }}>Save</Button>
            <Button flex={1} h="80px" bg="#F8E6E8" color="#B40519" fontFamily="IBM Plex Sans" fontSize="24px" fontWeight={400} borderRadius="xl" _hover={{ bg: '#F5B5B5' }} onClick={onClose}>Cancel</Button>
          </Flex>
        </Box>
      </ModalContent>
    </Modal>
  );
};

export default AdminQuoteDetailsModal; 