import { Box, Flex, Text, Spinner } from '@chakra-ui/react';
import { useState, useEffect } from 'react';
import { usersAPI } from '../../../utils/api';

const ApprovedCustomer = () => {
  const [count, setCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchApprovedCustomers = async () => {
      try {
        const response = await usersAPI.getAll({ 
          isApproved: 'true', 
          isAdmin: 'false', 
          limit: 1 // Just get count, not actual data
        });
        setCount(response.total || 0);
      } catch (error) {
        console.error('Failed to fetch approved customers:', error);
        setCount(0);
      } finally {
        setLoading(false);
      }
    };

    fetchApprovedCustomers();
  }, []);

  return (
  <Box bg="#E8F5E8" borderRadius="xl" p={5} border="1.5px solid #E9ECEF" minW="220px">
    <Flex align="center" gap={4}>
      <Box position="relative" w="64px" h="64px">
        {/* Inner solid circle */}
        <Box position="absolute" top="4px" left="4px" w="56px" h="56px" borderRadius="full" bg="#1AAC35" display="flex" alignItems="center" justifyContent="center" zIndex={1}>
          {/* Simple User Plus SVG icon */}
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <circle cx="9" cy="7" r="4" stroke="#fff" strokeWidth="2"/>
            <line x1="19" y1="8" x2="19" y2="14" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <line x1="22" y1="11" x2="16" y2="11" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </Box>
        {/* Dashed border circle - positioned to be visible */}
        <Box 
          position="absolute" 
          top={0} 
          left={0} 
          w="64px" 
          h="64px" 
          borderRadius="full" 
          border="2px dashed #1AAC35"
          zIndex={0}
        />
      </Box>
      <Box flex={1}>
        <Text fontWeight={400} color="#222" fontSize="18px" mb={1} fontFamily="IBM Plex Sans">Approved Customer</Text>
        <Text fontSize="22px" fontWeight={700} color="#1AAC35" fontFamily="IBM Plex Sans">
          {loading ? <Spinner size="sm" color="#1AAC35" /> : count}
        </Text>
      </Box>
    </Flex>
  </Box>
  );
};

export default ApprovedCustomer; 