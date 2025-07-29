import { Modal, ModalOverlay, ModalContent, Box, Text, Image, Flex } from '@chakra-ui/react';
import React from 'react';

interface AdminCompanyDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  brand: {
    _id: string;
    name: string;
    logo: string;
    createdAt: string;
    updatedAt: string;
  } | null;
}

const AdminCompanyDetailsModal: React.FC<AdminCompanyDetailsModalProps> = ({ isOpen, onClose, brand }) => {
  if (!brand) return null;
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md" isCentered>
      <ModalOverlay />
      <ModalContent borderRadius="2xl" p={0} maxW="400px" bg="#fff">
        <Box px={8} pt={10} pb={8}>
          {/* Header */}
          <Flex align="center" justify="space-between" mb={6}>
            <Text fontFamily="IBM Plex Sans" fontSize="28px" fontWeight={600} color="#3F0209">Company Details</Text>
            <Box bg="#EAEAEA" borderRadius="32px" w="40px" h="40px" display="flex" alignItems="center" justifyContent="center" cursor="pointer" onClick={onClose}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <line x1="7" y1="7" x2="17" y2="17" stroke="#555" strokeWidth="1.5" strokeLinecap="round" />
                <line x1="17" y1="7" x2="7" y2="17" stroke="#555" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </Box>
          </Flex>
          {/* Brand Logo */}
          <Box mb={6} display="flex" alignItems="center" justifyContent="center">
            <Image src={brand.logo} alt={brand.name} borderRadius="lg" w="180px" h="60px" objectFit="contain" bg="#EEE" />
          </Box>
          {/* Brand Name */}
          <Text fontFamily="IBM Plex Sans" fontSize="22px" color="#424242" fontWeight={500} textAlign="center">{brand.name}</Text>
        </Box>
      </ModalContent>
    </Modal>
  );
};

export default AdminCompanyDetailsModal; 