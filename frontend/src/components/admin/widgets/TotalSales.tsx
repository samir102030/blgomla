import { Box, Flex, Text, Spinner } from '@chakra-ui/react';
import { useState, useEffect } from 'react';
import { quotesAPI } from '../../../utils/api';

const TotalSales = () => {
  const [stats, setStats] = useState({ total: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchQuoteStats = async () => {
      try {
        const response = await quotesAPI.getStats();
        setStats(response);
      } catch (error) {
        console.error('Failed to fetch quote stats:', error);
        setStats({ total: 0 });
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
        <Box position="absolute" top="4px" left="4px" w="56px" h="56px" borderRadius="full" bg="#222" display="flex" alignItems="center" justifyContent="center" zIndex={1}>
          {/* Bar Chart SVG icon */}
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <line x1="12" y1="20" x2="12" y2="10" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
            <line x1="18" y1="20" x2="18" y2="4" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
            <line x1="6" y1="20" x2="6" y2="16" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
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
          border="2px dashed #222"
          zIndex={0}
        />
      </Box>
      <Box flex={1}>
        <Text fontWeight={400} color="#222" fontSize="18px" mb={1} fontFamily="IBM Plex Sans">Total Quotes</Text>
        <Flex align="center" gap={2}>
          <Text fontSize="22px" fontWeight={700} color="#222" fontFamily="IBM Plex Sans">
            {loading ? <Spinner size="sm" color="#222" /> : stats.total}
          </Text>
          <Text fontSize="16px" color="#222" fontWeight={500} fontFamily="IBM Plex Sans">
            Requests
          </Text>
        </Flex>
      </Box>
    </Flex>
  </Box>
  );
};

export default TotalSales; 