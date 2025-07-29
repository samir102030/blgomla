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
import AdminEditArticle from './AdminEditArticle';
import AdminArticleDetailsModal from './AdminArticleDetailsModal';
import { articlesAPI } from '../../utils/api';

interface Article {
  _id: string;
  title: string;
  content: string;
  mainImage: string;
  image?: string; // For compatibility with modal
  createdAt: string;
  updatedAt: string;
}

const AdminArticles = () => {
  return (
    <AdminProtectedRoute>
      <Routes>
        <Route path="/" element={<AdminArticlesMainView />} />
        <Route path="/add" element={<AdminEditArticle />} />
        <Route path="/edit/:id" element={<AdminEditArticle />} />
      </Routes>
    </AdminProtectedRoute>
  );
};

const AdminArticlesMainView = () => {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const navigate = useNavigate();
  const toast = useToast();

  // Fetch articles from API
  const fetchArticles = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = {
        page,
        limit: 4,
        ...(search && { search }),
      };
      const response = await articlesAPI.getAll(params);
      setArticles(response.articles || []);
      setTotalPages(response.totalPages || 1);
      setTotal(response.total || 0);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch articles';
      setError(errorMessage);
      console.error('Error fetching articles:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArticles();
  }, [page, search]);

  // Search with debounce
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (page !== 1) {
        setPage(1);
      } else {
        fetchArticles();
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [search]);

  const handleViewArticle = async (articleId: string) => {
    try {
      const article = await articlesAPI.getById(articleId);
      setSelectedArticle(article);
      setIsModalOpen(true);
    } catch (err: unknown) {
      toast({
        title: 'Error',
        description: 'Failed to fetch article details',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedArticle(null);
  };

  const handleEditArticle = (articleId: string) => {
    navigate(`/admin/articles/edit/${articleId}`);
  };

  const handleAddArticle = () => {
    navigate('/admin/articles/add');
  };

  const handleDeleteArticle = async (articleId: string) => {
    if (window.confirm('Are you sure you want to delete this article?')) {
      try {
        await articlesAPI.delete(articleId);
        toast({
          title: 'Success',
          description: 'Article deleted successfully',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
        fetchArticles(); // Refresh the list
      } catch (err: unknown) {
        toast({
          title: 'Error',
          description: 'Failed to delete article',
          status: 'error',
          duration: 3000,
          isClosable: true,
        });
      }
    }
  };

  const handleSelectItem = (articleId: string) => {
    setSelectedItems(prev => 
      prev.includes(articleId) 
        ? prev.filter(id => id !== articleId)
        : [...prev, articleId]
    );
  };

  const handleSelectAll = () => {
    if (selectedItems.length === articles.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(articles.map(article => article._id));
    }
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  if (loading && articles.length === 0) {
    return (
      <Box p={12}>
        <Flex justify="center" align="center" h="400px">
          <Spinner size="xl" color="#B40519" />
        </Flex>
      </Box>
    );
  }

  return (
    <Box p={12}>
      <Heading fontFamily="IBM Plex Sans" fontWeight={500} fontSize="32px" color="#3F0209" mb={12} lineHeight="56px">
        Articles
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
          borderRadius="10px"
          px={6}
          py={2.5}
          h="56px"
          _hover={{ bg: '#F8E6E8' }}
          onClick={handleAddArticle}
        >
          Add Article
        </Button>
        <InputGroup w="340px" h="56px" bg="#F8F8F8" borderRadius="10px" border="2px solid #BCBCBC">
          <InputLeftElement pointerEvents="none">
            <SearchIcon color="#8D8D8D" boxSize={8} />
          </InputLeftElement>
          <Input
            placeholder="Search articles..."
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

      <Box bg="white" borderRadius="2xl" border="2px solid #EAEAEA" boxShadow="sm" p={0}>
        {/* Table Header */}
        <Box bg="#F8F8F8" borderTopLeftRadius="12px" borderTopRightRadius="12px" px={6} py={8}>
          <Flex align="center" gap={0}>
            <Box w="64px" display="flex" justifyContent="center">
              <Checkbox 
                size="lg" 
                colorScheme="red" 
                borderColor="#BCBCBC" 
                isChecked={selectedItems.length === articles.length && articles.length > 0}
                isIndeterminate={selectedItems.length > 0 && selectedItems.length < articles.length}
                onChange={handleSelectAll}
              />
            </Box>
            <Box w="80px" textAlign="left"><Text fontFamily="IBM Plex Sans" fontSize="20px" fontWeight={500} color="#3F0209">Image</Text></Box>
            <Box flex="1" minW="180px"><Text fontFamily="IBM Plex Sans" fontSize="20px" fontWeight={500} color="#3F0209">Article Title</Text></Box>
            <Box flex="1" minW="180px"><Text fontFamily="IBM Plex Sans" fontSize="20px" fontWeight={500} color="#3F0209">Article Content</Text></Box>
            <Box w="160px" textAlign="left"><Text fontFamily="IBM Plex Sans" fontSize="20px" fontWeight={500} color="#3F0209">Action</Text></Box>
          </Flex>
        </Box>

        {/* Table Rows */}
        {loading ? (
          <Box p={8} textAlign="center">
            <Spinner color="#B40519" />
            <Text mt={2} fontFamily="IBM Plex Sans" color="#8D8D8D">Loading articles...</Text>
          </Box>
        ) : articles.length === 0 ? (
          <Box p={8} textAlign="center">
            <Text fontFamily="IBM Plex Sans" fontSize="20px" color="#8D8D8D">
              {search ? 'No articles found matching your search.' : 'No articles available.'}
            </Text>
          </Box>
        ) : (
          articles.map((article, idx) => (
            <Flex key={article._id} align="center" gap={0} px={6} py={8} borderBottom={idx === articles.length - 1 ? 'none' : '2px solid #EAEAEA'}>
              <Box w="64px" display="flex" justifyContent="center">
                <Checkbox 
                  size="lg" 
                  colorScheme="red" 
                  borderColor="#BCBCBC" 
                  isChecked={selectedItems.includes(article._id)}
                  onChange={() => handleSelectItem(article._id)}
                />
              </Box>
              <Box w="80px" display="flex" alignItems="center" justifyContent="center">
                <Image 
                  src={article.mainImage || '/images/admin/image.png'} 
                  alt={article.title} 
                  boxSize="64px" 
                  borderRadius="lg" 
                  objectFit="cover" 
                  fallbackSrc="/images/admin/image.png"
                />
              </Box>
              <Box flex="1" minW="180px">
                <Text fontFamily="IBM Plex Sans" fontSize="20px" color="#717171" noOfLines={1}>{article.title}</Text>
              </Box>
              <Box flex="1" minW="180px">
                <Text fontFamily="IBM Plex Sans" fontSize="20px" color="#717171" noOfLines={1}>
                  {article.content ? article.content.replace(/<[^>]+>/g, '').substring(0, 50) + '...' : 'No content'}
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
                  onClick={() => handleViewArticle(article._id)} 
                />
                <IconButton 
                  aria-label="Edit" 
                  icon={<EditIcon />} 
                  size="lg" 
                  variant="ghost" 
                  color="#8D8D8D" 
                  _hover={{ color: '#B40519' }} 
                  onClick={() => handleEditArticle(article._id)} 
                />
                <IconButton 
                  aria-label="Delete" 
                  icon={<DeleteIcon />} 
                  size="lg" 
                  variant="ghost" 
                  color="#8D8D8D" 
                  _hover={{ color: '#B40519' }} 
                  onClick={() => handleDeleteArticle(article._id)}
                />
              </Box>
            </Flex>
          ))
        )}
      </Box>

      {/* Pagination */}
      <Flex justify="space-between" align="center" mt={8}>
        <Text fontFamily="IBM Plex Sans" fontSize="20px" color="#8D8D8D">
          Showing {articles.length > 0 ? ((page - 1) * 4) + 1 : 0} to {Math.min(page * 4, total)} of {total} articles
        </Text>
        <Flex gap={3} align="center">
          <Box 
            bg="#f8f8f8" 
            rounded="lg" 
            w={10} 
            h={10} 
            display="flex" 
            alignItems="center" 
            justifyContent="center"
            cursor={page > 1 ? "pointer" : "not-allowed"}
            opacity={page > 1 ? 1 : 0.5}
            onClick={() => page > 1 && handlePageChange(page - 1)}
          >
            <ChevronLeftIcon color="#555" boxSize={5} />
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
                rounded="lg" 
                w={10} 
                h={10} 
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
            rounded="lg" 
            w={10} 
            h={10} 
            display="flex" 
            alignItems="center" 
            justifyContent="center"
            cursor={page < totalPages ? "pointer" : "not-allowed"}
            opacity={page < totalPages ? 1 : 0.5}
            onClick={() => page < totalPages && handlePageChange(page + 1)}
          >
            <ChevronRightIcon color="#555" boxSize={5} />
          </Box>
        </Flex>
      </Flex>

      <AdminArticleDetailsModal 
        isOpen={isModalOpen} 
        onClose={handleCloseModal} 
        article={selectedArticle ? {
          image: selectedArticle.mainImage,
          title: selectedArticle.title,
          content: selectedArticle.content
        } : null} 
      />
    </Box>
  );
};

export default AdminArticles; 