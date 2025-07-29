import { useState, useCallback } from 'react';

export interface MultilingualField {
  en?: string;
  ar?: string;
  fr?: string;
  de?: string;
  zh?: string;
  es?: string;
  ru?: string;
  ja?: string;
}

export interface MultilingualFormData {
  [key: string]: MultilingualField;
}

export interface UseMultilingualFormReturn {
  multilingualData: MultilingualFormData;
  setMultilingualData: React.Dispatch<React.SetStateAction<MultilingualFormData>>;
  getEnglishValue: (fieldName: string) => string;
  updateEnglishValue: (fieldName: string, value: string) => void;
  updateMultilingualValue: (fieldName: string, language: string, value: string) => void;
  initializeFromData: (data: any, fields: string[]) => void;
  buildUpdatePayload: (changedFields?: Set<string>) => any;
}

export const useMultilingualForm = (initialFields: string[] = []): UseMultilingualFormReturn => {
  const [multilingualData, setMultilingualData] = useState<MultilingualFormData>(() => {
    const initial: MultilingualFormData = {};
    initialFields.forEach(field => {
      initial[field] = {};
    });
    return initial;
  });

  const getEnglishValue = useCallback((fieldName: string): string => {
    return multilingualData[fieldName]?.en || '';
  }, [multilingualData]);

  const updateEnglishValue = useCallback((fieldName: string, value: string) => {
    setMultilingualData(prev => ({
      ...prev,
      [fieldName]: { ...prev[fieldName], en: value }
    }));
  }, []);

  const updateMultilingualValue = useCallback((fieldName: string, language: string, value: string) => {
    setMultilingualData(prev => ({
      ...prev,
      [fieldName]: { ...prev[fieldName], [language]: value }
    }));
  }, []);

  const initializeFromData = useCallback((data: any, fields: string[]) => {
    const newMultilingualData: MultilingualFormData = {};
    
    fields.forEach(field => {
      if (data[field]) {
        if (typeof data[field] === 'object') {
          newMultilingualData[field] = data[field];
        } else if (typeof data[field] === 'string') {
          newMultilingualData[field] = { en: data[field] };
        } else {
          newMultilingualData[field] = {};
        }
      } else {
        newMultilingualData[field] = {};
      }
    });
    
    setMultilingualData(newMultilingualData);
  }, []);

  const buildUpdatePayload = useCallback((changedFields?: Set<string>) => {
    const payload: any = {};
    
    Object.keys(multilingualData).forEach(fieldName => {
      const fieldData = multilingualData[fieldName];
      
      // If we have changed fields tracking, only include changed multilingual fields
      if (changedFields) {
        const hasChanges = Array.from(changedFields).some(changed => 
          changed.startsWith(`${fieldName}(`) || changed === fieldName
        );
        if (!hasChanges) return;
      }
      
      // Only include fields that have content
      if (fieldData && Object.keys(fieldData).length > 0) {
        const hasContent = Object.values(fieldData).some(value => value && value.trim() !== '');
        if (hasContent) {
          payload[fieldName] = fieldData;
        }
      }
    });
    
    return payload;
  }, [multilingualData]);

  return {
    multilingualData,
    setMultilingualData,
    getEnglishValue,
    updateEnglishValue,
    updateMultilingualValue,
    initializeFromData,
    buildUpdatePayload,
  };
}; 