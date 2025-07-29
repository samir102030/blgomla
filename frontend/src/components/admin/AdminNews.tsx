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
  Text,
  useToast,
  Spinner,
  Alert,
  AlertIcon,
} from '@chakra-ui/react';
import { SearchIcon, AddIcon, ViewIcon, EditIcon, DeleteIcon, ChevronLeftIcon, ChevronRightIcon } from '@chakra-ui/icons';
import { useNavigate, Routes, Route } from 'react-router-dom';
import AdminProtectedRoute from './AdminProtectedRoute';
import AdminEditNews from './AdminEditNews';
import AdminNewsDetailsModal from './AdminNewsDetailsModal';
import { newsAPI } from '../../utils/api';

interface NewsItem {
  _id: string;
  title: string;
  content: string;
  mainImage: string;
  createdAt: string;
  updatedAt: string;
}

const AdminNews = () => {
  return (
    <AdminProtectedRoute>
      <Routes>
        <Route path="/" element={<AdminNewsMainView />} />
        <Route path="/add" element={<AdminEditNews />} />
        <Route path="/edit/:id" element={<AdminEditNews />} />
      </Routes>
    </AdminProtectedRoute>
  );
};

const AdminNewsMainView = () => {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [selectedNews, setSelectedNews] = useState<NewsItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const navigate = useNavigate();
  const toast = useToast();

  // Fetch news from API
  const fetchNews = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = {
        page,
        limit: 4,
        ...(search && { search }),
      };
      const response = await newsAPI.getAll(params);
      setNews(response.news || []);
      setTotalPages(response.totalPages || 1);
      setTotal(response.total || 0);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch news';
      setError(errorMessage);
      console.error('Error fetching news:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNews();
  }, [page, search]);

  // Search with debounce
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (page !== 1) {
        setPage(1);
      } else {
        fetchNews();
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [search]);

  const handleViewNews = async (newsId: string) => {
    try {
      const newsItem = await newsAPI.getById(newsId);
      setSelectedNews(newsItem);
      setIsModalOpen(true);
    } catch (err: unknown) {
      toast({
        title: 'Error',
        description: 'Failed to fetch news details',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedNews(null);
  };

  const handleAddNews = () => {
    navigate('/admin/news/add');
  };

  const handleEditNews = (newsId: string) => {
    navigate(`/admin/news/edit/${newsId}`);
  };

  const handleDeleteNews = async (newsId: string) => {
    if (window.confirm('Are you sure you want to delete this news item?')) {
      try {
        await newsAPI.delete(newsId);
        toast({
          title: 'Success',
          description: 'News deleted successfully',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
        fetchNews(); // Refresh the list
      } catch (err: unknown) {
        toast({
          title: 'Error',
          description: 'Failed to delete news',
          status: 'error',
          duration: 3000,
          isClosable: true,
        });
      }
    }
  };

  const handleSelectItem = (newsId: string) => {
    setSelectedItems(prev => 
      prev.includes(newsId) 
        ? prev.filter(id => id !== newsId)
        : [...prev, newsId]
    );
  };

  const handleSelectAll = () => {
    if (selectedItems.length === news.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(news.map(item => item._id));
    }
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  if (loading && news.length === 0) {
    return (
      <Box p={10}>
        <Flex justify="center" align="center" h="400px">
          <Spinner size="xl" color="#B40519" />
        </Flex>
      </Box>
    );
  }

  return (
    <Box p={10}>
      <Heading fontFamily="IBM Plex Sans" fontWeight={500} fontSize="32px" color="#3F0209" mb={12} lineHeight="56px">
        News
      </Heading>

      {error && (
        <Alert status="error" mb={6}>
          <AlertIcon />
          {error}
        </Alert>
      )}

      <Flex mb={12} justify="space-between" align="center">
        <Button
          leftIcon={<AddIcon boxSize={6} color="#B40519" />}
          variant="outline"
          borderColor="#B40519"
          color="#B40519"
          fontFamily="IBM Plex Sans"
          fontWeight={500}
          fontSize="24px"
          borderRadius="10px"
          px={6}
          py={2.5}
          h="56px"
          _hover={{ bg: '#F8E6E8' }}
          onClick={handleAddNews}
        >
          Add News
        </Button>
        <InputGroup w="340px" h="56px" bg="#F8F8F8" borderRadius="10px" border="2px solid #BCBCBC">
          <InputLeftElement pointerEvents="none">
            <SearchIcon color="#8D8D8D" boxSize={8} />
          </InputLeftElement>
          <Input
            placeholder="Search news..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            fontFamily="IBM Plex Sans"
            fontSize="24px"
            color="#8D8D8D"
            border="none"
            bg="transparent"
            h="56px"
            _focus={{ boxShadow: 'none' }}
          />
        </InputGroup>
      </Flex>

      <Box bg="#fff" borderRadius="2xl" border="2px solid #EAEAEA" boxShadow="sm" p={0}>
        {/* Table Header */}
        <Box bg="#F8F8F8" borderTopLeftRadius="12px" borderTopRightRadius="12px" px={6} py={8}>
          <Flex align="center" gap={0}>
            <Box w="64px" display="flex" justifyContent="center">
              <Checkbox 
                size="lg" 
                colorScheme="red" 
                borderColor="#BCBCBC" 
                isChecked={selectedItems.length === news.length && news.length > 0}
                isIndeterminate={selectedItems.length > 0 && selectedItems.length < news.length}
                onChange={handleSelectAll}
              />
            </Box>
            <Box w="80px" textAlign="left"><Text fontFamily="IBM Plex Sans" fontSize="20px" fontWeight={500} color="#3F0209">Image</Text></Box>
            <Box flex="1" minW="180px"><Text fontFamily="IBM Plex Sans" fontSize="20px" fontWeight={500} color="#3F0209">News Title</Text></Box>
            <Box flex="1" minW="180px"><Text fontFamily="IBM Plex Sans" fontSize="20px" fontWeight={500} color="#3F0209">Content</Text></Box>
            <Box w="160px" textAlign="left"><Text fontFamily="IBM Plex Sans" fontSize="20px" fontWeight={500} color="#3F0209">Action</Text></Box>
          </Flex>
        </Box>

        {/* Table Rows */}
        {loading ? (
          <Box p={8} textAlign="center">
            <Spinner color="#B40519" />
            <Text mt={2} fontFamily="IBM Plex Sans" color="#8D8D8D">Loading news...</Text>
          </Box>
        ) : news.length === 0 ? (
          <Box p={8} textAlign="center">
            <Text fontFamily="IBM Plex Sans" fontSize="20px" color="#8D8D8D">
              {search ? 'No news found matching your search.' : 'No news available.'}
            </Text>
          </Box>
        ) : (
          news.map((newsItem, idx) => (
            <Flex
              key={newsItem._id}
              align="center"
              gap={0}
              px={6}
              py={8}
              borderBottom={idx === news.length - 1 ? 'none' : '2px solid #EAEAEA'}
              bg="#fff"
            >
              <Box w="64px" display="flex" justifyContent="center">
                <Checkbox 
                  size="lg" 
                  colorScheme="red" 
                  borderColor="#BCBCBC" 
                  isChecked={selectedItems.includes(newsItem._id)}
                  onChange={() => handleSelectItem(newsItem._id)}
                />
              </Box>
              <Box w="80px" display="flex" alignItems="center" justifyContent="center">
                <Image 
                  src={newsItem.mainImage || '/images/admin/image.png'} 
                  alt={newsItem.title} 
                  boxSize="64px" 
                  borderRadius="lg" 
                  objectFit="cover" 
                  fallbackSrc="/images/admin/image.png"
                />
              </Box>
              <Box flex="1" minW="180px">
                <Text fontFamily="IBM Plex Sans" fontSize="20px" color="#717171" fontWeight={400} noOfLines={1}>
                  {newsItem.title}
                </Text>
              </Box>
              <Box flex="1" minW="180px">
                <Text fontFamily="IBM Plex Sans" fontSize="20px" color="#717171" fontWeight={400} noOfLines={2}>
                  {newsItem.content ? newsItem.content.replace(/<[^>]+>/g, '').substring(0, 50) + '...' : 'No content'}
                </Text>
              </Box>
              <Box w="160px" display="flex" gap={4} alignItems="center">
                <IconButton 
                  aria-label="View" 
                  icon={<ViewIcon />} 
                  size="lg"
                  variant="ghost" 
                  color="#8D8D8D" 
                  _hover={{ color: '#B40519' }} 
                  onClick={() => handleViewNews(newsItem._id)}
                />
                <IconButton 
                  aria-label="Edit" 
                  icon={<EditIcon />} 
                  size="lg"
                  variant="ghost" 
                  color="#8D8D8D" 
                  _hover={{ color: '#B40519' }} 
                  onClick={() => handleEditNews(newsItem._id)} 
                />
                <IconButton 
                  aria-label="Delete" 
                  icon={<DeleteIcon />} 
                  size="lg"
                  variant="ghost" 
                  color="#8D8D8D" 
                  _hover={{ color: '#B40519' }} 
                  onClick={() => handleDeleteNews(newsItem._id)}
                />
              </Box>
            </Flex>
          ))
        )}
      </Box>

      {/* Pagination */}
      <Flex mt={8} align="center" justify="space-between">
        <Text fontFamily="IBM Plex Sans" fontSize="20px" color="#8D8D8D">
          Showing {news.length > 0 ? ((page - 1) * 4) + 1 : 0} to {Math.min(page * 4, total)} of {total} news
        </Text>
        <Flex gap={3} align="center">
          <Box 
            bg="#f8f8f8" 
            borderRadius="lg" 
            w="40px" 
            h="40px" 
            display="flex" 
            alignItems="center" 
            justifyContent="center"
            cursor={page > 1 ? "pointer" : "not-allowed"}
            opacity={page > 1 ? 1 : 0.5}
            onClick={() => page > 1 && handlePageChange(page - 1)}
          >
            <ChevronLeftIcon color="#555" boxSize={6} />
          </Box>
          
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
              <Box 
                key={pageNum}
                bg={page === pageNum ? "#B40519" : "#f8e6e8"} 
                borderRadius="lg" 
                w="40px" 
                h="40px" 
                display="flex" 
                alignItems="center" 
                justifyContent="center"
                cursor="pointer"
                onClick={() => handlePageChange(pageNum)}
              >
                <Text 
                  fontFamily="IBM Plex Sans" 
                  fontWeight={page === pageNum ? 500 : 400} 
                  fontSize="16px" 
                  color={page === pageNum ? "#fff" : "#555"}
                >
                  {pageNum}
                </Text>
              </Box>
            );
          })}

          <Box 
            bg="#f8f8f8" 
            borderRadius="lg" 
            w="40px" 
            h="40px" 
            display="flex" 
            alignItems="center" 
            justifyContent="center"
            cursor={page < totalPages ? "pointer" : "not-allowed"}
            opacity={page < totalPages ? 1 : 0.5}
            onClick={() => page < totalPages && handlePageChange(page + 1)}
          >
            <ChevronRightIcon color="#555" boxSize={6} />
          </Box>
        </Flex>
      </Flex>

      <AdminNewsDetailsModal 
        isOpen={isModalOpen} 
        onClose={handleCloseModal} 
        news={selectedNews ? {
          mainImage: selectedNews.mainImage,
          title: selectedNews.title,
          content: selectedNews.content,
          createdAt: selectedNews.createdAt
        } : null} 
      />
    </Box>
  );
};

export default AdminNews; 