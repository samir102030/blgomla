import { Modal, ModalOverlay, ModalContent, Box, Text, Image, Flex } from '@chakra-ui/react';
import React from 'react';

interface AdminEventDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: {
    mainImage: string;
    title: string;
    description: string;
    date: string;
    location: string;
  } | null;
}

const AdminEventDetailsModal: React.FC<AdminEventDetailsModalProps> = ({ isOpen, onClose, event }) => {
  if (!event) return null;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="2xl" isCentered>
      <ModalOverlay />
      <ModalContent borderRadius="2xl" p={0} maxW="700px" bg="#fff">
        <Box px={8} pt={10} pb={0}>
          {/* Header */}
          <Flex align="center" justify="space-between" mb={12}>
            <Text fontFamily="IBM Plex Sans" fontSize="32px" fontWeight={500} color="#000000e5" lineHeight="56px">Event details</Text>
            <Box bg="#EAEAEA" borderRadius="32px" w="56px" h="56px" display="flex" alignItems="center" justifyContent="center" cursor="pointer" onClick={onClose}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <line x1="7" y1="7" x2="17" y2="17" stroke="#555" strokeWidth="1.5" strokeLinecap="round" />
                <line x1="17" y1="7" x2="7" y2="17" stroke="#555" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </Box>
          </Flex>
          {/* Hero Section */}
          <Box mb={10}>
            <Image src={event.mainImage} alt="Event banner" borderRadius="lg" w="100%" h="324px" objectFit="cover" mb={6} bg="#EEE" />
            <Text fontFamily="IBM Plex Sans" fontSize="24px" color="#424242" fontWeight={500} mb={2}>{event.title}</Text>
            <Flex gap={4} mb={4}>
              <Text fontFamily="IBM Plex Sans" fontSize="16px" color="#717171" fontWeight={400}>
                📅 {formatDate(event.date)}
              </Text>
              <Text fontFamily="IBM Plex Sans" fontSize="16px" color="#717171" fontWeight={400}>
                📍 {event.location}
              </Text>
            </Flex>
            <Text fontFamily="IBM Plex Sans" fontSize="20px" color="#717171" fontWeight={400} mb={2}>{event.description}</Text>
          </Box>
          {/* Close Button Section */}
          <Box bg="#BCBCBC" h="80px" borderRadius="xl" w="full" mt={8} mb={4} display="flex" alignItems="center" justifyContent="center" cursor="pointer" onClick={onClose}>
            <Text fontFamily="IBM Plex Sans" fontSize="24px" fontWeight={600} color="#fff">Close</Text>
          </Box>
        </Box>
      </ModalContent>
    </Modal>
  );
};

export default AdminEventDetailsModal; 