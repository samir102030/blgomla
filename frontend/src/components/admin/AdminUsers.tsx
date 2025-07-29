import React, { useState, useEffect } from 'react';
import {
  Box,
  Flex,
  Heading,
  Button,
  Input,
  InputGroup,
  InputLeftElement,
  Checkbox,
  Text,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  useToast,
  Spinner,
  Alert,
  AlertIcon,
  Badge,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  CheckboxGroup,
  Stack,
  useDisclosure,
} from '@chakra-ui/react';
import { SearchIcon } from '@chakra-ui/icons';
import AdminProtectedRoute from './AdminProtectedRoute';
import { usersAPI } from '../../utils/api';
import { useSuperAdminAuth } from '../../hooks/useSuperAdminAuth';

import { User, useUserStore } from '../../stores/user.store';

const availablePermissions = [
  { value: 'dashboard', label: 'Dashboard' },
  { value: 'about', label: 'About Company' },
  { value: 'products', label: 'Products' },
  { value: 'industries', label: 'Industries' },
  { value: 'companies', label: 'Companies' },
  { value: 'events', label: 'Events' },
  { value: 'news', label: 'News' },
  { value: 'articles', label: 'Articles' },
  { value: 'customers', label: 'Customers' },
  { value: 'notifications', label: 'Notifications' },
  { value: 'admins', label: 'Admin Management' },
  { value: 'crm', label: 'CRM' },
  { value: 'quotes', label: 'Quotes' },
  { value: 'company-profile', label: 'Company Profile' },
];

const AdminUsers = () => {
  return (
    <AdminProtectedRoute>
      <AdminUsersMainView />
    </AdminProtectedRoute>
  );
};

