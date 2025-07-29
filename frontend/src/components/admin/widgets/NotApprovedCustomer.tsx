import { Box, Flex, Text, Spinner } from '@chakra-ui/react';
import { useState, useEffect } from 'react';
import { usersAPI } from '../../../utils/api';

const NotApprovedCustomer = () => {
  const [count, setCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchNotApprovedCustomers = async () => {
      try {
        const response = await usersAPI.getAll({ 
          isApproved: 'false', 
          isAdmin: 'false', 
          limit: 1 // Just get count, not actual data
        });
        setCount(response.total || 0);
      } catch (error) {
        console.error('Failed to fetch not approved customers:', error);
        setCount(0);
      } finally {
        setLoading(false);
      }
    };

    fetchNotApprovedCustomers();
  }, []);

  return (
  <Box bg="#F8E8E8" borderRadius="xl" p={5} border="1.5px solid #E9ECEF" minW="220px">
    <Flex align="center" gap={4}>
      <Box position="relative" w="64px" h="64px">
        {/* Inner solid circle */}
        <Box position="absolute" top="4px" left="4px" w="56px" h="56px" borderRadius="full" bg="#900414" display="flex" alignItems="center" justifyContent="center" zIndex={1}>
          {/* Simple User Minus SVG icon */}
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <circle cx="9" cy="7" r="4" stroke="#fff" strokeWidth="2"/>
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
          border="2px dashed #900414"
          zIndex={0}
        />
      </Box>
      <Box flex={1}>
        <Text fontWeight={400} color="#222" fontSize="18px" mb={1} fontFamily="IBM Plex Sans">Not Approved Customer</Text>
        <Text fontSize="22px" fontWeight={700} color="#900414" fontFamily="IBM Plex Sans">
          {loading ? <Spinner size="sm" color="#900414" /> : count}
        </Text>
      </Box>
    </Flex>
  </Box>
  );
};

export default NotApprovedCustomer; 