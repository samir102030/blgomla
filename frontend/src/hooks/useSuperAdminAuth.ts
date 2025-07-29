import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@chakra-ui/react';
import { useUserStore } from '../stores/user.store';

export const useSuperAdminAuth = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const user = useUserStore(state => state.user);
  const loading = useUserStore(state => state.loading);
  const getProfile = useUserStore(state => state.getProfile);
  
  const [isInitialized, setIsInitialized] = useState(false);

  // Derived values
  const isLoading = loading || !isInitialized;
  const isLoggedIn = user !== null;
  const isSuperAdmin = user?.email === 'admin@example.com' && user?.isAdmin === true;
  const hasAdminAccess = isSuperAdmin || (user?.isAdmin && user?.adminPermissions?.includes('admins'));

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

  // Admin access protection - redirect if not authorized
  useEffect(() => {
    if (isInitialized && !isLoading) {
      if (!hasAdminAccess) {
        toast({
          title: 'Access Denied',
          description: 'You need admin management permissions to access this page.',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
        navigate('/admin');
        return;
      }
    }
  }, [isInitialized, isLoading, isLoggedIn, hasAdminAccess, navigate, toast]);

  return {
    user,
    isLoading,
    isLoggedIn,
    isSuperAdmin,
    hasAdminAccess,
    isInitialized
  };
}; 