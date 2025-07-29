import { Box, Flex, Text, HStack, Circle } from '@chakra-ui/react';
import { CalendarIcon } from '@chakra-ui/icons';

const OrdersChart = () => (
  <Box bg="white" borderRadius="lg" p={6} boxShadow="sm" display="flex" flexDirection="column" h="100%">
    {/* Header */}
    <Flex justify="space-between" align="center" mb={6}>
      <Text fontWeight="bold" fontSize="lg" color="gray.700">Orders</Text>
      <Flex align="center" gap={2} color="gray.500">
        <CalendarIcon w={4} h={4} />
        <Text fontSize="sm">7/4/2024</Text>
      </Flex>
    </Flex>
    
    {/* Main Number */}
    <Text fontSize="2xl" fontWeight="bold" color="gray.800" mb={6}>98765</Text>
    
    {/* Bar Chart */}
    <Box h="120px" mb={4} position="relative" display="flex" flexDirection="row">
      {/* Y-axis labels */}
      <Flex direction="column" align="flex-end" justify="space-between" h="100%" mr={2} pt={1} pb={1}>
        {[3200, 2800, 2400, 2000, 1600, 1200, 800, 400, 0].map((label) => (
          <Text key={label} fontFamily="IBM Plex Sans" fontSize="12px" color="#8D8D8D" opacity={0.7} textAlign="right" lineHeight="1.2">{label}</Text>
        ))}
      </Flex>
      {/* Chart bars and months */}
      <Box flex={1}>
        <Flex h="100%" align="end" justify="space-between" gap={1}>
          {/* 12 months data */}
          {[
            { height: '60%', colors: ['green.400', 'yellow.400', 'red.400'] },
            { height: '45%', colors: ['green.400', 'yellow.400', 'red.400'] },
            { height: '70%', colors: ['green.400', 'yellow.400', 'red.400'] },
            { height: '55%', colors: ['green.400', 'yellow.400', 'red.400'] },
            { height: '80%', colors: ['green.400', 'yellow.400', 'red.400'] },
            { height: '65%', colors: ['green.400', 'yellow.400', 'red.400'] },
            { height: '50%', colors: ['green.400', 'yellow.400', 'red.400'] },
            { height: '75%', colors: ['green.400', 'yellow.400', 'red.400'] },
            { height: '90%', colors: ['green.400', 'yellow.400', 'red.400'] },
            { height: '40%', colors: ['green.400', 'yellow.400', 'red.400'] },
            { height: '85%', colors: ['green.400', 'yellow.400', 'red.400'] },
            { height: '100%', colors: ['green.400', 'yellow.400', 'red.400'] },
          ].map((month, i) => (
            <Flex key={i} direction="column" h={month.height} w="7%" gap={0.5}>
              <Box bg="red.400" flex="0.3" borderRadius="sm" />
              <Box bg="yellow.400" flex="0.4" borderRadius="sm" />
              <Box bg="green.400" flex="0.8" borderRadius="sm" />
            </Flex>
          ))}
        </Flex>
        
        {/* Month labels */}
        <Flex justify="space-between" mt={2} fontSize="xs" color="gray.400">
          {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map(month => (
            <Text key={month}>{month}</Text>
          ))}
        </Flex>
      </Box>
    </Box>
    
    {/* Legend */}
    <HStack spacing={4} fontSize="sm" mt="auto">
      <Flex align="center" gap={2}>
        <Circle size="8px" bg="green.400" />
        <Text color="gray.600">Completed</Text>
      </Flex>
      <Flex align="center" gap={2}>
        <Circle size="8px" bg="yellow.400" />
        <Text color="gray.600">Pending</Text>
      </Flex>
      <Flex align="center" gap={2}>
        <Circle size="8px" bg="red.400" />
        <Text color="gray.600">Canceled</Text>
      </Flex>
    </HStack>
  </Box>
);

export default OrdersChart; 