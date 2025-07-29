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
} from '@chakra-ui/react';
import { SearchIcon } from '@chakra-ui/icons';
import AdminProtectedRoute from './AdminProtectedRoute';
import { usersAPI } from '../../utils/api';

interface Customer {
  _id: string;
  username: string;
  email: string;
  companyName: string;
  phoneNumber: string;
  isApproved: boolean;
  approvalStatus: 'not requested' | 'pending' | 'approved' | 'rejected';
  approvalRequestedAt?: Date;
  createdAt: string;
}

const columnWidths = ["152.67px", "152.67px", "152.67px", "152.67px", "152.67px", "152.67px"];

const AdminCustomers = () => {
  return (
    <AdminProtectedRoute>
      <AdminCustomersMainView />
    </AdminProtectedRoute>
  );
};

const AdminCustomersMainView = () => {
  const [search, setSearch] = useState('');
  const [approvedCustomers, setApprovedCustomers] = useState<Customer[]>([]);
  const [pendingCustomers, setPendingCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedApproved, setSelectedApproved] = useState<string[]>([]);
  const [selectedPending, setSelectedPending] = useState<string[]>([]);
  const toast = useToast();

  // Pagination states
  const [approvedPage, setApprovedPage] = useState(1);
  const [pendingPage, setPendingPage] = useState(1);
  const [approvedTotal, setApprovedTotal] = useState(0);
  const [pendingTotal, setPendingTotal] = useState(0);
  const itemsPerPage = 20;

  useEffect(() => {
    const delayedSearch = setTimeout(() => {
      loadCustomers();
    }, 300); // Debounce search by 300ms

    return () => clearTimeout(delayedSearch);
  }, [search, approvedPage, pendingPage]);

  const loadCustomers = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load approved customers
      const approvedResponse = await usersAPI.getAll({
        page: approvedPage,
        limit: itemsPerPage,
        search,
        isApproved: 'true', // Match dashboard widget filtering
        isAdmin: 'false' // Exclude admin users (string for backend)
      });

      // Load pending customers (only those who have requested approval)
      const pendingResponse = await usersAPI.getAll({
        page: pendingPage,
        limit: itemsPerPage,
        search,
        approvalStatus: 'pending', // Only get users who have requested approval
        isAdmin: 'false' // Exclude admin users (string for backend)
      });

      setApprovedCustomers(approvedResponse.users || []);
      setPendingCustomers(pendingResponse.users || []);
      setApprovedTotal(approvedResponse.total || 0);
      setPendingTotal(pendingResponse.total || 0);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load customers';
      console.error('Load customers error:', err);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveCustomer = async (customerId: string) => {
    try {
      await usersAPI.approve(customerId);
      toast({
        title: 'Success',
        description: 'Customer approved successfully',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      loadCustomers(); // Reload data
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to approve customer';
      toast({
        title: 'Error',
        description: errorMessage,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const handleRemoveCustomer = async (customerId: string) => {
    if (!window.confirm('Are you sure you want to unapprove this customer? They will be moved back to awaiting approval.')) {
      return;
    }

    try {
      await usersAPI.reject(customerId);
      toast({
        title: 'Success',
        description: 'Customer unapproved successfully - moved to awaiting approval',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      loadCustomers(); // Reload data
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to unapprove customer';
      toast({
        title: 'Error',
        description: errorMessage,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  if (loading) {
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
        Customers
      </Heading>
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
      {/* Approved Customers Section */}
      <Box mb={16} w="full">
        <Flex align="center" justify="space-between" mb={8}>
          <Text fontFamily="IBM Plex Sans" fontWeight={600} fontSize="24px" color="rgba(0,0,0,0.9)">
            Approved Customers
          </Text>
        </Flex>
        <Box bg="white" borderRadius="2xl" border="2px solid #EAEAEA" overflowX="auto" mb={8}>
          <Table variant="simple" sx={{ borderRadius: '16px', minWidth: '900px' }}>
            <Thead bg="#F8F8F8">
              <Tr>
                <Th w="64px" color="#3F0209" borderColor="#EAEAEA" fontSize="20px" fontWeight={500} fontFamily="IBM Plex Sans"></Th>
                <Th color="#3F0209" borderColor="#EAEAEA" fontSize="20px" fontWeight={500} fontFamily="IBM Plex Sans">Customer Name</Th>
                <Th color="#3F0209" borderColor="#EAEAEA" fontSize="20px" fontWeight={500} fontFamily="IBM Plex Sans">Company</Th>
                <Th color="#3F0209" borderColor="#EAEAEA" fontSize="20px" fontWeight={500} fontFamily="IBM Plex Sans">Email</Th>
                <Th color="#3F0209" borderColor="#EAEAEA" fontSize="20px" fontWeight={500} fontFamily="IBM Plex Sans">Phone Number</Th>
                <Th color="#3F0209" borderColor="#EAEAEA" fontSize="20px" fontWeight={500} fontFamily="IBM Plex Sans">Country</Th>
                <Th w="152.67px" color="#3F0209" borderColor="#EAEAEA" fontSize="20px" fontWeight={500} fontFamily="IBM Plex Sans">Unapprove</Th>
              </Tr>
            </Thead>
            <Tbody>
              {approvedCustomers.length === 0 ? (
                <Tr>
                  <Td colSpan={7} textAlign="center" py={8}>
                    <Text fontSize="18px" color="#8D8D8D">No approved customers found</Text>
                  </Td>
                </Tr>
              ) : (
                approvedCustomers.map((customer) => (
                  <Tr key={customer._id}>
                    <Td borderColor="#EAEAEA">
                      <Checkbox 
                        size="lg" 
                        colorScheme="red" 
                        borderColor="#BCBCBC"
                        isChecked={selectedApproved.includes(customer._id)}
                        onChange={() => {
                          setSelectedApproved(prev => 
                            prev.includes(customer._id) 
                              ? prev.filter(id => id !== customer._id)
                              : [...prev, customer._id]
                          );
                        }}
                      />
                    </Td>
                    <Td color="#717171" borderColor="#EAEAEA" fontSize="20px" fontFamily="IBM Plex Sans">{customer.username || 'N/A'}</Td>
                    <Td color="#717171" borderColor="#EAEAEA" fontSize="20px" fontFamily="IBM Plex Sans">{customer.companyName || 'N/A'}</Td>
                    <Td color="#717171" borderColor="#EAEAEA" fontSize="20px" fontFamily="IBM Plex Sans">{customer.email}</Td>
                    <Td color="#717171" borderColor="#EAEAEA" fontSize="20px" fontFamily="IBM Plex Sans">{customer.phoneNumber || 'N/A'}</Td>
                    <Td color="#717171" borderColor="#EAEAEA" fontSize="20px" fontFamily="IBM Plex Sans">Egypt</Td>
                    <Td borderColor="#EAEAEA">
                      <Button 
                        bg="#B40519" 
                        color="white" 
                        borderRadius="lg" 
                        fontFamily="IBM Plex Sans" 
                        fontWeight={500} 
                        fontSize="20px" 
                        h="48px" 
                        w="full" 
                        _hover={{ bg: '#9A0416' }} 
                        _active={{ bg: '#7A0312' }}
                        onClick={() => handleRemoveCustomer(customer._id)}
                      >
                        Unapprove
                      </Button>
                    </Td>
                  </Tr>
                ))
              )}
            </Tbody>
          </Table>
        </Box>
        {/* Pagination */}
        {approvedTotal > 0 && (
        <Flex align="center" justify="space-between" h="40px" mt={2}>
            <Text fontFamily="IBM Plex Sans" fontSize="20px" color="#8D8D8D">
              Showing {((approvedPage - 1) * itemsPerPage) + 1} to {Math.min(approvedPage * itemsPerPage, approvedTotal)} of {approvedTotal}
            </Text>
            <Flex gap={2}>
              {/* First page */}
              <Button 
                size="sm" 
                bg="#F8F8F8" 
                borderRadius="lg" 
                _hover={{ bg: '#E8E8E8' }} 
                _active={{ bg: '#D8D8D8' }}
                onClick={() => setApprovedPage(1)}
                isDisabled={approvedPage === 1}
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
                onClick={() => setApprovedPage(prev => Math.max(1, prev - 1))}
                isDisabled={approvedPage === 1}
              >
                &#60;
              </Button>

              {/* Page numbers */}
              {(() => {
                const totalPages = Math.ceil(approvedTotal / itemsPerPage);
                const pages = [];
                const showPages = 5; // Show 5 page numbers
                
                let startPage = Math.max(1, approvedPage - Math.floor(showPages / 2));
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
                      bg={i === approvedPage ? "#B40519" : "#F8F8F8"}
                      color={i === approvedPage ? "white" : "#333"}
                      borderRadius="lg"
                      _hover={{ 
                        bg: i === approvedPage ? '#9A0416' : '#E8E8E8' 
                      }}
                      _active={{ 
                        bg: i === approvedPage ? '#7A0312' : '#D8D8D8' 
                      }}
                      onClick={() => setApprovedPage(i)}
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
                onClick={() => setApprovedPage(prev => Math.min(Math.ceil(approvedTotal / itemsPerPage), prev + 1))}
                isDisabled={approvedPage >= Math.ceil(approvedTotal / itemsPerPage)}
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
                onClick={() => setApprovedPage(Math.ceil(approvedTotal / itemsPerPage))}
                isDisabled={approvedPage >= Math.ceil(approvedTotal / itemsPerPage)}
              >
                &#187;
              </Button>
            </Flex>
          </Flex>
        )}
      </Box>
      {/* Customers Asked for Approval Section */}
      <Box mb={16} w="full">
        <Flex align="center" justify="space-between" mb={8}>
          <Text fontFamily="IBM Plex Sans" fontWeight={600} fontSize="24px" color="rgba(0,0,0,0.9)">
            Customers Awaiting Approval
          </Text>
        </Flex>
        <Box bg="white" borderRadius="2xl" border="2px solid #EAEAEA" overflowX="auto" mb={8}>
          <Table variant="simple" sx={{ borderRadius: '16px', minWidth: '900px' }}>
            <Thead bg="#F8F8F8">
              <Tr>
                <Th w="64px" color="#3F0209" borderColor="#EAEAEA" fontSize="20px" fontWeight={500} fontFamily="IBM Plex Sans"></Th>
                <Th color="#3F0209" borderColor="#EAEAEA" fontSize="20px" fontWeight={500} fontFamily="IBM Plex Sans">Customer Name</Th>
                <Th color="#3F0209" borderColor="#EAEAEA" fontSize="20px" fontWeight={500} fontFamily="IBM Plex Sans">Company</Th>
                <Th color="#3F0209" borderColor="#EAEAEA" fontSize="20px" fontWeight={500} fontFamily="IBM Plex Sans">Email</Th>
                <Th color="#3F0209" borderColor="#EAEAEA" fontSize="20px" fontWeight={500} fontFamily="IBM Plex Sans">Phone Number</Th>
                <Th color="#3F0209" borderColor="#EAEAEA" fontSize="20px" fontWeight={500} fontFamily="IBM Plex Sans">Country</Th>
                <Th w="152.67px" color="#3F0209" borderColor="#EAEAEA" fontSize="20px" fontWeight={500} fontFamily="IBM Plex Sans">Approve</Th>
              </Tr>
            </Thead>
            <Tbody>
              {pendingCustomers.length === 0 ? (
                <Tr>
                  <Td colSpan={7} textAlign="center" py={8}>
                    <Text fontSize="18px" color="#8D8D8D">No customers awaiting approval found</Text>
                  </Td>
                </Tr>
              ) : (
                pendingCustomers.map((customer) => (
                  <Tr key={customer._id}>
                    <Td borderColor="#EAEAEA">
                      <Checkbox 
                        size="lg" 
                        colorScheme="red" 
                        borderColor="#BCBCBC"
                        isChecked={selectedPending.includes(customer._id)}
                        onChange={() => {
                          setSelectedPending(prev => 
                            prev.includes(customer._id) 
                              ? prev.filter(id => id !== customer._id)
                              : [...prev, customer._id]
                          );
                        }}
                      />
                    </Td>
                    <Td color="#717171" borderColor="#EAEAEA" fontSize="20px" fontFamily="IBM Plex Sans">{customer.username || 'N/A'}</Td>
                    <Td color="#717171" borderColor="#EAEAEA" fontSize="20px" fontFamily="IBM Plex Sans">{customer.companyName || 'N/A'}</Td>
                    <Td color="#717171" borderColor="#EAEAEA" fontSize="20px" fontFamily="IBM Plex Sans">{customer.email}</Td>
                    <Td color="#717171" borderColor="#EAEAEA" fontSize="20px" fontFamily="IBM Plex Sans">{customer.phoneNumber || 'N/A'}</Td>
                    <Td color="#717171" borderColor="#EAEAEA" fontSize="20px" fontFamily="IBM Plex Sans">Egypt</Td>
                    <Td borderColor="#EAEAEA">
                      <Button 
                        bg="#1aac35" 
                        color="white" 
                        borderRadius="lg" 
                        fontFamily="IBM Plex Sans" 
                        fontWeight={500} 
                        fontSize="20px" 
                        h="48px" 
                        w="full" 
                        _hover={{ bg: '#168B2C' }} 
                        _active={{ bg: '#126A23' }}
                        onClick={() => handleApproveCustomer(customer._id)}
                      >
                        Approve
                      </Button>
                    </Td>
                  </Tr>
                ))
              )}
            </Tbody>
          </Table>
        </Box>
        {/* Pagination */}
        {pendingTotal > 0 && (
        <Flex align="center" justify="space-between" h="40px" mt={2}>
            <Text fontFamily="IBM Plex Sans" fontSize="20px" color="#8D8D8D">
              Showing {((pendingPage - 1) * itemsPerPage) + 1} to {Math.min(pendingPage * itemsPerPage, pendingTotal)} of {pendingTotal}
            </Text>
            <Flex gap={2}>
              {/* First page */}
              <Button 
                size="sm" 
                bg="#F8F8F8" 
                borderRadius="lg" 
                _hover={{ bg: '#E8E8E8' }} 
                _active={{ bg: '#D8D8D8' }}
                onClick={() => setPendingPage(1)}
                isDisabled={pendingPage === 1}
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
                onClick={() => setPendingPage(prev => Math.max(1, prev - 1))}
                isDisabled={pendingPage === 1}
              >
                &#60;
              </Button>

              {/* Page numbers */}
              {(() => {
                const totalPages = Math.ceil(pendingTotal / itemsPerPage);
                const pages = [];
                const showPages = 5; // Show 5 page numbers
                
                let startPage = Math.max(1, pendingPage - Math.floor(showPages / 2));
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
                      bg={i === pendingPage ? "#B40519" : "#F8F8F8"}
                      color={i === pendingPage ? "white" : "#333"}
                      borderRadius="lg"
                      _hover={{ 
                        bg: i === pendingPage ? '#9A0416' : '#E8E8E8' 
                      }}
                      _active={{ 
                        bg: i === pendingPage ? '#7A0312' : '#D8D8D8' 
                      }}
                      onClick={() => setPendingPage(i)}
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
                onClick={() => setPendingPage(prev => Math.min(Math.ceil(pendingTotal / itemsPerPage), prev + 1))}
                isDisabled={pendingPage >= Math.ceil(pendingTotal / itemsPerPage)}
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
                onClick={() => setPendingPage(Math.ceil(pendingTotal / itemsPerPage))}
                isDisabled={pendingPage >= Math.ceil(pendingTotal / itemsPerPage)}
              >
                &#187;
              </Button>
            </Flex>
          </Flex>
        )}
      </Box>
    </Box>
  );
};

export default AdminCustomers; 