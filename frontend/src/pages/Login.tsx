import {
  Box,
  Button,
  Container,
  Flex,
  Grid,
  Heading,
  IconButton,
  Image,
  Input,
  InputGroup,
  InputRightElement,
  Text,
  VStack,
  Checkbox,
  HStack,
  useToast,
  Alert,
  AlertIcon,
} from '@chakra-ui/react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeftIcon, ViewIcon, ViewOffIcon } from '@chakra-ui/icons';
import { FC, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CustomerIcon, SafetyIcon, SatisfiedIcon } from '../components/icons/CustomIcons';
import { useUserStore } from '../stores/user.store';
import { GoogleLogin } from '@react-oauth/google';
import { useTranslation } from 'react-i18next';
import { useAdminLogoStore } from '../stores/adminLogo.store';

const MotionBox = motion(Box);


const buttonStyles = {
  size: "lg",
  borderRadius: "9999px",
  w: "full",
};

const primaryButtonStyles = {
  ...buttonStyles,
  bg: "brand.primary",
  color: "white",
  _hover: { opacity: 0.9 },
};

const outlineButtonStyles = {
  ...buttonStyles,
  variant: "outline",
  borderColor: "brand.primary",
  color: "brand.primary",
  _hover: { bg: 'transparent', opacity: 0.8 },
};

const inputStyles = {
  size: "lg",
  borderRadius: "lg",
  _focus: {
    borderColor: 'brand.primary',
    boxShadow: '0 0 0 1px var(--chakra-colors-brand-primary)',
  },
};

