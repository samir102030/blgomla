import { Box, Flex, Text } from '@chakra-ui/react';

const stages = [
  { label: 'Lead', value: 200, width: '100%' },
  { label: 'Prospect', value: 123, width: '308px' },
  { label: 'Closed Deal', value: 200, width: '180px' },
  { label: 'New', value: 200, width: '180px' },
];

const SalesTransaction = () => (
  <Box bg="#fff" borderRadius="2xl" p={{ base: 4, md: 6 }} border="1px solid #eaeaea" minH="340px" fontFamily="IBM Plex Sans, sans-serif">
    <Flex justify="space-between" align="flex-start" mb={10}>
      <Box>
        <Text fontSize="24px" fontWeight={500} color="#000000e5" lineHeight="40px" mb={5} fontFamily="IBM Plex Sans, sans-serif">Sales transaction</Text>
        <Text fontSize="24px" fontWeight={400} color="#3F0209" lineHeight="40px" fontFamily="IBM Plex Sans, sans-serif">98765</Text>
      </Box>
      <Flex align="center" bg="#F5F5F5" borderRadius="lg" px={2} py={3} gap={2}>
        <Box w="24px" h="24px" display="flex" alignItems="center" justifyContent="center">
          {/* Custom calendar SVG from Figma */}
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <g>
              <path d="M3 10V20C3 20.2652 3.10536 20.5196 3.29289 20.7071C3.48043 20.8946 3.73478 21 4 21H20C20.2652 21 20.5196 20.8946 20.7071 20.7071C20.8946 20.5196 21 20.2652 21 20V10M3 10H21M3 10V6C3 5.73478 3.10536 5.48043 3.29289 5.29289C3.48043 5.10536 3.73478 5 4 5H20C20.2652 5 20.5196 5.10536 20.7071 5.29289C20.8946 5.48043 21 5.73478 21 6V10" stroke="#424242" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M16 3V7" stroke="#424242" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M8 3V7" stroke="#424242" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </g>
          </svg>
        </Box>
        <Text fontSize="16px" color="#424242" fontWeight={400} lineHeight="32px" fontFamily="IBM Plex Sans, sans-serif">7/4/2024</Text>
      </Flex>
    </Flex>
    <Box mt={0}>
      {stages.map((stage, i) => (
        <Flex key={i} align="center" gap={5} mb={6}>
          <Box bg="#F8E6E8" h="56px" w={stage.width} borderRadius="lg" display="flex" alignItems="center" justifyContent="center" px={4}>
            <Text fontSize="24px" color="#424242" fontWeight={400} lineHeight="40px" fontFamily="IBM Plex Sans, sans-serif">{stage.value}</Text>
          </Box>
          <Text fontSize="20px" color="#000000e5" fontWeight={400} lineHeight="40px" fontFamily="IBM Plex Sans, sans-serif">{stage.label}</Text>
        </Flex>
      ))}
    </Box>
  </Box>
);

export default SalesTransaction; 