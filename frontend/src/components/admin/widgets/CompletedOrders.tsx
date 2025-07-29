import { Box, Flex, Text, Spinner } from '@chakra-ui/react';
import { useState, useEffect } from 'react';
import { quotesAPI } from '../../../utils/api';

const CompletedOrders = () => {
  const [stats, setStats] = useState({ approved: 0, total: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchQuoteStats = async () => {
      try {
        const response = await quotesAPI.getStats();
        setStats(response);
      } catch (error) {
        console.error('Failed to fetch quote stats:', error);
        setStats({ approved: 0, total: 0 });
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
        <Box position="absolute" top="4px" left="4px" w="56px" h="56px" borderRadius="full" bg="#1AAC35" display="flex" alignItems="center" justifyContent="center" zIndex={1}>
          {/* Simple Clipboard Check SVG icon */}
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="m9 12 2 2 4-4" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
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
        <Text fontWeight={400} color="#222" fontSize="18px" mb={1} fontFamily="IBM Plex Sans">Completed Orders</Text>
        <Flex align="center" gap={2}>
          <Text fontSize="22px" fontWeight={700} color="#1AAC35" fontFamily="IBM Plex Sans">
            {loading ? <Spinner size="sm" color="#1AAC35" /> : stats.approved}
          </Text>
          <Text fontSize="16px" color="#1AAC35" fontWeight={500} fontFamily="IBM Plex Sans">
            Orders
          </Text>
        </Flex>
      </Box>
    </Flex>
  </Box>
  );
};

export default CompletedOrders; 