const Login: FC = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoginView, setIsLoginView] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const navigate = useNavigate();
  const toast = useToast();
  const loginStore = useUserStore(state => state.login);
  const user = useUserStore(state => state.user);
  const loading = useUserStore(state => state.loading);
  const errorStore = useUserStore(state => state.error);
  const googleLogin = useUserStore(state => state.googleLogin);
  const { t } = useTranslation();

  // Logo from database
  const { currentLogo, fetchCurrentLogo } = useAdminLogoStore();

  // Fetch current logo on mount
  useEffect(() => {
    fetchCurrentLogo();
  }, [fetchCurrentLogo]);

  const handleLoginClick = () => {
    setIsLoginView(true);
  };

  const handleBackClick = () => {
    setIsLoginView(false);
    setError('');
  };

  const handleCreateAccount = () => {
    navigate('/register');
  };

  const handleSubmitLogin = async () => {
    if (!email || !password) {
      toast({
        title: t('loginFailedTitle'),
        description: t('loginFailedDesc'),
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      return;
    }
    await loginStore(email, password);
  };

  const handleGoogleSuccess = async (credentialResponse: any) => {
    if (credentialResponse.credential) {
      await googleLogin(credentialResponse.credential);
      if (user && user.isAdmin) {
        navigate('/admin');
      } else {
        navigate('/');
      }
    }
  };

  // Redirect on successful login
  if (user) {
    setTimeout(() => {
      if (user.isAdmin) {
        navigate('/admin');
      } else {
        navigate('/');
      }
    }, 100);
  }

  return (
    <Grid templateColumns={{ base: '1fr', md: '1fr 1fr' }} minH="100vh">
      {/* Left Side */}
      <Flex align="center" justify="center">
        <Container maxW="container.sm" py={10} position="relative">
          {/* Initial View */}
          <MotionBox
            initial={{ opacity: 1, x: 0 }}
            animate={{ 
              opacity: isLoginView ? 0 : 1,
              x: isLoginView ? -50 : 0,
              display: isLoginView ? 'none' : 'block'
            }}
            transition={{ duration: 0.3 }}
          >
            <VStack align="flex-start" spacing={8}>
              <HStack spacing={2}>
                <Image 
                  src={currentLogo?.url || "/images/logo1.png"} 
                  alt="EGY CHEM HUB" 
                  w="50px" 
                />
                <Image 
                  src="/images/logo2.png" 
                  alt="EGY CHEM HUB Secondary" 
                  w="100px" 
                />

              </HStack>  
              

              <Box>
                <Heading size="lg" mb={4}>{t('loginTitle')}</Heading>
                <Text color="gray.600" fontSize="sm" maxW="400px">
                  {t('loginBody')}
                </Text>
              </Box>

              <Grid 
                templateColumns="repeat(3, 1fr)" 
                gap={8} 
                w="full"
                mt={8}
              >
                <VStack align="center" spacing={2}>
                  <CustomerIcon boxSize="30px" color="brand.primary" />
                  <Text fontSize="sm" fontWeight="medium" textAlign="center">
                    {t('loginFeature1')}
                  </Text>
                  <Text fontSize="xs" color="gray.500" textAlign="center">
                    {t('loginFeature1Description')}
                  </Text>
                </VStack>
                
                <VStack align="center" spacing={2}>
                  <SafetyIcon boxSize="30px" color="brand.primary" />
                  <Text fontSize="sm" fontWeight="medium" textAlign="center">
                    {t('loginFeature2')}
                  </Text>
                  <Text fontSize="xs" color="gray.500" textAlign="center">
                    {t('loginFeature2Description')}
                  </Text>
                </VStack>
                
                <VStack align="center" spacing={2}>
                  <SatisfiedIcon boxSize="30px" color="brand.primary" />
                  <Text fontSize="sm" fontWeight="medium" textAlign="center">
                    {t('loginFeature3')}
                  </Text>
                  <Text fontSize="xs" color="gray.500" textAlign="center">
                    {t('loginFeature3Description')}
                  </Text>
                </VStack>
              </Grid>

              <VStack spacing={4} w="full">
                <Button 
                  {...primaryButtonStyles}
                  onClick={handleLoginClick}
                >
                  {t('loginAction')}
                </Button>
                <Button 
                  {...outlineButtonStyles}
                  onClick={handleCreateAccount}
                >
                  {t('loginAction2')}
                </Button>
              </VStack>
            </VStack>
          </MotionBox>

          {/* Login Form */}
          <MotionBox
            initial={{ opacity: 0, x: 50 }}
            animate={{ 
              opacity: isLoginView ? 1 : 0,
              x: isLoginView ? 0 : 50,
              display: isLoginView ? 'block' : 'none'
            }}
            transition={{ duration: 0.3 }}
          >
            <IconButton
              icon={<ChevronLeftIcon />}
              aria-label={t('loginBackToMain') || 'Back to main'}
              variant="ghost"
              position="absolute"
              top="4"
              left="4"
              onClick={handleBackClick}
            />

            <VStack spacing={6} w="full" pt={16}>
              <VStack spacing={2}>
                <Heading size="lg">{t('loginTitle')}</Heading>
                <Text color="gray.500">{t('loginBody2')}</Text>
              </VStack>

              {/* Admin Credentials Info */}
              {/* <Box 
                w="full" 
                p={4} 
                bg="blue.50" 
                borderRadius="lg" 
                border="1px solid" 
                borderColor="blue.200"
              >
                <VStack spacing={2} align="start">
                  <Text fontSize="sm" fontWeight="bold" color="blue.700">
                    🔐 Admin Account:
                  </Text>
                  <VStack spacing={1} align="start" pl={4}>
                    <Text fontSize="sm" color="blue.600">
                      <Text as="span" fontWeight="semibold">Email:</Text> admin@example.com
                    </Text>
                    <Text fontSize="sm" color="blue.600">
                      <Text as="span" fontWeight="semibold">Password:</Text> admin123
                    </Text>
                  </VStack>
                </VStack>
              </Box> */}

              {errorStore && (
                <Alert status="error" borderRadius="lg">
                  <AlertIcon />
                  {errorStore}
                </Alert>
              )}
              
              <VStack spacing={4} w="full">
                <Input 
                  {...inputStyles}
                  placeholder={t('loginEmail')}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                
                <InputGroup size="lg">
                  <Input
                    {...inputStyles}
                    type={showPassword ? 'text' : 'password'}
                    placeholder={t('loginPassword')}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !isLoading) {
                        handleSubmitLogin();
                      }
                    }}
                  />
                  <InputRightElement>
                    <IconButton
                      aria-label={showPassword ? t('loginHidePassword') : t('loginShowPassword')}
                      icon={showPassword ? <ViewOffIcon /> : <ViewIcon />}
                      variant="ghost"
                      onClick={() => setShowPassword(!showPassword)}
                    />
                  </InputRightElement>
                </InputGroup>

                <Flex w="full" justify="space-between" align="center">
                  <Checkbox 
                    alignSelf="start"
                    sx={{
                      '.chakra-checkbox__control[data-checked]': {
                        bg: 'brand.primary',
                        borderColor: 'brand.primary',
                        _hover: {
                          bg: 'brand.primary',
                          borderColor: 'brand.primary',
                        }
                      }
                    }}
                  >
                    {t('loginKeepMe')}
                  </Checkbox>
                  <Text 
                    color="brand.primary" 
                    fontSize="sm" 
                    fontWeight="medium" 
                    cursor="pointer"
                    onClick={() => setIsForgotPasswordOpen(true)}
                  >
                    {t('loginForget')}
                  </Text>
                </Flex>

                <Button 
                  {...primaryButtonStyles}
                  onClick={handleSubmitLogin}
                  isLoading={loading}
                  loadingText={t('loginLoading')}
                >
                  {t('loginSubmit')}
                </Button>

                <Flex align="center" w="full">
                  <Box flex="1" h="1px" bg="gray.300" />
                  <Text px={4} color="gray.500">{t('loginOr')}</Text>
                  <Box flex="1" h="1px" bg="gray.300" />
                </Flex>

                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={() => {}}
                  width="100%"
                />

                <Flex w="full" justify="center" gap={1}>
                  <Text color="gray.500">{t('loginNeedAccount')}</Text>
                  <Text 
                    color="brand.primary" 
                    cursor="pointer" 
                    fontWeight="medium"
                    onClick={handleCreateAccount}
                  >
                    {t('loginCreateOne')}
                  </Text>
                </Flex>
              </VStack>
            </VStack>
          </MotionBox>
        </Container>
      </Flex>

      {/* Right Side - Image */}
      <Box
        display={{ base: 'none', md: 'block' }}
        bgImage="url('/banner/img1.png')"
        bgSize="cover"
        bgPosition="center"
        borderRadius="2xl"
        overflow="hidden"
        m={4}
      />
    </Grid>
  );
};

export default Login;
