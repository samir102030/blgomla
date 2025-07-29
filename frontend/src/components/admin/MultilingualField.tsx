import React from 'react';
import {
  FormControl,
  FormLabel,
  Input,
  Text,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
  Badge,
  Box,
  Flex,
  VStack,
} from '@chakra-ui/react';
import QuillEditor from './QuillEditor';

interface MultilingualField {
  en?: string;
  ar?: string;
  fr?: string;
  de?: string;
  zh?: string;
  es?: string;
  ru?: string;
  ja?: string;
}

interface MultilingualFieldProps {
  label: string;
  fieldName: string;
  value: string;
  multilingualData: MultilingualField;
  onChange: (value: string) => void;
  onMultilingualChange: (language: string, value: string) => void;
  isTextArea?: boolean;
  isRequired?: boolean;
  error?: string;
  placeholder?: string;
}

const languages = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'ar', name: 'العربية', flag: '🇸🇦' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'zh', name: '中文', flag: '🇨🇳' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'ru', name: 'Русский', flag: '🇷🇺' },
  { code: 'ja', name: '日本語', flag: '🇯🇵' },
];

export const MultilingualFieldComponent: React.FC<MultilingualFieldProps> = ({
  label,
  fieldName,
  value,
  multilingualData,
  onChange,
  onMultilingualChange,
  isTextArea = false,
  isRequired = false,
  error,
  placeholder,
}) => {
  const filledLanguages = languages.filter(lang => {
    const content = multilingualData?.[lang.code as keyof MultilingualField] || '';
    return content.trim().length > 0;
  }).length;

  return (
    <FormControl isInvalid={!!error}>
      <FormLabel color="gray.600">
        {label} {isRequired && '*'}
      </FormLabel>
      
      {/* Primary English Field */}
      {isTextArea ? (
        <QuillEditor
          theme="snow"
          value={value}
          onChange={onChange}
          placeholder={placeholder || `Enter ${label.toLowerCase()}`}
          style={{ 
            minHeight: 120, 
            border: `1px solid ${error ? '#E53E3E' : '#E2E8F0'}`, 
            borderRadius: '8px', 
            background: 'white' 
          }}
        />
      ) : (
        <Input
          placeholder={placeholder || `Enter ${label.toLowerCase()}`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          borderColor={error ? 'red.300' : 'gray.200'}
        />
      )}
      
      {error && (
        <Text fontSize="sm" color="red.500" mt={1}>{error}</Text>
      )}
      
      <Text fontSize="xs" color="#B40519" mt={1} cursor="pointer">
        🔗 Automatic translation
      </Text>
      
      {/* Multilingual Accordion */}
      <Accordion allowToggle mt={2}>
        <AccordionItem>
          <AccordionButton px={0} py={2}>
            <Box as="span" flex='1' textAlign='left' fontSize="sm" color="gray.600">
              🌐 View/Edit All Languages ({filledLanguages}/8)
            </Box>
            <AccordionIcon />
          </AccordionButton>
          <AccordionPanel pb={4} px={0}>
            <VStack spacing={3} align="stretch">
              {languages.map((lang) => (
                <Box key={lang.code} p={3} border="1px solid" borderColor="gray.200" borderRadius="md">
                  <Flex align="center" mb={2}>
                    <Text fontSize="sm" fontWeight="medium" color="gray.700">
                      {lang.flag} {lang.name}
                    </Text>
                    {lang.code === 'en' && (
                      <Badge colorScheme="blue" ml={2} fontSize="xs">Primary</Badge>
                    )}
                  </Flex>
                  {isTextArea ? (
                    <QuillEditor
                      theme="snow"
                      value={multilingualData?.[lang.code as keyof MultilingualField] || ''}
                      onChange={(value) => onMultilingualChange(lang.code, value)}
                      placeholder={`${label} in ${lang.name}`}
                      style={{ 
                        minHeight: 100, 
                        border: '1px solid #E2E8F0', 
                        borderRadius: '8px', 
                        background: 'white' 
                      }}
                    />
                  ) : (
                    <Input
                      size="sm"
                      placeholder={`${label} in ${lang.name}`}
                      value={multilingualData?.[lang.code as keyof MultilingualField] || ''}
                      onChange={(e) => onMultilingualChange(lang.code, e.target.value)}
                    />
                  )}
                </Box>
              ))}
            </VStack>
          </AccordionPanel>
        </AccordionItem>
      </Accordion>
    </FormControl>
  );
};

export default MultilingualFieldComponent; 