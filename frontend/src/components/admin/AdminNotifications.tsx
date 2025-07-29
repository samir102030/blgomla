import React, { useEffect } from 'react';
import {
  Box,
  Flex,
  Text,
  VStack,
  Image,
  Heading,
  Container,
  useColorModeValue,
  chakra,
} from '@chakra-ui/react';
import { keyframes } from '@emotion/react';
import AdminProtectedRoute from './AdminProtectedRoute';
import { useNotificationStore } from '../../stores/notification.store';

interface NotificationItem {
  id: string;
  title: string;
  details: string;
  date: string;
  image: string;
}

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(24px); }
  to { opacity: 1; transform: translateY(0); }
`;

const AdminNotifications: React.FC = () => {
  return (
    <AdminProtectedRoute>
      <AdminNotificationsMainView />
    </AdminProtectedRoute>
  );
};

const AdminNotificationsMainView: React.FC = () => {
  const { notifications, loading, error, fetchNotifications } = useNotificationStore();
  console.log(notifications);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Color and shadow values
  const cardBg = useColorModeValue('white', 'gray.800');
  const cardShadow = useColorModeValue('0 4px 24px rgba(63,2,9,0.08)', '0 4px 24px rgba(0,0,0,0.24)');
  const dividerColor = useColorModeValue('#E2E8F0', 'gray.700');
  const gradientBg = useColorModeValue(
    'linear-gradient(135deg, #F8F8F8 60%, #f3e9f7 100%)',
    'linear-gradient(135deg, #232323 60%, #2d1a2e 100%)'
  );

  return (
    <Box bg={gradientBg} transition="background 0.3s" px={{ base: 2, md: 10 }} py={{ base: 4, md: 10 }}>
      <Container maxW="1052px" p={0}>
        <Box position="relative">
          {/* Sticky Title */}
          <Box
            position="sticky"
            top={{ base: 0, md: 0 }}
            zIndex={2}
            bg={gradientBg}
            pt={2}
            pb={6}
            mb={2}
          >
            <Heading
              fontFamily="IBM Plex Sans, sans-serif"
              fontWeight={500}
              fontSize={{ base: '24px', md: '32px' }}
              color="#3F0209"
              lineHeight="56px"
              letterSpacing="-0.5px"
              px={{ base: 2, md: 0 }}
            >
              Notification
            </Heading>
          </Box>
          {/* Loading and Error States */}
          {loading && <Text>Loading notifications...</Text>}
          {error && <Text color="red.500">{error}</Text>}
          {/* Notifications List */}
          <VStack spacing={8} align="stretch">
            {notifications.map((notification, index) => (
              <chakra.div
                key={notification._id}
                animation={`${fadeIn} 0.7s cubic-bezier(0.23, 1, 0.32, 1) both`}
                style={{ animationDelay: `${index * 0.08}s` }}
              >
                <Box
                  bg={cardBg}
                  borderRadius="2xl"
                  boxShadow={cardShadow}
                  transition="box-shadow 0.2s, transform 0.2s"
                  _hover={{
                    boxShadow: '0 8px 32px rgba(63,2,9,0.16)',
                    transform: 'translateY(-4px) scale(1.012)',
                  }}
                  p={{ base: 4, md: 6 }}
                  position="relative"
                >
                  <Flex gap={6} align="flex-start">
                    {/* Notification Image (optional, fallback) */}
                    <Image
                      src={'/images/admin/image.png'}
                      alt="Notification"
                      boxSize={{ base: '60px', md: '80px' }}
                      objectFit="cover"
                      borderRadius="lg"
                      fallbackSrc="/images/admin/image.png"
                      flexShrink={0}
                      boxShadow="sm"
                    />
                    {/* Notification Content */}
                    <VStack align="start" spacing={2} flex={1}>
                      <Text
                        fontFamily="IBM Plex Sans, sans-serif"
                        fontWeight={500}
                        fontSize={{ base: '18px', md: '24px' }}
                        color="#424242"
                        lineHeight="40px"
                        w="full"
                        noOfLines={1}
                      >
                        {notification.title}
                      </Text>
                      <Text
                        fontFamily="IBM Plex Sans, sans-serif"
                        fontWeight={400}
                        fontSize={{ base: '15px', md: '20px' }}
                        color="rgba(4, 12, 24, 0.8)"
                        lineHeight="32px"
                        w="full"
                        noOfLines={2}
                      >
                        {notification.description}
                      </Text>
                      <Text
                        fontFamily="IBM Plex Sans, sans-serif"
                        fontWeight={400}
                        fontSize={{ base: '13px', md: '16px' }}
                        color="#8D8D8D"
                        lineHeight="28px"
                        w="full"
                      >
                        {new Date(notification.time).toLocaleString()}
                      </Text>
                      {notification.read && (
                        <Text color="green.500" fontSize="sm">Read</Text>
                      )}
                    </VStack>
                  </Flex>
                  {/* Divider - only show if not last item */}
                  {index < notifications.length - 1 && (
                    <Box
                      as="hr"
                      border="none"
                      borderBottom={`1.5px solid ${dividerColor}`}
                      w="full"
                      mt={6}
                      mb={-6}
                      borderRadius="full"
                      opacity={0.7}
                    />
                  )}
                </Box>
              </chakra.div>
            ))}
          </VStack>
        </Box>
      </Container>
    </Box>
  );
};

export default AdminNotifications; 