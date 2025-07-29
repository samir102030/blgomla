import { Button, Flex } from '@chakra-ui/react';

interface AdminActionButtonsProps {
  onSave: () => void;
  onCancel: () => void;
  isLoading?: boolean;
  isDisabled?: boolean;
  saveLabel?: string;
  cancelLabel?: string;
}

const AdminActionButtons = ({
  onSave,
  onCancel,
  isLoading = false,
  isDisabled = false,
  saveLabel = 'Save',
  cancelLabel = 'Cancel',
}: AdminActionButtonsProps) => (
  <Flex w="100%" justify="center" align="center" gap={4} mt={8}>
    <Button
      w="50%"
      h="60px"
      bg="#B40519"
      color="white"
      fontSize="24px"
      fontWeight="600"
      lineHeight="40px"
      borderRadius="12px"
      fontFamily="IBM Plex Sans"
      _hover={{ bg: '#9A0416' }}
      _active={{ bg: '#7A0312' }}
      isLoading={isLoading}
      loadingText="Saving..."
      onClick={onSave}
      isDisabled={isDisabled}
    >
      {saveLabel}
    </Button>
    <Button
      w="50%"
      h="60px"
      bg="#F8E6E8"
      color="#B40519"
      fontSize="24px"
      fontWeight="400"
      lineHeight="40px"
      borderRadius="12px"
      fontFamily="IBM Plex Sans"
      _hover={{ bg: '#F0D6D9' }}
      _active={{ bg: '#E8C6CA' }}
      onClick={onCancel}
      isDisabled={isDisabled}
    >
      {cancelLabel}
    </Button>
  </Flex>
);

export default AdminActionButtons; 