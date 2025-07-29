import React from 'react';
import { Box, Flex, Spinner, Text } from '@chakra-ui/react';
import Navbar from '../layout/Navbar';
import AdminSidebar from './AdminSidebar';
import { useAdminAuth } from '../../hooks/useAdminAuth';

interface AdminProtectedRouteProps {
  children: React.ReactNode;
}

const AdminProtectedRoute: React.FC<AdminProtectedRouteProps> = ({ children }) => {
  const { isLoading, isAdmin } = useAdminAuth();

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <Box className="admin-layout" minH="100vh" bg="#F8F9FA" position="relative">
        <Box 
          className="admin-sticky-navbar"
          position="sticky" 
          top={0} 
          zIndex={1000} 
          bg="#F8F9FA"
          borderBottom="2px solid"
          borderColor="red.500"
        >
          <Navbar isSticky={false} />
        </Box>
        <Flex minH="calc(100vh - 80px)">
          <Box 
            className="admin-sticky-sidebar"
            position="sticky" 
            left={0} 
            top={0} 
            zIndex={999} 
            bg="#F8F9FA"
            borderRight="2px solid"
            borderColor="blue.500"
          >
            <AdminSidebar />
          </Box>
          <Box flex={1} display="flex" alignItems="center" justifyContent="center">
            <Spinner size="xl" color="#B40519" />
          </Box>
        </Flex>
      </Box>
    );
  }

  // If not admin, don't render (useAdminAuth will handle redirect)
  if (!isAdmin) {
    return (
      <Box className="admin-layout" minH="100vh" bg="#F8F9FA" position="relative">
        <Box 
          className="admin-sticky-navbar"
          position="sticky" 
          top={0} 
          zIndex={1000} 
          bg="#F8F9FA"
          borderBottom="2px solid"
          borderColor="red.500"
        >
          <Navbar isSticky={false} />
        </Box>
        <Flex minH="calc(100vh - 80px)">
          <Box 
            className="admin-sticky-sidebar"
            position="sticky" 
            left={0} 
            top={0} 
            zIndex={999} 
            bg="#F8F9FA"
            borderRight="2px solid"
            borderColor="blue.500"
          >
            <AdminSidebar />
          </Box>
          <Box flex={1} display="flex" alignItems="center" justifyContent="center">
            <Text>Access denied. Redirecting...</Text>
          </Box>
        </Flex>
      </Box>
    );
  }

  // Render the protected content with layout
  return (
    <Box className="admin-layout" minH="100vh" bg="#F8F9FA" position="relative">
      {/* Sticky Navbar - both horizontally and vertically */}
      <Box 
        className="admin-sticky-navbar"
        position="sticky" 
        top={0} 
        zIndex={1000} 
        bg="#F8F9FA"
        borderBottom="2px solid"
        borderColor="red.500"
      >
        <Navbar isSticky={false} />
      </Box>
      
      {/* Main content area with sticky sidebar */}
      <Flex minH="calc(100vh - 80px)">
        {/* Sticky Sidebar - both horizontally and vertically */}
        <Box 
          className="admin-sticky-sidebar"
          position="sticky" 
          left={0} 
          top={0} 
          zIndex={999} 
          bg="#F8F9FA"
          borderRight="2px solid"
          borderColor="blue.500"
        >
          <AdminSidebar />
        </Box>
        
        {/* Scrollable content area */}
        <Box flex={1} bg="#F8F9FA" minW="0" p={4}>
          {children}
        </Box>
      </Flex>
    </Box>
  );
};

export default AdminProtectedRoute; 