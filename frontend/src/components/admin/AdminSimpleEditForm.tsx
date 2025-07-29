import { Box, Text, Textarea, VStack, Flex } from '@chakra-ui/react';
import { useState } from 'react';

export interface AdminActionButtonsProps {
  onSave: () => void;
  onCancel: () => void;
  isLoading?: boolean;
  isDisabled?: boolean;
  saveLabel?: string;
  cancelLabel?: string;
}

interface AdminSimpleEditFormProps {
  title: string;
  initialValue: string;
  onSave: (value: string) => void;
  onCancel: () => void;
  ActionButtons?: React.ComponentType<AdminActionButtonsProps>;
}

const AdminSimpleEditForm = ({ title, initialValue, onSave, onCancel, ActionButtons }: AdminSimpleEditFormProps) => {
  const [value, setValue] = useState(initialValue);

  return (
    <Box bg="white" borderRadius="2xl" p={8} boxShadow="sm" border="1.5px solid #E9ECEF" maxW="900px" mx="auto">
      <Text fontSize="32px" fontWeight={600} color="#3F0209" fontFamily="IBM Plex Sans" mb={6}>{title}</Text>
      <VStack spacing={6} align="stretch">
        <Textarea
          value={value}
          onChange={e => setValue(e.target.value)}
          fontSize="20px"
          color="#717171"
          fontFamily="IBM Plex Sans"
          minH="160px"
          border="2px solid #E9ECEF"
          borderRadius="12px"
          bg="white"
          _placeholder={{ color: '#ADB5BD' }}
          _focus={{ borderColor: '#B40519', boxShadow: '0 0 0 3px rgba(180, 5, 25, 0.1)' }}
          _hover={{ borderColor: '#DEE2E6' }}
        />
        {ActionButtons ? (
          <ActionButtons onSave={() => onSave(value)} onCancel={onCancel} />
        ) : null}
      </VStack>
    </Box>
  );
};

export default AdminSimpleEditForm; 