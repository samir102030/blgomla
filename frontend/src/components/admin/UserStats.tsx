import { Box, Stat, StatLabel, StatNumber, StatHelpText } from '@chakra-ui/react';

const UserStats = () => (
  <Box p={4} bg="white" borderRadius="lg" boxShadow="md">
    <Stat>
      <StatLabel>Total Users</StatLabel>
      <StatNumber>1,234</StatNumber>
      <StatHelpText>+5% this month</StatHelpText>
    </Stat>
  </Box>
);

export default UserStats; 