const AdminUsersMainView = () => {
  const { user: currentUser, isLoading: authLoading, isSuperAdmin, hasAdminAccess } = useSuperAdminAuth();
  
  const [search, setSearch] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [isEditingPermissions, setIsEditingPermissions] = useState(false);
  const toast = useToast();
  const { isOpen, onOpen, onClose } = useDisclosure();

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [total, setTotal] = useState(0);
  const itemsPerPage = 20;

  useEffect(() => {
    if (hasAdminAccess) {
      const delayedSearch = setTimeout(() => {
        loadUsers();
      }, 300); // Debounce search by 300ms

      return () => clearTimeout(delayedSearch);
    }
  }, [search, currentPage, hasAdminAccess]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load all users (both admin and non-admin)
      const response = await usersAPI.getAll({
        page: currentPage,
        limit: itemsPerPage,
        search,
      });

      setUsers(response.users || []);
      setTotal(response.total || 0);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load users';
      console.error('Load users error:', err);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAdmin = async (user: User) => {
    if (user.isAdmin) {
      // Removing admin privileges
      if (!window.confirm(`Are you sure you want to remove admin privileges from ${user.email}?`)) {
        return;
      }

      try {
        await usersAPI.update(user._id, { 
          isAdmin: false,
          adminPermissions: []
        });
        toast({
          title: 'Success',
          description: 'Admin privileges removed successfully',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
        loadUsers();
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to remove admin privileges';
        toast({
          title: 'Error',
          description: errorMessage,
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      }
    } else {
      // Making user admin - open permissions modal
      setSelectedUser(user);
      setSelectedPermissions([]);
      setIsEditingPermissions(false);
      onOpen();
    }
  };

  const handleEditPermissions = (user: User) => {
    setSelectedUser(user);
    setSelectedPermissions(user.adminPermissions || []);
    setIsEditingPermissions(true);
    onOpen();
  };

  const handleAssignAdminWithPermissions = async () => {
    if (!selectedUser) return;

    try {
      const updateData = isEditingPermissions 
        ? { adminPermissions: selectedPermissions }
        : { isAdmin: true, adminPermissions: selectedPermissions };

      await usersAPI.update(selectedUser._id, updateData);
      
      const successMessage = isEditingPermissions 
        ? 'Admin permissions updated successfully'
        : 'Admin privileges assigned successfully';

      toast({
        title: 'Success',
        description: successMessage,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      
      // If the updated user is the current user, refresh their profile to update the store
      if (selectedUser._id === currentUser?._id) {
        // Get the updated user profile to refresh the store
        const { getProfile } = useUserStore.getState();
        await getProfile();
      }
      
      loadUsers();
      onClose();
      setSelectedUser(null);
      setSelectedPermissions([]);
      setIsEditingPermissions(false);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 
        (isEditingPermissions ? 'Failed to update admin permissions' : 'Failed to assign admin privileges');
      toast({
        title: 'Error',
        description: errorMessage,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  // Type-safe wrapper for CheckboxGroup onChange
  const handlePermissionChange = (value: (string | number)[]) => {
    setSelectedPermissions(value.filter((v): v is string => typeof v === 'string'));
  };

  if (authLoading || loading) {
    return (
      <Box p={12}>
        <Flex justify="center" align="center" h="400px">
          <Spinner size="xl" color="blue.500" />
        </Flex>
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={12}>
        <Alert status="error">
          <AlertIcon />
          {error}
        </Alert>
      </Box>
    );
  }

  return (
    <Box p={12}>
      <Heading fontFamily="IBM Plex Sans" fontWeight={500} fontSize="32px" color="#3F0209" mb={12} lineHeight="56px">
        Admin User Management
      </Heading>
      
      <Alert status="info" mb={6}>
        <AlertIcon />
        {isSuperAdmin 
          ? "You are the super admin and can manage all admin permissions." 
          : "You have admin management permissions and can manage admin users."}
      </Alert>



      {/* Search Bar */}
      <Box mb={16} w="340px">
        <InputGroup size="lg">
          <InputLeftElement pointerEvents="none">
            <SearchIcon color="#8D8D8D" boxSize={6} />
          </InputLeftElement>
          <Input
            placeholder="name, email, or company"
            value={search}
            onChange={e => setSearch(e.target.value)}
            fontFamily="IBM Plex Sans"
            fontSize="20px"
            color="#8D8D8D"
            bg="white"
            border="2px solid #BCBCBC"
            borderRadius="10px"
            h="72px"
            pl={12}
          />
        </InputGroup>
      </Box>
      
      {/* All Users Section */}
      <Box mb={16} w="full">
        <Flex align="center" justify="space-between" mb={8}>
          <Text fontFamily="IBM Plex Sans" fontWeight={600} fontSize="24px" color="rgba(0,0,0,0.9)">
            All Users
          </Text>
          <Text fontFamily="IBM Plex Sans" fontSize="18px" color="#8D8D8D">
            Total: {total} users
          </Text>
        </Flex>
        <Box bg="white" borderRadius="2xl" border="2px solid #EAEAEA" overflow="hidden" mb={8}>
          <Table variant="simple" sx={{ borderRadius: '16px' }}>
            <Thead bg="#F8F8F8">
              <Tr>
                <Th w="64px" color="#3F0209" borderColor="#EAEAEA" fontSize="20px" fontWeight={500} fontFamily="IBM Plex Sans"></Th>
                <Th color="#3F0209" borderColor="#EAEAEA" fontSize="20px" fontWeight={500} fontFamily="IBM Plex Sans">Name</Th>
                <Th color="#3F0209" borderColor="#EAEAEA" fontSize="20px" fontWeight={500} fontFamily="IBM Plex Sans">Email</Th>
                <Th color="#3F0209" borderColor="#EAEAEA" fontSize="20px" fontWeight={500} fontFamily="IBM Plex Sans">Company</Th>
                <Th color="#3F0209" borderColor="#EAEAEA" fontSize="20px" fontWeight={500} fontFamily="IBM Plex Sans">Status</Th>
                <Th color="#3F0209" borderColor="#EAEAEA" fontSize="20px" fontWeight={500} fontFamily="IBM Plex Sans">Role</Th>
                <Th w="200px" color="#3F0209" borderColor="#EAEAEA" fontSize="20px" fontWeight={500} fontFamily="IBM Plex Sans">Actions</Th>
              </Tr>
            </Thead>
            <Tbody>
              {users.length === 0 ? (
                <Tr>
                  <Td colSpan={7} textAlign="center" py={8}>
                    <Text fontSize="18px" color="#8D8D8D">No users found</Text>
                  </Td>
                </Tr>
              ) : (
                users.map((user) => (
                  <Tr key={user._id}>
                    <Td borderColor="#EAEAEA">
                      <Checkbox 
                        size="lg" 
                        colorScheme="red" 
                        borderColor="#BCBCBC"
                        isChecked={selectedUsers.includes(user._id)}
                        onChange={() => {
                          setSelectedUsers(prev => 
                            prev.includes(user._id) 
                              ? prev.filter(id => id !== user._id)
                              : [...prev, user._id]
                          );
                        }}
                      />
                    </Td>
                    <Td color="#717171" borderColor="#EAEAEA" fontSize="20px" fontFamily="IBM Plex Sans">{user.username || 'N/A'}</Td>
                    <Td color="#717171" borderColor="#EAEAEA" fontSize="20px" fontFamily="IBM Plex Sans">{user.email}</Td>
                    <Td color="#717171" borderColor="#EAEAEA" fontSize="20px" fontFamily="IBM Plex Sans">{user.companyName || 'N/A'}</Td>
                    <Td borderColor="#EAEAEA">
                      <Badge 
                        colorScheme={user.isApproved ? 'green' : user.approvalStatus === 'pending' ? 'orange' : 'gray'}
                        variant="subtle"
                        fontSize="12px"
                        px={2}
                        py={1}
                        borderRadius="md"
                      >
                        {user.isApproved ? 'Approved' : user.approvalStatus === 'pending' ? 'Pending' : 'Not Requested'}
                      </Badge>
                    </Td>
                    <Td borderColor="#EAEAEA">
                      <Badge 
                        colorScheme={user.email === 'admin@example.com' ? 'purple' : user.isAdmin ? 'red' : 'blue'}
                        variant="subtle"
                        fontSize="12px"
                        px={2}
                        py={1}
                        borderRadius="md"
                      >
                        {user.email === 'admin@example.com' ? 'Super Admin' : user.isAdmin ? 'Admin' : 'Customer'}
                      </Badge>
                    </Td>
                    <Td borderColor="#EAEAEA">
                      {user.email === 'admin@example.com' ? (
                        <Button 
                          bg="#CCCCCC"
                          color="#666666" 
                          borderRadius="lg" 
                          fontFamily="IBM Plex Sans" 
                          fontWeight={500} 
                          fontSize="14px" 
                          h="40px" 
                          w="full" 
                          isDisabled={true}
                          cursor="not-allowed"
                        >
                          Super Admin
                        </Button>
                      ) : (
                        <Flex gap={2} direction="column">
                          <Button 
                            bg={user.isAdmin ? "#B40519" : "#1aac35"}
                            color="white" 
                            borderRadius="lg" 
                            fontFamily="IBM Plex Sans" 
                            fontWeight={500} 
                            fontSize="14px" 
                            h="36px" 
                            w="full" 
                            _hover={{ bg: user.isAdmin ? '#9A0416' : '#168B2C' }} 
                            _active={{ bg: user.isAdmin ? '#7A0312' : '#126A23' }}
                            onClick={() => handleToggleAdmin(user)}
                          >
                            {user.isAdmin ? 'Remove Admin' : 'Make Admin'}
                          </Button>
                          {user.isAdmin && (
                            <Button 
                              bg="#2B6CB0"
                              color="white" 
                              borderRadius="lg" 
                              fontFamily="IBM Plex Sans" 
                              fontWeight={500} 
                              fontSize="14px" 
                              h="36px" 
                              w="full" 
                              _hover={{ bg: '#2C5282' }} 
                              _active={{ bg: '#2A4365' }}
                              onClick={() => handleEditPermissions(user)}
                            >
                              Edit Permissions
                            </Button>
                          )}
                        </Flex>
                      )}
                    </Td>
                  </Tr>
                ))
              )}
            </Tbody>
          </Table>
        </Box>
        
        {/* Pagination */}
        {total > 0 && (
          <Flex align="center" justify="space-between" h="40px" mt={2}>
            <Text fontFamily="IBM Plex Sans" fontSize="20px" color="#8D8D8D">
              Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, total)} of {total}
            </Text>
            <Flex gap={2}>
              {/* First page */}
              <Button 
                size="sm" 
                bg="#F8F8F8" 
                borderRadius="lg" 
                _hover={{ bg: '#E8E8E8' }} 
                _active={{ bg: '#D8D8D8' }}
                onClick={() => setCurrentPage(1)}
                isDisabled={currentPage === 1}
              >
                &#171;
              </Button>
              
              {/* Previous page */}
              <Button 
                size="sm" 
                bg="#F8F8F8" 
                borderRadius="lg" 
                _hover={{ bg: '#E8E8E8' }} 
                _active={{ bg: '#D8D8D8' }}
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                isDisabled={currentPage === 1}
              >
                &#60;
              </Button>

              {/* Page numbers */}
              {(() => {
                const totalPages = Math.ceil(total / itemsPerPage);
                const pages = [];
                const showPages = 5; // Show 5 page numbers
                
                let startPage = Math.max(1, currentPage - Math.floor(showPages / 2));
                let endPage = Math.min(totalPages, startPage + showPages - 1);
                
                // Adjust start if we're near the end
                if (endPage - startPage < showPages - 1) {
                  startPage = Math.max(1, endPage - showPages + 1);
                }
                
                for (let i = startPage; i <= endPage; i++) {
                  pages.push(
                    <Button
                      key={i}
                      size="sm"
                      bg={i === currentPage ? "#B40519" : "#F8F8F8"}
                      color={i === currentPage ? "white" : "#333"}
                      borderRadius="lg"
                      _hover={{ 
                        bg: i === currentPage ? '#9A0416' : '#E8E8E8' 
                      }}
                      _active={{ 
                        bg: i === currentPage ? '#7A0312' : '#D8D8D8' 
                      }}
                      onClick={() => setCurrentPage(i)}
                      minW="32px"
                    >
                      {i}
                    </Button>
                  );
                }
                return pages;
              })()}

              {/* Next page */}
              <Button 
                size="sm" 
                bg="#F8F8F8" 
                borderRadius="lg" 
                _hover={{ bg: '#E8E8E8' }} 
                _active={{ bg: '#D8D8D8' }}
                onClick={() => setCurrentPage(prev => Math.min(Math.ceil(total / itemsPerPage), prev + 1))}
                isDisabled={currentPage >= Math.ceil(total / itemsPerPage)}
              >
                &#62;
              </Button>

              {/* Last page */}
              <Button 
                size="sm" 
                bg="#F8F8F8" 
                borderRadius="lg" 
                _hover={{ bg: '#E8E8E8' }} 
                _active={{ bg: '#D8D8D8' }}
                onClick={() => setCurrentPage(Math.ceil(total / itemsPerPage))}
                isDisabled={currentPage >= Math.ceil(total / itemsPerPage)}
              >
                &#187;
              </Button>
            </Flex>
          </Flex>
        )}
      </Box>

      {/* Admin Permissions Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader fontFamily="IBM Plex Sans" fontSize="24px" color="#3F0209">
            {isEditingPermissions ? 'Edit Admin Permissions' : 'Assign Admin Permissions'}
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Text mb={4} fontFamily="IBM Plex Sans" fontSize="18px" color="#717171">
              Select which admin pages {selectedUser?.email} can access:
            </Text>
            <CheckboxGroup value={selectedPermissions} onChange={handlePermissionChange}>
              <Stack spacing={3}>
                {availablePermissions.map((permission) => (
                  <Checkbox 
                    key={permission.value} 
                    value={permission.value}
                    colorScheme="red"
                    fontFamily="IBM Plex Sans"
                    fontSize="16px"
                  >
                    {permission.label}
                  </Checkbox>
                ))}
              </Stack>
            </CheckboxGroup>
          </ModalBody>
          <ModalFooter>
            <Button
              bg="#CCCCCC"
              color="#666666"
              mr={3}
              onClick={() => {
                onClose();
                setIsEditingPermissions(false);
                setSelectedUser(null);
                setSelectedPermissions([]);
              }}
              fontFamily="IBM Plex Sans"
            >
              Cancel
            </Button>
            <Button
              bg="#B40519"
              color="white"
              onClick={handleAssignAdminWithPermissions}
              isDisabled={selectedPermissions.length === 0}
              _hover={{ bg: '#9A0416' }}
              _active={{ bg: '#7A0312' }}
              fontFamily="IBM Plex Sans"
            >
              {isEditingPermissions ? 'Update Permissions' : 'Assign Admin Role'}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default AdminUsers; 