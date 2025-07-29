import { Box, Flex, Text, IconButton } from '@chakra-ui/react';
import { CalendarIcon } from '@chakra-ui/icons';

const SalesChart = () => (
  <Box bg="white" borderRadius="lg" p={4} boxShadow="md" minH="300px">
    <Flex justify="space-between" align="center" mb={2}>
      <Text fontWeight="bold" fontSize="lg">Sales</Text>
      <Flex align="center" gap={2}>
        <Text fontWeight="bold" fontSize="xl" color="#900414">1090</Text>
        <IconButton aria-label="Pick date" icon={<CalendarIcon />} size="sm" />
      </Flex>
    </Flex>
    {/* Placeholder for chart */}
    <Box mt={4} h="200px" w="100%" bgGradient="linear(to-b, red.200, white)" borderRadius="md" position="relative">
      <Box position="absolute" left={0} right={0} top="50%" h="2px" bg="#900414" />
      {/* We will replace with real chart later */}
      <Text position="absolute" left="50%" top="30%" transform="translate(-50%, -50%)" color="#900414" fontWeight="bold">[Line Chart]</Text>
    </Box>
  </Box>
);

export default SalesChart; 