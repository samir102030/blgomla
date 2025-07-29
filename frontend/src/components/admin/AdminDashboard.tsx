import { Box, SimpleGrid, Flex, Text, HStack, Avatar, Menu, MenuButton, MenuList, MenuItem, useBreakpointValue, Badge } from '@chakra-ui/react';
import { CalendarIcon, ChevronDownIcon } from '@chakra-ui/icons';
import AdminProtectedRoute from './AdminProtectedRoute';
import ApprovedCustomer from './widgets/ApprovedCustomer';
import NotApprovedCustomer from './widgets/NotApprovedCustomer';
import TotalSales from './widgets/TotalSales';
import CompletedOrders from './widgets/CompletedOrders';
import PendingOrders from './widgets/PendingOrders';
import CanceledOrders from './widgets/CanceledOrders';
import SalesChart from './widgets/SalesChart';
import VisitsReport from './widgets/VisitsReport';
import TopViewProduct from './widgets/TopViewProduct';
import OrdersChart from './widgets/OrdersChart';
import SalesTransaction from './widgets/SalesTransaction';

const AdminDashboard = () => {
  // Get user info from localStorage for display
  const storedUser = localStorage.getItem('user');
  const user = storedUser ? JSON.parse(storedUser) : null;
  
  // Responsive padding for main content
  const contentPadding = useBreakpointValue({ base: 2, md: 8 });

  return (
    <AdminProtectedRoute>
      <Box px={contentPadding} py={10}>
        {/* Header */}
        <Flex align="center" justify="space-between" mb={10}>
          <Box>
            <Text fontSize={{ base: '2xl', md: '40px' }} fontWeight={600} color="#3F0209" lineHeight="56px">Dashboard</Text>
            <HStack spacing={2} mt={2}>
              <CalendarIcon color="#B40519" w={5} h={5} />
              <Text fontSize="20px" color="#8D8D8D" fontWeight={500}>7/4/2024</Text>
            </HStack>
          </Box>
          <Menu>
            <MenuButton>
              <HStack spacing={4} bg="#fff" px={5} py={3} borderRadius="2xl" boxShadow="0 2px 8px rgba(31,31,31,0.08)">
                <Avatar size="md" name={user?.email || "Admin User"} src="/images/admin/image.png" />
                <Box textAlign="left">
                  <HStack>
                    <Text fontWeight={600} fontSize="20px" color="#3F0209">
                      {user?.email || "Admin User"}
                    </Text>
                    {user?.isAdmin && (
                      <Badge colorScheme="green" size="sm">ADMIN</Badge>
                    )}
                  </HStack>
                  <Text fontSize="16px" color="#8D8D8D">
                    {user?.isAdmin ? 'Administrator' : 'User'}
                  </Text>
                </Box>
                <ChevronDownIcon color="#B40519" w={6} h={6} />
              </HStack>
            </MenuButton>
            <MenuList fontFamily="IBM Plex Sans, sans-serif">
              <MenuItem>Profile</MenuItem>
              <MenuItem>Settings</MenuItem>
              <MenuItem>Logout</MenuItem>
            </MenuList>
          </Menu>
        </Flex>

        {/* First Row - Approved/Not Approved Customers */}
        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={8} mb={8}>
          <ApprovedCustomer />
          <NotApprovedCustomer />
        </SimpleGrid>

        {/* Second Row - Metric Cards */}
        <SimpleGrid columns={{ base: 1, sm: 2, md: 4 }} spacing={8} mb={10}>
          <TotalSales />
          <CompletedOrders />
          <PendingOrders />
          <CanceledOrders />
        </SimpleGrid>

        {/* Sales Chart - Full Width Row */}
        <Box mb={8}>
          <SalesChart />
        </Box>

        {/* Visits Report + Top View Product Row */}
        <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={8} mb={8}>
          <VisitsReport />
          <TopViewProduct />
        </SimpleGrid>

        {/* Orders Chart + Sales Transaction Row */}
        <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={8}>
          <OrdersChart />
          <SalesTransaction />
        </SimpleGrid>
      </Box>
    </AdminProtectedRoute>
  );
};

export default AdminDashboard; 