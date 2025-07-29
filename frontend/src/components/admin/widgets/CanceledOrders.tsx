import { Box, Flex, Text } from '@chakra-ui/react';

const CanceledOrders = () => (
  <Box bg="#fff" borderRadius="xl" p={5} border="1.5px solid #E9ECEF" minW="220px">
    <Flex align="center" gap={4}>
      <Box position="relative" w="64px" h="64px">
        {/* Inner solid circle */}
        <Box position="absolute" top="4px" left="4px" w="56px" h="56px" borderRadius="full" bg="#900414" display="flex" alignItems="center" justifyContent="center" zIndex={1}>
          {/* X Circle SVG icon */}
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="#fff" strokeWidth="1.5"/>
            <path d="m15 9-6 6" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="m9 9 6 6" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
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
        <Text fontWeight={400} color="#222" fontSize="18px" mb={1} fontFamily="IBM Plex Sans">Canceled Orders</Text>
        <Flex align="center" gap={2}>
          <Text fontSize="22px" fontWeight={700} color="#900414" fontFamily="IBM Plex Sans">658.40</Text>
          <Text fontSize="16px" color="#900414" fontWeight={500} fontFamily="IBM Plex Sans">+658.40</Text>
        </Flex>
      </Box>
    </Flex>
  </Box>
);

export default CanceledOrders; 