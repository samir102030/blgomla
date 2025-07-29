import { Box, Flex, Text, Spinner } from '@chakra-ui/react';
import { useState, useEffect } from 'react';
import { quotesAPI } from '../../../utils/api';

const PendingOrders = () => {
  const [stats, setStats] = useState({ pending: 0, total: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchQuoteStats = async () => {
      try {
        const response = await quotesAPI.getStats();
        setStats(response);
      } catch (error) {
        console.error('Failed to fetch quote stats:', error);
        setStats({ pending: 0, total: 0 });
      } finally {
        setLoading(false);
      }
    };

    fetchQuoteStats();
  }, []);

  return (
  <Box bg="#fff" borderRadius="xl" p={5} border="1.5px solid #E9ECEF" minW="220px">
    <Flex align="center" gap={4}>
      <Box position="relative" w="64px" h="64px">
        {/* Inner solid circle */}
        <Box position="absolute" top="4px" left="4px" w="56px" h="56px" borderRadius="full" bg="#C69B10" display="flex" alignItems="center" justifyContent="center" zIndex={1}>
          {/* Clock SVG icon */}
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="#fff" strokeWidth="2"/>
            <polyline points="12,6 12,12 16,14" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
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
          border="2px dashed #C69B10"
          zIndex={0}
        />
      </Box>
      <Box flex={1}>
        <Text fontWeight={400} color="#222" fontSize="18px" mb={1} fontFamily="IBM Plex Sans">Pending Orders</Text>
        <Flex align="center" gap={2}>
          <Text fontSize="22px" fontWeight={700} color="#C69B10" fontFamily="IBM Plex Sans">
            {loading ? <Spinner size="sm" color="#C69B10" /> : stats.pending}
          </Text>
          <Text fontSize="16px" color="#C69B10" fontWeight={500} fontFamily="IBM Plex Sans">
            Orders
          </Text>
        </Flex>
      </Box>
    </Flex>
  </Box>
  );
};

export default PendingOrders; 