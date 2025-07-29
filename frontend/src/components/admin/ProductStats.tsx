import { Box, Stat, StatLabel, StatNumber, StatHelpText } from '@chakra-ui/react';

const ProductStats = () => (
  <Box p={4} bg="white" borderRadius="lg" boxShadow="md">
    <Stat>
      <StatLabel>Total Products</StatLabel>
      <StatNumber>567</StatNumber>
      <StatHelpText>+2% this month</StatHelpText>
    </Stat>
  </Box>
);

export default ProductStats; 