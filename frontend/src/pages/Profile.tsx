import { useState, useEffect, useRef } from "react";
import {
  Box,
  Container,
  Heading,
  Text,
  VStack,
  Divider,
  Image,
  Button,
  HStack,
  Flex,
  Grid,
  GridItem,
  // Badge,
  // Stack,
  // useColorModeValue,
  Circle,
  Input,
  Textarea,
  FormControl,
  FormLabel,
  InputGroup,
  InputLeftAddon,
  useToast,
} from "@chakra-ui/react";
import { StarIcon } from "@chakra-ui/icons";
import { EditIcon } from "../components/icons/CustomIcons";
import { useUserStore } from "../stores/user.store";
import { useUploadStore } from "../stores/upload.store";
import { useTranslation } from 'react-i18next';

interface Product {
  id: number;
  name: string;
  image: string;
  rating: number;
}

const orderedProducts: Product[] = [
  {
    id: 1,
    name: "Over print Varnish",
    image: "/images/prod1.jpg",
    rating: 4,
  },
  {
    id: 2,
    name: "Over print Varnish",
    image: "/images/prod2.jpg",
    rating: 3.5,
  },
  {
    id: 3,
    name: "Over print Varnish",
    image: "/images/prod3.png",
    rating: 4,
  },
  {
    id: 4,
    name: "Over print Varnish",
    image: "/images/prod4.jpg",
    rating: 4.5,
  },
];

const Rating = ({ rating }: { rating: number }) => {
  return (
    <HStack spacing={1}>
      {Array(5)
        .fill("")
        .map((_, i) => (
          <StarIcon
            key={i}
            color={i < Math.floor(rating) ? "yellow.500" : "gray.300"}
          />
        ))}
    </HStack>
  );
};

const ProductCard = ({ product }: { product: Product }) => {
  const { t } = useTranslation();
  
  return (
    <Box
      borderWidth="1px"
      borderRadius="lg"
      overflow="hidden"
      p={4}
      bg="white"
      height="100%"
      display="flex"
      flexDirection="column"
    >
      <Box height="150px" mb={4} position="relative">
        <Image
          src={product.image}
          alt={product.name}
          objectFit="cover"
          width="100%"
          height="100%"
        />
      </Box>
      <Text fontWeight="semibold" mb={2} noOfLines={2}>
        {product.name}
      </Text>
      <Rating rating={product.rating} />
      <Button
        mt="auto"
        colorScheme="red"
        variant="outline"
        size="sm"
        width="100%"
      >
        {t('profileMoreDetails')}
      </Button>
    </Box>
  );
};

const ProfileImageUpload = ({
  onImageSelect,
}: {
  onImageSelect: (file: File) => void;
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { t } = useTranslation();

  const handleClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      onImageSelect(files[0]);
    }
  };

  return (
    <Box
      width="180px"
      height="180px"
      borderRadius="lg"
      borderWidth="1px"
      borderStyle="dashed"
      borderColor="gray.300"
      bg="gray.50"
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      cursor="pointer"
      onClick={handleClick}
      p={4}
      transition="all 0.2s"
      _hover={{ bg: "gray.100" }}
    >
      <Box fontSize="5xl" color="gray.400" mb={2}>
        📷
      </Box>
      <Text fontSize="md" color="gray.500" textAlign="center">
        {t('profileUploadPhoto')}
      </Text>
      <input
        type="file"
        ref={fileInputRef}
        style={{ display: "none" }}
        accept="image/*"
        onChange={handleFileChange}
      />
    </Box>
  );
};

