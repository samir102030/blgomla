import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@chakra-ui/react';
import { useUserStore } from '../stores/user.store';

export const useAdminAuth = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const user = useUserStore(state => state.user);
  const loading = useUserStore(state => state.loading);
  const getProfile = useUserStore(state => state.getProfile);
  
  const [isInitialized, setIsInitialized] = useState(false);

  // Derived values
  const isLoading = loading || !isInitialized;
  const isLoggedIn = user !== null;
  const isAdmin = user?.isAdmin === true;

  // Initialize user data if not loaded
  useEffect(() => {
    if (!user && !loading && !isInitialized) {
      // Try to get current user profile from backend
      getProfile()
        .then(() => {
          setIsInitialized(true);
        })
        .catch(() => {
          // If getting profile fails, user is not authenticated
          setIsInitialized(true);
        });
    } else if (user || loading) {
      setIsInitialized(true);
    }
  }, [user, loading, getProfile, isInitialized]);

  // Admin protection - redirect if not admin
  useEffect(() => {
    if (isInitialized && !isLoading) {
      if (!isAdmin) {
        toast({
          title: 'Access Denied',
          description: 'You must be an admin to access this page.',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
        navigate('/login');
        return;
      }
    }
  }, [isInitialized, isLoading, isLoggedIn, isAdmin, navigate, toast]);

  return {
    user,
    isLoading,
    isLoggedIn,
    isAdmin,
    isInitialized
  };
}; 