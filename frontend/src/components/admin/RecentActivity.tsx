import { Box, Heading, List, ListItem, ListIcon } from '@chakra-ui/react';
import { CheckCircleIcon } from '@chakra-ui/icons';

const RecentActivity = () => (
  <Box p={4} bg="white" borderRadius="lg" boxShadow="md">
    <Heading as="h4" size="md" mb={4}>
      Recent Activity
    </Heading>
    <List spacing={3}>
      <ListItem>
        <ListIcon as={CheckCircleIcon} color="green.500" /> User JohnDoe registered
      </ListItem>
      <ListItem>
        <ListIcon as={CheckCircleIcon} color="green.500" /> Product "Acid X" added
      </ListItem>
      <ListItem>
        <ListIcon as={CheckCircleIcon} color="green.500" /> User JaneDoe upgraded to admin
      </ListItem>
    </List>
  </Box>
);

export default RecentActivity; 