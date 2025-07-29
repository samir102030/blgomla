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
  Image,
  IconButton,
  HStack,
  Text,
  useToast,
  Spinner,
  Alert,
  AlertIcon,
} from '@chakra-ui/react';
import { SearchIcon, AddIcon, ViewIcon, EditIcon, DeleteIcon, ChevronLeftIcon, ChevronRightIcon } from '@chakra-ui/icons';
import AdminProtectedRoute from './AdminProtectedRoute';
import AdminAddEvent from './AdminAddEvent';
import AdminEditEvent from './AdminEditEvent';
import AdminEventDetailsModal from './AdminEventDetailsModal';
import { useNavigate, Routes, Route } from 'react-router-dom';
import { eventsAPI } from '../../utils/api';

interface EventItem {
  _id: string;
  title: string;
  description: string;
  mainImage: string;
  date: string;
  location: string;
  createdAt: string;
  updatedAt: string;
}

const AdminEventsList = () => {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const navigate = useNavigate();
  const toast = useToast();

  // Fetch events from API
  const fetchEvents = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = {
        page,
        limit: 4,
        ...(search && { search }),
      };
      const response = await eventsAPI.getAll(params);
      setEvents(response.events || []);
      setTotalPages(response.totalPages || 1);
      setTotal(response.total || 0);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch events';
      setError(errorMessage);
      console.error('Error fetching events:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [page, search]);

  // Search with debounce
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (page !== 1) {
        setPage(1);
      } else {
        fetchEvents();
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [search]);

  const handleViewEvent = async (eventId: string) => {
    try {
      const event = await eventsAPI.getById(eventId);
      setSelectedEvent(event);
      setIsModalOpen(true);
    } catch (err: unknown) {
      toast({
        title: 'Error',
        description: 'Failed to fetch event details',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedEvent(null);
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (window.confirm('Are you sure you want to delete this event?')) {
      try {
        await eventsAPI.delete(eventId);
        toast({
          title: 'Success',
          description: 'Event deleted successfully',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
        fetchEvents(); // Refresh the list
      } catch (err: unknown) {
        toast({
          title: 'Error',
          description: 'Failed to delete event',
          status: 'error',
          duration: 3000,
          isClosable: true,
        });
      }
    }
  };

  const handleSelectItem = (eventId: string) => {
    setSelectedItems(prev => 
      prev.includes(eventId) 
        ? prev.filter(id => id !== eventId)
        : [...prev, eventId]
    );
  };

  const handleSelectAll = () => {
    if (selectedItems.length === events.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(events.map(event => event._id));
    }
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  if (loading && events.length === 0) {
    return (
      <Box px={10} pt={10}>
        <Flex justify="center" align="center" h="400px">
          <Spinner size="xl" color="#B40519" />
        </Flex>
      </Box>
    );
  }

  return (
    <Box px={10} pt={10}>
      <Heading fontFamily="IBM Plex Sans" fontWeight={500} fontSize="32px" color="#3F0209" mb={12} lineHeight="56px">
        Events
      </Heading>

      {error && (
        <Alert status="error" mb={6}>
          <AlertIcon />
          {error}
        </Alert>
      )}

      <Flex justify="space-between" align="center" mb={8}>
        <Button
          leftIcon={<AddIcon boxSize={6} color="#B40519" />}
          variant="outline"
          borderColor="#B40519"
          color="#B40519"
          fontFamily="IBM Plex Sans"
          fontWeight={500}
          fontSize="24px"
          borderRadius="lg"
          px={6}
          py={2.5}
          h="56px"
          _hover={{ bg: '#F8E6E8' }}
          onClick={() => navigate('/admin/events/add')}
        >
          Add Event
        </Button>
        <InputGroup w="340px" h="56px" bg="#F8F8F8" borderRadius="lg" border="2px solid #BCBCBC">
          <InputLeftElement pointerEvents="none">
            <SearchIcon color="#8D8D8D" boxSize={8} />
          </InputLeftElement>
          <Input
            placeholder="Search events..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            fontFamily="IBM Plex Sans"
            fontSize="24px"
            color="#8D8D8D"
            border="none"
            bg="transparent"
            h="56px"
            _placeholder={{ color: '#8D8D8D' }}
          />
        </InputGroup>
      </Flex>

      <Box bg="white" borderRadius="2xl" border="2px solid #EAEAEA" boxShadow="sm" p={0}>
        {/* Table Header */}
        <Box bg="#F8F8F8" borderTopLeftRadius="12px" borderTopRightRadius="12px" px={6} py={8}>
          <Flex align="center" gap={0}>
            <Box w="64px" display="flex" justifyContent="center">
              <Checkbox 
                size="lg" 
                colorScheme="red" 
                borderColor="#BCBCBC" 
                isChecked={selectedItems.length === events.length && events.length > 0}
                isIndeterminate={selectedItems.length > 0 && selectedItems.length < events.length}
                onChange={handleSelectAll}
              />
            </Box>
            <Box w="80px" textAlign="left"><Text fontFamily="IBM Plex Sans" fontSize="20px" fontWeight={500} color="#3F0209">Image</Text></Box>
            <Box flex="1" minW="180px"><Text fontFamily="IBM Plex Sans" fontSize="20px" fontWeight={500} color="#3F0209">Event Name</Text></Box>
            <Box flex="1" minW="180px"><Text fontFamily="IBM Plex Sans" fontSize="20px" fontWeight={500} color="#3F0209">Content</Text></Box>
            <Box flex="1" minW="180px"><Text fontFamily="IBM Plex Sans" fontSize="20px" fontWeight={500} color="#3F0209">Date</Text></Box>
            <Box w="160px"><Text fontFamily="IBM Plex Sans" fontSize="20px" fontWeight={500} color="#3F0209">Action</Text></Box>
          </Flex>
        </Box>

        {/* Table Rows */}
        {loading ? (
          <Box p={8} textAlign="center">
            <Spinner color="#B40519" />
            <Text mt={2} fontFamily="IBM Plex Sans" color="#8D8D8D">Loading events...</Text>
          </Box>
        ) : events.length === 0 ? (
          <Box p={8} textAlign="center">
            <Text fontFamily="IBM Plex Sans" fontSize="20px" color="#8D8D8D">
              {search ? 'No events found matching your search.' : 'No events available.'}
            </Text>
          </Box>
        ) : (
          events.map((event, index) => (
            <Box key={event._id} borderBottom={index === events.length - 1 ? 'none' : '2px solid #EAEAEA'} px={6} py={8}>
              <Flex align="center" gap={0}>
                <Box w="64px" display="flex" justifyContent="center">
                  <Checkbox 
                    size="lg" 
                    colorScheme="red" 
                    borderColor="#BCBCBC" 
                    isChecked={selectedItems.includes(event._id)}
                    onChange={() => handleSelectItem(event._id)}
                  />
                </Box>
                <Box w="80px" display="flex" alignItems="center" justifyContent="center">
                  <Image 
                    src={event.mainImage || '/images/admin/image.png'} 
                    alt={event.title} 
                    w="64px" 
                    h="40px" 
                    objectFit="cover" 
                    borderRadius="lg" 
                    fallbackSrc="/images/admin/image.png"
                  />
                </Box>
                <Box flex="1" minW="180px">
                  <Text fontFamily="IBM Plex Sans" fontSize="20px" color="#717171" noOfLines={1}>
                    {event.title}
                  </Text>
                </Box>
                <Box flex="1" minW="180px">
                  <Text fontFamily="IBM Plex Sans" fontSize="20px" color="#717171" noOfLines={1}>
                    {event.description ? event.description.replace(/<[^>]+>/g, '').substring(0, 50) + '...' : 'No content'}
                  </Text>
                </Box>
                <Box flex="1" minW="180px">
                  <Text fontFamily="IBM Plex Sans" fontSize="20px" color="#717171">
                    {formatDate(event.date)}
                  </Text>
                </Box>
                <Box w="160px">
                  <HStack spacing={4}>
                    <IconButton 
                      aria-label="View" 
                      icon={<ViewIcon />} 
                      size="lg" 
                      variant="ghost" 
                      color="#8D8D8D" 
                      _hover={{ color: '#B40519' }} 
                      onClick={() => handleViewEvent(event._id)}
                    />
                    <IconButton 
                      aria-label="Edit" 
                      icon={<EditIcon />} 
                      size="lg" 
                      variant="ghost" 
                      color="#8D8D8D" 
                      _hover={{ color: '#B40519' }} 
                      onClick={() => navigate(`/admin/events/${event._id}/edit`)} 
                    />
                    <IconButton 
                      aria-label="Delete" 
                      icon={<DeleteIcon />} 
                      size="lg" 
                      variant="ghost" 
                      color="#8D8D8D" 
                      _hover={{ color: '#B40519' }} 
                      onClick={() => handleDeleteEvent(event._id)}
                    />
                  </HStack>
                </Box>
              </Flex>
            </Box>
          ))
        )}
      </Box>

      {/* Pagination */}
      <Flex justify="space-between" align="center" mt={8}>
        <Text fontFamily="IBM Plex Sans" fontSize="20px" color="#8D8D8D">
          Showing {events.length > 0 ? ((page - 1) * 4) + 1 : 0} to {Math.min(page * 4, total)} of {total} events
        </Text>
        <HStack spacing={3}>
          <IconButton
            aria-label="Previous"
            icon={<ChevronLeftIcon />}
            borderRadius="lg"
            bg="#F8F8F8"
            color="#555"
            size="sm"
            _hover={{ bg: '#F8E6E8' }}
            isDisabled={page <= 1}
            onClick={() => page > 1 && handlePageChange(page - 1)}
          />
          
          {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
            let pageNum: number;
            if (totalPages <= 5) {
              pageNum = i + 1;
            } else if (page <= 3) {
              pageNum = i + 1;
            } else if (page >= totalPages - 2) {
              pageNum = totalPages - 4 + i;
            } else {
              pageNum = page - 2 + i;
            }
            
            return (
              <Button 
                key={pageNum}
                bg={page === pageNum ? "#B40519" : "#F8E6E8"} 
                color={page === pageNum ? "#fff" : "#555"} 
                borderRadius="lg" 
                size="sm" 
                fontFamily="IBM Plex Sans" 
                fontWeight={page === pageNum ? 500 : 400} 
                fontSize="16px" 
                _hover={{ bg: page === pageNum ? "#B40519" : "#F8E6E8" }}
                onClick={() => handlePageChange(pageNum)}
              >
                {pageNum}
              </Button>
            );
          })}

          <IconButton
            aria-label="Next"
            icon={<ChevronRightIcon />}
            borderRadius="lg"
            bg="#F8F8F8"
            color="#555"
            size="sm"
            _hover={{ bg: '#F8E6E8' }}
            isDisabled={page >= totalPages}
            onClick={() => page < totalPages && handlePageChange(page + 1)}
          />
        </HStack>
      </Flex>

      <AdminEventDetailsModal 
        isOpen={isModalOpen} 
        onClose={handleCloseModal} 
        event={selectedEvent ? {
          mainImage: selectedEvent.mainImage,
          title: selectedEvent.title,
          description: selectedEvent.description,
          date: selectedEvent.date,
          location: selectedEvent.location
        } : null} 
      />
    </Box>
  );
};

const AdminEvents = () => {
  return (
    <AdminProtectedRoute>
      <Routes>
        {/* Main events list */}
        <Route path="/" element={<AdminEventsList />} />
        
        {/* Child routes - these inherit protection from the parent */}
        <Route path="/add" element={<AdminAddEvent />} />
        <Route path="/:eventId/edit" element={<AdminEditEvent />} />
      </Routes>
    </AdminProtectedRoute>
  );
};

export default AdminEvents; 