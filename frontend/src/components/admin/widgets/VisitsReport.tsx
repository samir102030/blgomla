import { Box, Flex, Text, IconButton } from '@chakra-ui/react';
import { CalendarIcon } from '@chakra-ui/icons';

const VisitsReport = () => (
  <Box bg="white" borderRadius="lg" p={4} boxShadow="md" mb={4}>
    <Flex justify="space-between" align="center" mb={2}>
      <Text fontWeight="bold" fontSize="lg">Visitors Report</Text>
      <Flex align="center" gap={2}>
        <Text fontWeight="bold" fontSize="xl" color="#900414">98765</Text>
        <IconButton aria-label="Pick date" icon={<CalendarIcon />} size="sm" />
      </Flex>
    </Flex>
    {/* Placeholder for chart */}
    <Box mt={4} h="100px" w="100%" bgGradient="linear(to-b, red.100, white)" borderRadius="md" position="relative">
      <Box position="absolute" left={0} right={0} top="60%" h="2px" bg="#900414" />
      <Text position="absolute" left="50%" top="30%" transform="translate(-50%, -50%)" color="#900414" fontWeight="bold">[Line Chart]</Text>
    </Box>
  </Box>
);

export default VisitsReport; 