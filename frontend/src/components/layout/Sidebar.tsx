import { Box, VStack, Link, Text } from '@chakra-ui/react';
import { Link as RouterLink, useLocation } from 'react-router-dom';

export interface SidebarItem {
  label: string;
  path: string;
}

interface SidebarProps {
  items: SidebarItem[];
}

const Sidebar = ({ items }: SidebarProps) => {
  const location = useLocation();
  
  const isActiveRoute = (itemPath: string) => {
    // Exact match for root paths to avoid conflicts
    if (itemPath === '/admin') {
      return location.pathname === '/admin';
    }
    // For other paths, check if current path starts with the item path
    return location.pathname.startsWith(itemPath);
  };
  
  return (
    <Box
      as="nav"
      w={{ base: 'full', md: 64 }}
      minH="100vh"
      bg="white"
      boxShadow="md"
      p={6}
      position="sticky"
      top={0}
    >
      <VStack align="stretch" spacing={4}>
        {items.map((item) => (
          <Link
            as={RouterLink}
            to={item.path}
            key={item.path}
            fontWeight={isActiveRoute(item.path) ? 'bold' : 'normal'}
            color={isActiveRoute(item.path) ? 'white' : 'gray.700'}
            _hover={{ 
              color: isActiveRoute(item.path) ? 'white' : 'red.600',
              bg: isActiveRoute(item.path) ? '#8B0000' : 'transparent',
              transform: 'scale(1.05)',
              boxShadow: isActiveRoute(item.path) ? '0 4px 12px rgba(180, 5, 25, 0.4)' : '0 2px 8px rgba(180, 5, 25, 0.2)',
              textDecoration: 'none' 
            }}
            px={2}
            py={2}
            borderRadius="md"
            bg={isActiveRoute(item.path) ? '#B40519' : 'transparent'}
            transition="all 0.3s ease"
          >
            <Text>{item.label}</Text>
          </Link>
        ))}
      </VStack>
    </Box>
  );
};

export default Sidebar; 