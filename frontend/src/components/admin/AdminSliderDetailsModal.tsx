import { Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalCloseButton, Box, Text, Image, Flex, Button } from '@chakra-ui/react';

interface AdminSliderDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  image: string;
  title: string;
  description: string;
}

const AdminSliderDetailsModal = ({ isOpen, onClose, image, title, description }: AdminSliderDetailsModalProps) => (
  <Modal isOpen={isOpen} onClose={onClose} size="2xl" isCentered>
    <ModalOverlay />
    <ModalContent borderRadius="2xl" p={0} maxW="700px" bg="#fff">
      <Box px={8} pt={10} pb={0}>
        <Flex align="center" justify="space-between" mb={12}>
          <Text fontFamily="IBM Plex Sans" fontSize="32px" fontWeight={500} color="#000000e5" lineHeight="56px">Slider details</Text>
          <Box bg="#EAEAEA" borderRadius="32px" w="56px" h="56px" display="flex" alignItems="center" justifyContent="center" cursor="pointer" onClick={onClose}>
            <svg width="32" height="32" viewBox="0 0 18 18" fill="none"><path d="M17.19 0.403334C16.67 -0.116666 15.83 -0.116666 15.31 0.403334L8.79 6.91L2.27 0.39C1.75 -0.13 0.91 -0.13 0.39 0.39C-0.13 0.91 -0.13 1.75 0.39 2.27L6.91 8.79L0.39 15.31C-0.13 15.83 -0.13 16.67 0.39 17.19C0.91 17.71 1.75 17.71 2.27 17.19L8.79 10.67L15.31 17.19C15.83 17.71 16.67 17.71 17.19 17.19C17.71 16.67 17.71 15.83 17.19 15.31L10.67 8.79L17.19 2.27C17.6967 1.76333 17.6967 0.91 17.19 0.403334Z" fill="#555"/></svg>
          </Box>
        </Flex>
        <Box mb={10}>
          <Image src={image} alt="Slider banner" borderRadius="lg" w="100%" h="324px" objectFit="cover" mb={6} bg="#EEE" />
          <Text fontFamily="IBM Plex Sans" fontSize="24px" color="#424242" fontWeight={500} mb={2}>Text</Text>
          <Text fontFamily="IBM Plex Sans" fontSize="20px" color="#717171" fontWeight={400} mb={2}>{description}</Text>
        </Box>
        <Button w="full" h="80px" bg="#BCBCBC" color="#fff" fontFamily="IBM Plex Sans" fontSize="24px" fontWeight={600} borderRadius="xl" mt={8} mb={4} onClick={onClose} _hover={{ bg: '#A0A0A0' }}>Close</Button>
      </Box>
    </ModalContent>
  </Modal>
);

export default AdminSliderDetailsModal; 