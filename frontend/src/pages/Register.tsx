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
    // Checkbox,
  } from '@chakra-ui/react';
  import { ChevronLeftIcon, ViewIcon, ViewOffIcon } from '@chakra-ui/icons';
  import { FC, useState } from 'react';
  import { useNavigate } from 'react-router-dom';
  import { useUserStore } from '../stores/user.store';
  import { GoogleLogin } from '@react-oauth/google';
  import { useTranslation } from 'react-i18next';
  // import { motion } from 'framer-motion';
  
  // const MotionBox = motion(Box);
  
  
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
  
  const Register: FC = () => {
    const navigate = useNavigate();
    const [showPassword, setShowPassword] = useState(false);
    const [formData, setFormData] = useState({
      firstName: '',
      lastName: '',
      companyName: '',
      email: '',
      password: '',
      dateOfBirth: '',
    });
    const register = useUserStore(state => state.register);
    const loading = useUserStore(state => state.loading);
    const error = useUserStore(state => state.error);
    const googleLogin = useUserStore(state => state.googleLogin);
    const { t } = useTranslation();
  
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const { name, value } = e.target;
      setFormData(prev => ({ ...prev, [name]: value }));
    };
  
    const handleBackToLogin = () => {
      navigate('/login');
    };
  
    const handleRegister = async () => {
      // Compose username from first and last name
      const username = `${formData.firstName} ${formData.lastName}`.trim();
      const data = {
        username,
        companyName: formData.companyName,
        email: formData.email,
        password: formData.password,
        dateOfBirth: formData.dateOfBirth,
      };
      await register(data);
      // Optionally, redirect to login or home after successful registration
      navigate('/login');
    };
  
    const handleGoogleSuccess = async (credentialResponse: any) => {
      if (credentialResponse.credential) {
        await googleLogin(credentialResponse.credential);
        navigate('/'); // or wherever you want to redirect
      }
    };
  
    return (
      <Grid templateColumns={{ base: '1fr', md: '1fr 1fr' }} minH="100vh">
        <Flex align="center" justify="center">
          <Container maxW="container.sm" py={10} position="relative">
            <IconButton
              icon={<ChevronLeftIcon />}
              aria-label={t('registerBackToLogin') || 'Back to login'}
              variant="ghost"
              position="absolute"
              top="4"
              left="4"
              onClick={handleBackToLogin}
            />
  
            <VStack spacing={6} w="full" pt={16}>
              <VStack spacing={2}>
                <Heading size="lg">{t('registerTitle')}</Heading>
                <Text color="gray.500">{t('registerSubtitle')}</Text>
              </VStack>
              
              <VStack spacing={4} w="full">
                <Flex gap={4} w="full">
                  <Input 
                    {...inputStyles}
                    placeholder={t('registerFirstName')}
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleInputChange}
                  />
                  <Input 
                    {...inputStyles}
                    placeholder={t('registerLastName')}
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleInputChange}
                  />
                </Flex>
  
                <Input 
                  {...inputStyles}
                  placeholder={t('registerCompanyName')}
                  name="companyName"
                  value={formData.companyName}
                  onChange={handleInputChange}
                />
  
                <Input 
                  {...inputStyles}
                  type="date"
                  name="dateOfBirth"
                  value={formData.dateOfBirth}
                  onChange={handleInputChange}
                />
  
                <Input 
                  {...inputStyles}
                  placeholder={t('registerEmail')}
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                />
                
                <InputGroup size="lg">
                  <Input
                    {...inputStyles}
                    type={showPassword ? 'text' : 'password'}
                    placeholder={t('registerPassword')}
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                  />
                  <InputRightElement>
                    <IconButton
                      aria-label={showPassword ? t('registerHidePassword') : t('registerShowPassword')}
                      icon={showPassword ? <ViewOffIcon /> : <ViewIcon />}
                      variant="ghost"
                      onClick={() => setShowPassword(!showPassword)}
                    />
                  </InputRightElement>
                </InputGroup>
  
                {error && (
                  <Text color="red.500" fontSize="sm">{error}</Text>
                )}
  
                <Button {...primaryButtonStyles} onClick={handleRegister} isLoading={loading}>
                  {t('registerSubmit')}
                </Button>
  
                <Flex align="center" w="full">
                  <Box flex="1" h="1px" bg="gray.300" />
                  <Text px={4} color="gray.500">{t('registerOr')}</Text>
                  <Box flex="1" h="1px" bg="gray.300" />
                </Flex>
  
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={() => {}}
                  width="100%"
                />
  
                <Flex w="full" justify="center" gap={1}>
                  <Text color="gray.500">{t('registerAlreadyHaveAccount')}</Text>
                  <Text 
                    color="brand.primary" 
                    cursor="pointer" 
                    fontWeight="medium"
                    onClick={handleBackToLogin}
                  >
                    {t('registerLogin')}
                  </Text>
                </Flex>
              </VStack>
            </VStack>
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
  
  export default Register;