const Profile = () => {
  const user = useUserStore((state) => state.user);
  const updateProfile = useUserStore((state) => state.updateProfile);
  const loading = useUserStore((state) => state.loading);
  const error = useUserStore((state) => state.error);
  const [isEditMode, setIsEditMode] = useState(false);
  const [formData, setFormData] = useState<any>(user || {});
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const toast = useToast();
  const { uploadImage, uploading } = useUploadStore();
  const { t } = useTranslation();

  useEffect(() => {
    if (user) setFormData(user);
  }, [user]);

  const toggleEditMode = () => {
    if (isEditMode && user) {
      setFormData(user);
      setSelectedImage(null);
    }
    setIsEditMode(!isEditMode);
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev: any) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Handle image selection
  const handleImageSelect = async (file: File) => {
    setSelectedImage(file);
    setIsUploading(true);

    const url = await uploadImage(file);

    if (url) {
      setFormData((prev: any) => ({
        ...prev,
        profilePic: url,
      }));
      toast({
        title: t('profileImageUploaded'),
        description: t('profileImageUploadedDesc'),
        status: "success",
        duration: 3000,
        isClosable: true,
      });
    } else {
      toast({
        title: t('profileUploadFailed'),
        description: t('profileUploadFailedDesc'),
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    }
    setIsUploading(false);
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateProfile(formData);
    setIsEditMode(false);
  };

  if (!user) {
    return (
      <Box py={8}>
        <Container maxW="container.xl">
          <Text>{t('profileNoUserFound')}</Text>
        </Container>
      </Box>
    );
  }

  const bioParagraphs = (user.bio || "").split(". ").filter(Boolean);

  return (
    <Box py={8}>
      <Container maxW="container.xl">
        {/* Profile Section */}
        <Box
          borderRadius="lg"
          overflow="hidden"
          bg="white"
          boxShadow="md"
          mb={10}
        >
          {isEditMode ? (
            /* Edit Mode */
            <Box as="form" onSubmit={handleSubmit}>
              {/* Profile Edit Form */}
              <Box p={6}>
                <Heading as="h2" size="lg" mb={6}>
                  {t('profileYourProfilePicture')}
                </Heading>

                <Grid templateColumns={{ base: "1fr", md: "1fr 2fr" }} gap={8}>
                  {/* Left Column - Profile Image */}
                  <Box>
                    <ProfileImageUpload onImageSelect={handleImageSelect} />
                  </Box>

                  {/* Right Column - Form Fields */}
                  <Box>
                    <Grid
                      templateColumns={{ base: "1fr", md: "1fr 1fr" }}
                      gap={4}
                    >
                      {/* Full Name */}
                      <FormControl>
                        <FormLabel htmlFor="username">{t('profileFullName')}</FormLabel>
                        <Input
                          id="username"
                          name="username"
                          placeholder={t('profileFullNamePlaceholder')}
                          value={formData.username || ""}
                          onChange={handleInputChange}
                        />
                      </FormControl>

                      {/* Email */}
                      <FormControl>
                        <FormLabel htmlFor="email">{t('profileEmail')}</FormLabel>
                        <Input
                          id="email"
                          name="email"
                          type="email"
                          placeholder={t('profileEmailPlaceholder')}
                          value={formData.email || ""}
                          onChange={handleInputChange}
                        />
                      </FormControl>

                      {/* Company Name */}
                      <FormControl>
                        <FormLabel htmlFor="companyName">
                          {t('profileCompanyName')}
                        </FormLabel>
                        <Input
                          id="companyName"
                          name="companyName"
                          placeholder={t('profileCompanyNamePlaceholder')}
                          value={formData.companyName || ""}
                          onChange={handleInputChange}
                        />
                      </FormControl>

                      {/* Phone Number */}
                      <FormControl>
                        <FormLabel htmlFor="phoneNumber">
                          {t('profilePhoneNumber')}
                        </FormLabel>
                        <Input
                          id="phoneNumber"
                          name="phoneNumber"
                          placeholder={t('profilePhoneNumberPlaceholder')}
                          value={formData.phoneNumber || ""}
                          onChange={handleInputChange}
                        />
                      </FormControl>
                    </Grid>

                    {/* Bio */}
                    <FormControl mt={4}>
                      <FormLabel htmlFor="bio">{t('profileBio')}</FormLabel>
                      <Textarea
                        id="bio"
                        name="bio"
                        placeholder={t('profileBioPlaceholder')}
                        value={formData.bio || ""}
                        onChange={handleInputChange}
                        minHeight="120px"
                      />
                    </FormControl>
                  </Box>
                </Grid>

                {/* Action Buttons */}
                <Flex mt={8} justifyContent="space-between">
                  <Button onClick={toggleEditMode} variant="outline">
                    {t('profileCancel')}
                  </Button>

                  <Button
                    type="submit"
                    colorScheme="red"
                    isLoading={loading || isUploading}
                  >
                    {t('profileUpdateProfile')}
                  </Button>
                </Flex>
              </Box>
            </Box>
          ) : (
            /* View Mode */
            <>
              {/* Profile Header */}
              <Flex direction="column">
                {/* Profile Details */}
                <Flex position="relative" p={6}>
                  {/* Left red line */}
                  <Box
                    position="absolute"
                    left={0}
                    top={0}
                    bottom={0}
                    width="4px"
                    bg="red.600"
                  />

                  {/* Profile Picture & Edit Button */}
                  <Box position="relative" mr={8}>
                    <Heading as="h2" fontSize="xl" mb={4}>
                      {t('profileYourProfilePicture')}
                    </Heading>
                    <Box
                      width="180px"
                      height="180px"
                      borderRadius="lg"
                      overflow="hidden"
                      position="relative"
                    >
                      {loading ? (
                        <Box
                          width="100%"
                          height="100%"
                          bg="gray.200"
                          display="flex"
                          alignItems="center"
                          justifyContent="center"
                        >
                          <Text>{t('profileLoading')}</Text>
                        </Box>
                      ) : (
                        <Image
                          src={
                            user.profilePic ||
                            "https://via.placeholder.com/180?text=Profile+Image"
                          }
                          alt="Profile Picture"
                          objectFit="cover"
                          width="100%"
                          height="100%"
                          fallbackSrc="https://via.placeholder.com/180?text=Profile+Image"
                        />
                      )}

                      {/* Edit button */}
                      <Circle
                        size="40px"
                        bg="red.600"
                        color="white"
                        position="absolute"
                        top={2}
                        right={2}
                        cursor="pointer"
                        _hover={{ bg: "red.700" }}
                        onClick={toggleEditMode}
                      >
                        <EditIcon boxSize={5} />
                      </Circle>
                    </Box>
                  </Box>

                  {/* Profile Information */}
                  <Box flex="1">
                    {loading ? (
                      <Flex justify="center" align="center" height="100%">
                        <Text>{t('profileLoadingInfo')}</Text>
                      </Flex>
                    ) : (
                      <Grid templateColumns="1fr 1fr" gap={6}>
                        {/* Left Column - Contact Information */}
                        <GridItem>
                          <VStack align="start" spacing={4}>
                            <Box>
                              <Text color="gray.500" fontSize="sm">
                                {t('profileFullName')}
                              </Text>
                              <Text fontWeight="medium">{user.username}</Text>
                            </Box>

                            <Box>
                              <Text color="gray.500" fontSize="sm">
                                {t('profileCompanyName')}
                              </Text>
                              <Text fontWeight="medium">
                                {user.companyName || t('profileNoCompany')}
                              </Text>
                            </Box>

                            <Box>
                              <Text color="gray.500" fontSize="sm">
                                {t('profileEmail')}
                              </Text>
                              <Text fontWeight="medium">{user.email}</Text>
                            </Box>

                            <Box>
                              <Text color="gray.500" fontSize="sm">
                                {t('profilePhoneNumber')}
                              </Text>
                              <Text fontWeight="medium">
                                {user.phoneNumber || t('profileNoNumber')}
                              </Text>
                            </Box>
                          </VStack>
                        </GridItem>

                        {/* Right Column - Bio */}
                        <GridItem>
                          <Box>
                            <Text color="gray.500" fontSize="sm" mb={2}>
                              {t('profileBio')}
                            </Text>
                            {bioParagraphs.map((paragraph, index) => (
                              <Text
                                key={index}
                                mb={index < bioParagraphs.length - 1 ? 3 : 0}
                              >
                                {paragraph}.
                              </Text>
                            ))}
                          </Box>
                        </GridItem>
                      </Grid>
                    )}
                  </Box>
                </Flex>
              </Flex>

              {/* Divider */}
              <Divider borderColor="gray.300" />

              {/* Products Ordered Section */}
              {/* <Box p={6}>
                <Heading as="h2" size="lg" mb={6}>Products ordered</Heading>
                
                {loading ? (
                  <Flex justify="center" p={10}>
                    <Text>Loading ordered products...</Text>
                  </Flex>
                ) : (
                  <Grid 
                    templateColumns={{ base: "1fr", md: "repeat(2, 1fr)", lg: "repeat(4, 1fr)" }} 
                    gap={6}
                  >
                    {orderedProducts.map(product => (
                      <ProductCard key={product.id} product={product} />
                    ))}
                  </Grid>
                )}
              </Box> */}
            </>
          )}
        </Box>
      </Container>
    </Box>
  );
};

export default Profile;
