import React, { useState, useEffect } from "react";
import {
  Box,
  Flex,
  Text,
  Heading,
  Button,
  VStack,
  HStack,
  Image,
  Icon,
  Switch,
  Input,
  useToast,
  Spinner,
  Center,
  Grid,
  GridItem,
  Select,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Alert,
  AlertIcon,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
} from "@chakra-ui/react";
import { EditIcon, AddIcon, DeleteIcon } from "@chakra-ui/icons";
import AdminProtectedRoute from "./AdminProtectedRoute";
import { companyProfileAPI } from "../../utils/api";
import {
  useCompanyProfileStore,
  SocialLinks,
} from "../../stores/companyProfile.store";
import { useAdminLogoStore, Logo } from "../../stores/adminLogo.store";

const socialLinksArray = [
  {
    label: "Facebook",
    url: "https://facebook.com",
    icon: "https://www.svgrepo.com/show/475647/facebook-color.svg",
  },
  {
    label: "X",
    url: "https://x.com",
    icon: "https://img.icons8.com/ios-filled/50/twitterx--v1.png",
  },
  {
    label: "YouTube",
    url: "https://youtube.com",
    icon: "https://www.svgrepo.com/show/475700/youtube-color.svg",
  },
  {
    label: "Instagram",
    url: "https://instagram.com",
    icon: "https://www.svgrepo.com/show/13639/instagram.svg",
  },
  {
    label: "LinkedIn",
    url: "https://linkedin.com",
    icon: "https://www.svgrepo.com/show/448234/linkedin.svg",
  },
];

// Types
interface WorkingHours {
  [key: string]: {
    isOpen: boolean;
    openTime: string;
    closeTime: string;
  };
}

interface CompanyProfileData {
  _id?: string;
  companyName: string;
  companyFullName: string;
  logo: string;
  location: {
    address: string;
    isPublic: boolean;
  };
  socialLinks: {
    facebook: { url: string; isPublic: boolean };
    x: { url: string; isPublic: boolean };
    youtube: { url: string; isPublic: boolean };
    instagram: { url: string; isPublic: boolean };
    linkedin: { url: string; isPublic: boolean };
  };
  contact: {
    email: string;
    phone: string;
    website: string;
  };
  workingHours: WorkingHours;
  workingHoursDisplay: {
    isPublic: boolean;
    timezone: string;
  };
}

const AdminCompanyProfile = () => {
  return (
    <AdminProtectedRoute>
      <AdminCompanyProfileMainView />
    </AdminProtectedRoute>
  );
};

const AdminCompanyProfileMainView = () => {
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [profileData, setProfileData] = useState<CompanyProfileData | null>(
    null
  );

  // Form state
  const [companyName, setCompanyName] = useState("");
  const [companyFullName, setCompanyFullName] = useState("");
  const [logo, setLogo] = useState("");
  const [location, setLocation] = useState("");
  const [social, setSocial] = useState({
    Facebook: "",
    X: "",
    Youtube: "",
    Instagram: "",
    LinkedIn: "",
  });
  const [socialToggles, setSocialToggles] = useState({
    Facebook: false,
    X: false,
    Youtube: false,
    Instagram: false,
    LinkedIn: false,
  });
  const [locationToggle, setLocationToggle] = useState(false);

  // Contact state
  const [contact, setContact] = useState({
    email: "",
    phone: "",
    website: "",
  });

  // Working hours state
  const [workingHours, setWorkingHours] = useState<WorkingHours>({});
  const [workingHoursPublic, setWorkingHoursPublic] = useState(true);
  const [timezone, setTimezone] = useState("Africa/Cairo");

  // Add state for location link
  const [locationLink, setLocationLink] = useState("");

  // Logo management state
  const [selectedLogoFile, setSelectedLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>("");

  const toast = useToast();
  const {
    isOpen: isLogoModalOpen,
    onOpen: onLogoModalOpen,
    onClose: onLogoModalClose,
  } = useDisclosure();

  const {
    location: storeLocation,
    socialLinks: storeSocialLinks,
    fetchLocation,
    updateLocation,
    fetchSocialLinks,
    updateSocialLinks,
  } = useCompanyProfileStore();

  const {
    currentLogo,
    allLogos,
    isLoading: logoLoading,
    isUploading: logoUploading,
    error: logoError,
    fetchCurrentLogo,
    fetchAllLogos,
    uploadLogo,
    setLogoActive,
    deleteLogo,
    clearError: clearLogoError,
  } = useAdminLogoStore();
  console.log(currentLogo);

  const daysOfWeek = [
    { key: "monday", label: "Monday" },
    { key: "tuesday", label: "Tuesday" },
    { key: "wednesday", label: "Wednesday" },
    { key: "thursday", label: "Thursday" },
    { key: "friday", label: "Friday" },
    { key: "saturday", label: "Saturday" },
    { key: "sunday", label: "Sunday" },
  ];

  // Load company profile data
  useEffect(() => {
    loadCompanyProfile();
  }, []);

  useEffect(() => {
    // Fetch location and social links from store
    fetchLocation();
    fetchSocialLinks();
  }, [fetchLocation, fetchSocialLinks]);

  useEffect(() => {
    if (storeLocation) {
      setLocation(storeLocation.address || "");
      setLocationLink(storeLocation.link || "");
      setLocationToggle(storeLocation.isPublic);
    }
    if (storeSocialLinks) {
      setSocial({
        Facebook: storeSocialLinks.facebook?.url || "",
        X: storeSocialLinks.x?.url || "",
        Youtube: storeSocialLinks.youtube?.url || "",
        Instagram: storeSocialLinks.instagram?.url || "",
        LinkedIn: storeSocialLinks.linkedin?.url || "",
      });
      setSocialToggles({
        Facebook: storeSocialLinks.facebook?.isPublic ?? false,
        X: storeSocialLinks.x?.isPublic ?? false,
        Youtube: storeSocialLinks.youtube?.isPublic ?? false,
        Instagram: storeSocialLinks.instagram?.isPublic ?? false,
        LinkedIn: storeSocialLinks.linkedin?.isPublic ?? false,
      });
    }
  }, [storeLocation, storeSocialLinks]);

  // Load logo data
  useEffect(() => {
    fetchCurrentLogo();
    fetchAllLogos();
  }, [fetchCurrentLogo, fetchAllLogos]);

  // Update logo when current logo changes
  useEffect(() => {
    if (currentLogo) {
      setLogo(currentLogo.url);
    }
  }, [currentLogo]);

  const loadCompanyProfile = async () => {
    try {
      setIsLoading(true);
      const response = await companyProfileAPI.get();
      const data = response.data.data || response.data; // support both structures
      setProfileData(data);

      // Set form data
      setCompanyName(data.companyName || "");
      setCompanyFullName(data.companyFullName || "");
      setLogo(data.logo || "");
      setLocation(data.location.address);
      setLocationToggle(data.location.isPublic);
      // Defensive: fallback for missing socialLinks
      const safeSocialLinks = data.socialLinks || {};
      setSocial({
        Facebook: safeSocialLinks.facebook?.url || "",
        X: safeSocialLinks.x?.url || "",
        Youtube: safeSocialLinks.youtube?.url || "",
        Instagram: safeSocialLinks.instagram?.url || "",
        LinkedIn: safeSocialLinks.linkedin?.url || "",
      });
      setSocialToggles({
        Facebook: safeSocialLinks.facebook?.isPublic ?? false,
        X: safeSocialLinks.x?.isPublic ?? false,
        Youtube: safeSocialLinks.youtube?.isPublic ?? false,
        Instagram: safeSocialLinks.instagram?.isPublic ?? false,
        LinkedIn: safeSocialLinks.linkedin?.isPublic ?? false,
      });

      // Set contact data
      setContact({
        email: data.contact?.email || "",
        phone: data.contact?.phone || "",
        website: data.contact?.website || "",
      });

      // Set working hours data
      setWorkingHours(data.workingHours || {});
      setWorkingHoursPublic(data.workingHoursDisplay?.isPublic || true);
      setTimezone(data.workingHoursDisplay?.timezone || "Africa/Cairo");
    } catch (error) {
      console.error("Error loading company profile:", error);
      toast({
        title: "Error",
        description: "Failed to load company profile",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialChange = (label: string, value: string) => {
    setSocial((prev) => ({ ...prev, [label]: value }));
  };

  const handleSocialToggleChange = (label: string, value: boolean) => {
    setSocialToggles((prev) => ({ ...prev, [label]: value }));
  };

  const handleWorkingHoursChange = (
    day: string,
    field: string,
    value: string | boolean
  ) => {
    setWorkingHours((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        [field]: value,
      },
    }));
  };

  const handleContactChange = (field: string, value: string) => {
    setContact((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const [isSavingLocation, setIsSavingLocation] = useState(false);
  const [isSavingSocial, setIsSavingSocial] = useState(false);

  const handleSaveLocation = async () => {
    try {
      setIsSavingLocation(true);
      await updateLocation({
        address: location,
        link: locationLink,
        isPublic: locationToggle,
      });
      toast({
        title: "Success",
        description: "Location updated successfully",
        status: "success",
        duration: 3000,
        isClosable: true,
      });
      fetchLocation();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update location",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsSavingLocation(false);
    }
  };

  const handleSaveSocial = async () => {
    try {
      setIsSavingSocial(true);
      await updateSocialLinks({
        facebook: { url: social.Facebook, isPublic: socialToggles.Facebook },
        x: { url: social.X, isPublic: socialToggles.X },
        youtube: { url: social.Youtube, isPublic: socialToggles.Youtube },
        instagram: { url: social.Instagram, isPublic: socialToggles.Instagram },
        linkedin: { url: social.LinkedIn, isPublic: socialToggles.LinkedIn },
      });
      toast({
        title: "Success",
        description: "Social links updated successfully",
        status: "success",
        duration: 3000,
        isClosable: true,
      });
      fetchSocialLinks();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update social links",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsSavingSocial(false);
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      // Update location
      await updateLocation({
        address: location,
        link: locationLink,
        isPublic: locationToggle,
      });
      // Update social links
      await updateSocialLinks({
        facebook: { url: social.Facebook, isPublic: socialToggles.Facebook },
        x: { url: social.X, isPublic: socialToggles.X },
        youtube: { url: social.Youtube, isPublic: socialToggles.Youtube },
        instagram: { url: social.Instagram, isPublic: socialToggles.Instagram },
        linkedin: { url: social.LinkedIn, isPublic: socialToggles.LinkedIn },
      });
      toast({
        title: "Success",
        description: "Company profile updated successfully",
        status: "success",
        duration: 3000,
        isClosable: true,
      });
      setIsEditing(false);
      fetchLocation();
      fetchSocialLinks();
    } catch (error) {
      console.error("Error saving company profile:", error);
      toast({
        title: "Error",
        description: "Failed to save company profile",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    // Reset form data to original
    if (profileData) {
      setCompanyName(profileData.companyName || "");
      setCompanyFullName(profileData.companyFullName || "");
      setLogo(profileData.logo || "");
      setLocation(profileData.location.address);
      setLocationToggle(profileData.location.isPublic);
      setSocial({
        Facebook: profileData.socialLinks.facebook.url,
        X: profileData.socialLinks.x.url,
        Youtube: profileData.socialLinks.youtube.url,
        Instagram: profileData.socialLinks.instagram.url,
        LinkedIn: profileData.socialLinks.linkedin.url,
      });
      setSocialToggles({
        Facebook: profileData.socialLinks.facebook.isPublic,
        X: profileData.socialLinks.x.isPublic,
        Youtube: profileData.socialLinks.youtube.isPublic,  
        Instagram: profileData.socialLinks.instagram.isPublic,
        LinkedIn: profileData.socialLinks.linkedin.isPublic,
      });
      setContact({
        email: profileData.contact?.email || "",
        phone: profileData.contact?.phone || "",
        website: profileData.contact?.website || "",
      });
      setWorkingHours(profileData.workingHours || {});
      setWorkingHoursPublic(profileData.workingHoursDisplay?.isPublic || true);
      setTimezone(profileData.workingHoursDisplay?.timezone || "Africa/Cairo");
    }
  };

  const socialLabelToKey: Record<string, keyof SocialLinks> = {
    Facebook: "facebook",
    X: "x",
    Youtube: "youtube",
    Instagram: "instagram",
    LinkedIn: "linkedin",
  };

  const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  const handleLogoUpload = async () => {
    if (!selectedLogoFile) {
      toast({
        title: "Error",
        description: "Please select a logo file",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    try {
      await uploadLogo(selectedLogoFile);
      toast({
        title: "Success",
        description: "Logo uploaded successfully",
        status: "success",
        duration: 3000,
        isClosable: true,
      });
      onLogoModalClose();
      setSelectedLogoFile(null);
      setLogoPreview("");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to upload logo",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const handleSetLogoActive = async (logoId: string) => {
    try {
      await setLogoActive(logoId);
      toast({
        title: "Success",
        description: "Logo activated successfully",
        status: "success",
        duration: 3000,
        isClosable: true,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to activate logo",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
    }
  };

  const handleDeleteLogo = async (logoId: string) => {
    if (window.confirm("Are you sure you want to delete this logo?")) {
      try {
        await deleteLogo(logoId);
        toast({
          title: "Success",
          description: "Logo deleted successfully",
          status: "success",
          duration: 3000,
          isClosable: true,
        });
      } catch (error: any) {
        toast({
          title: "Error",
          description: error.message || "Failed to delete logo",
          status: "error",
          duration: 3000,
          isClosable: true,
        });
      }
    }
  };

  if (isLoading) {
    return (
      <Box p={12}>
        <Center h="400px">
          <Spinner size="xl" color="blue.500" />
        </Center>
      </Box>
    );
  }

  return (
    <Box p={12}>
      <Heading
        fontFamily="IBM Plex Sans"
        fontWeight={500}
        fontSize="32px"
        color="#3F0209"
        mb={12}
        lineHeight="56px"
      >
        Company Profile
      </Heading>

      <Tabs variant="enclosed" colorScheme="red">
        <TabList>
          <Tab>Basic Information</Tab>
          <Tab>Contact Information</Tab>
          <Tab>Working Hours</Tab>
        </TabList>

        <TabPanels>
          {/* Basic Information Tab */}
          <TabPanel>
            <VStack spacing={8} align="stretch">
              {/* Header with Edit Button */}
              <Flex justify="space-between" align="center">
                <Text fontSize="24px" fontWeight={600} color="#3F0209">
                  Basic Information
                </Text>
                {!isEditing ? (
                  <Button
                    leftIcon={<EditIcon />}
                    bg="#B40519"
                    color="white"
                    _hover={{ bg: "#9A0416" }}
                    borderRadius="lg"
                    fontFamily="IBM Plex Sans"
                    fontWeight={500}
                    fontSize="16px"
                    onClick={() => {
                      // Populate fields from store when entering edit mode
                      if (storeLocation) {
                        setLocation(storeLocation.address || "");
                        setLocationLink(storeLocation.link || "");
                        setLocationToggle(storeLocation.isPublic);
                      }
                      if (storeSocialLinks) {
                        setSocial({
                          Facebook: storeSocialLinks.facebook?.url || "",
                          X: storeSocialLinks.x?.url || "",
                          Youtube: storeSocialLinks.youtube?.url || "",
                          Instagram: storeSocialLinks.instagram?.url || "",
                          LinkedIn: storeSocialLinks.linkedin?.url || "",
                        });
                        setSocialToggles({
                          Facebook:
                            storeSocialLinks.facebook?.isPublic ?? false,
                          X: storeSocialLinks.x?.isPublic ?? false,
                          Youtube: storeSocialLinks.youtube?.isPublic ?? false,
                          Instagram:
                            storeSocialLinks.instagram?.isPublic ?? false,
                          LinkedIn:
                            storeSocialLinks.linkedin?.isPublic ?? false,
                        });
                      }
                      setIsEditing(true);
                    }}
                  >
                    Edit Profile
                  </Button>
                ) : (
                  <HStack spacing={4}>
                    <Button
                      variant="ghost"
                      color="#8D8D8D"
                      fontFamily="IBM Plex Sans"
                      onClick={handleCancel}
                    >
                      Cancel
                    </Button>
                    <Button
                      bg="#B40519"
                      color="white"
                      _hover={{ bg: "#9A0416" }}
                      borderRadius="lg"
                      fontFamily="IBM Plex Sans"
                      fontWeight={500}
                      fontSize="16px"
                      onClick={handleSave}
                      isLoading={isSaving}
                    >
                      Save Changes
                    </Button>
                  </HStack>
                )}
              </Flex>

              {/* Company Logo and Names */}
              <Grid templateColumns="repeat(2, 1fr)" gap={8}>
                <GridItem>
                  <VStack align="start" spacing={4}>
                    <Text fontSize="18px" fontWeight={500} color="#424242">
                      Company Logo
                    </Text>
                    <Image
                      src={currentLogo?.url || logo || "/images/logo1.png"}
                      alt="Company Logo"
                      boxSize="120px"
                      objectFit="contain"
                      borderRadius="lg"
                      border="2px solid #EAEAEA"
                      p={2}
                    />
                    {isEditing && (
                      <VStack spacing={2} align="start" w="100%">
                        <Button
                          leftIcon={<AddIcon />}
                          size="sm"
                          colorScheme="blue"
                          onClick={onLogoModalOpen}
                          fontFamily="IBM Plex Sans"
                          fontSize="14px"
                        >
                          Upload New Logo
                        </Button>
                        <Text fontSize="12px" color="#8D8D8D">
                          Current: {currentLogo?.originalName || "Default logo"}
                        </Text>
                      </VStack>
                    )}
                  </VStack>
                </GridItem>

                <GridItem>
                  <VStack align="start" spacing={4}>
                    <Box>
                      <Text
                        fontSize="18px"
                        fontWeight={500}
                        color="#424242"
                        mb={2}
                      >
                        Company Name
                      </Text>
                      {isEditing ? (
                        <Input
                          value={companyName}
                          onChange={(e) => setCompanyName(e.target.value)}
                          fontFamily="IBM Plex Sans"
                          fontSize="16px"
                          borderRadius="lg"
                          border="2px solid #BCBCBC"
                        />
                      ) : (
                        <Text
                          fontSize="20px"
                          color="#717171"
                          fontFamily="IBM Plex Sans"
                        >
                          {companyName || "Not set"}
                        </Text>
                      )}
                    </Box>

                    <Box>
                      <Text
                        fontSize="18px"
                        fontWeight={500}
                        color="#424242"
                        mb={2}
                      >
                        Full Company Name
                      </Text>
                      {isEditing ? (
                        <Input
                          value={companyFullName}
                          onChange={(e) => setCompanyFullName(e.target.value)}
                          fontFamily="IBM Plex Sans"
                          fontSize="16px"
                          borderRadius="lg"
                          border="2px solid #BCBCBC"
                        />
                      ) : (
                        <Text
                          fontSize="20px"
                          color="#717171"
                          fontFamily="IBM Plex Sans"
                        >
                          {companyFullName || "Not set"}
                        </Text>
                      )}
                    </Box>
                  </VStack>
                </GridItem>
              </Grid>

              {/* Location */}
              <Box>
                <Flex align="center" gap={4} mb={4}>
                  <Box color="#B40519" fontSize="20px">
                    📍
                  </Box>
                  <Text fontSize="18px" fontWeight={500} color="#424242">
                    Location
                  </Text>
                  {isEditing && (
                    <Switch
                      colorScheme="red"
                      isChecked={locationToggle}
                      onChange={(e) => setLocationToggle(e.target.checked)}
                    />
                  )}
                  <Text fontSize="14px" color="#8D8D8D">
                    {locationToggle ? "(Public)" : "(Private)"}
                  </Text>
                </Flex>
                {isEditing ? (
                  <>
                    <Input
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      fontFamily="IBM Plex Sans"
                      fontSize="16px"
                      borderRadius="lg"
                      border="2px solid #BCBCBC"
                      placeholder="Enter company address"
                    />
                    <Input
                      value={locationLink}
                      onChange={(e) => setLocationLink(e.target.value)}
                      fontFamily="IBM Plex Sans"
                      fontSize="16px"
                      borderRadius="lg"
                      border="2px solid #BCBCBC"
                      placeholder="Enter location link (Google Maps, etc.)"
                      mt={2}
                    />
                    <Button
                      mt={4}
                      colorScheme="red"
                      onClick={handleSaveLocation}
                      isLoading={isSavingLocation}
                    >
                      Save Location
                    </Button>
                  </>
                ) : (
                  <>
                    <Text
                      fontSize="20px"
                      color="#717171"
                      fontFamily="IBM Plex Sans"
                    >
                      {storeLocation && storeLocation.address
                        ? storeLocation.address
                        : "Not set"}
                    </Text>
                    {storeLocation &&
                      storeLocation.link &&
                      storeLocation.isPublic && (
                        <Text
                          fontSize="16px"
                          color="blue.500"
                          fontFamily="IBM Plex Sans"
                        >
                          <a
                            href={storeLocation.link}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            View Location
                          </a>
                        </Text>
                      )}
                  </>
                )}
              </Box>

              {/* Social Links */}
              <Box>
                <Text fontSize="18px" fontWeight={500} color="#424242" mb={4}>
                  Social Media Links
                </Text>
                <Grid templateColumns="repeat(2, 1fr)" gap={6}>
                  {socialLinksArray.map((link) => (
                    <GridItem key={link.label}>
                      <VStack align="start" spacing={2}>
                        <Flex align="center" gap={3}>
                          <Image
                            src={link.icon}
                            alt={link.label}
                            boxSize="24px"
                          />
                          <Text
                            fontSize="16px"
                            fontWeight={500}
                            color="#424242"
                          >
                            {link.label}
                          </Text>
                          {isEditing && (
                            <Switch
                              colorScheme="red"
                              size="sm"
                              isChecked={
                                socialToggles[
                                  link.label as keyof typeof socialToggles
                                ]
                              }
                              onChange={(e) =>
                                handleSocialToggleChange(
                                  link.label,
                                  e.target.checked
                                )
                              }
                            />
                          )}
                          <Text fontSize="12px" color="#8D8D8D">
                            {socialToggles[
                              link.label as keyof typeof socialToggles
                            ]
                              ? "(Public)"
                              : "(Private)"}
                          </Text>
                        </Flex>
                        {isEditing ? (
                          <Input
                            value={social[link.label as keyof typeof social]}
                            onChange={(e) =>
                              handleSocialChange(link.label, e.target.value)
                            }
                            placeholder={`${link.label} URL`}
                            fontFamily="IBM Plex Sans"
                            fontSize="14px"
                            borderRadius="lg"
                            border="2px solid #BCBCBC"
                          />
                        ) : (
                          <Text
                            fontSize="16px"
                            color="#717171"
                            fontFamily="IBM Plex Sans"
                          >
                            {storeSocialLinks &&
                            storeSocialLinks[socialLabelToKey[link.label]] &&
                            storeSocialLinks[socialLabelToKey[link.label]]!.url
                              ? storeSocialLinks[socialLabelToKey[link.label]]!
                                  .url
                              : "Not set"}
                          </Text>
                        )}
                      </VStack>
                    </GridItem>
                  ))}
                </Grid>
                {isEditing && (
                  <Button
                    mt={4}
                    colorScheme="red"
                    onClick={handleSaveSocial}
                    isLoading={isSavingSocial}
                  >
                    Save Social Links
                  </Button>
                )}
              </Box>
            </VStack>
          </TabPanel>

          {/* Contact Information Tab */}
          <TabPanel>
            <VStack spacing={6} align="stretch">
              <Text fontSize="24px" fontWeight={600} color="#3F0209" mb={4}>
                Contact Information
              </Text>

              <Grid templateColumns="repeat(1, 1fr)" gap={6}>
                <Box>
                  <Text fontSize="18px" fontWeight={500} color="#424242" mb={2}>
                    Email
                  </Text>
                  {isEditing ? (
                    <Input
                      value={contact.email}
                      onChange={(e) =>
                        handleContactChange("email", e.target.value)
                      }
                      placeholder="company@example.com"
                      fontFamily="IBM Plex Sans"
                      fontSize="16px"
                      borderRadius="lg"
                      border="2px solid #BCBCBC"
                    />
                  ) : (
                    <Text
                      fontSize="20px"
                      color="#717171"
                      fontFamily="IBM Plex Sans"
                    >
                      {contact.email || "Not set"}
                    </Text>
                  )}
                </Box>

                <Box>
                  <Text fontSize="18px" fontWeight={500} color="#424242" mb={2}>
                    Phone
                  </Text>
                  {isEditing ? (
                    <Input
                      value={contact.phone}
                      onChange={(e) =>
                        handleContactChange("phone", e.target.value)
                      }
                      placeholder="+1 234 567 8900"
                      fontFamily="IBM Plex Sans"
                      fontSize="16px"
                      borderRadius="lg"
                      border="2px solid #BCBCBC"
                    />
                  ) : (
                    <Text
                      fontSize="20px"
                      color="#717171"
                      fontFamily="IBM Plex Sans"
                    >
                      {contact.phone || "Not set"}
                    </Text>
                  )}
                </Box>

                <Box>
                  <Text fontSize="18px" fontWeight={500} color="#424242" mb={2}>
                    Website
                  </Text>
                  {isEditing ? (
                    <Input
                      value={contact.website}
                      onChange={(e) =>
                        handleContactChange("website", e.target.value)
                      }
                      placeholder="https://www.company.com"
                      fontFamily="IBM Plex Sans"
                      fontSize="16px"
                      borderRadius="lg"
                      border="2px solid #BCBCBC"
                    />
                  ) : (
                    <Text
                      fontSize="20px"
                      color="#717171"
                      fontFamily="IBM Plex Sans"
                    >
                      {contact.website || "Not set"}
                    </Text>
                  )}
                </Box>
              </Grid>
            </VStack>
          </TabPanel>

          {/* Working Hours Tab */}
          <TabPanel>
            <VStack spacing={6} align="stretch">
              <Flex justify="space-between" align="center">
                <Text fontSize="24px" fontWeight={600} color="#3F0209">
                  Working Hours
                </Text>
                {isEditing && (
                  <HStack spacing={4}>
                    <Text fontSize="16px" color="#424242">
                      Public:
                    </Text>
                    <Switch
                      colorScheme="red"
                      isChecked={workingHoursPublic}
                      onChange={(e) => setWorkingHoursPublic(e.target.checked)}
                    />
                  </HStack>
                )}
              </Flex>

              {isEditing && (
                <Box>
                  <Text fontSize="16px" fontWeight={500} color="#424242" mb={2}>
                    Timezone
                  </Text>
                  <Select
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    fontFamily="IBM Plex Sans"
                    fontSize="16px"
                    borderRadius="lg"
                    border="2px solid #BCBCBC"
                    maxW="300px"
                  >
                    <option value="Africa/Cairo">Africa/Cairo (UTC+2)</option>
                    <option value="America/New_York">
                      America/New_York (UTC-5)
                    </option>
                    <option value="Europe/London">Europe/London (UTC+0)</option>
                    <option value="Asia/Tokyo">Asia/Tokyo (UTC+9)</option>
                    <option value="Australia/Sydney">
                      Australia/Sydney (UTC+10)
                    </option>
                  </Select>
                </Box>
              )}

              <Grid templateColumns="repeat(1, 1fr)" gap={4}>
                {daysOfWeek.map((day) => (
                  <Flex
                    key={day.key}
                    align="center"
                    justify="space-between"
                    p={4}
                    bg="gray.50"
                    borderRadius="lg"
                  >
                    <Text
                      fontSize="16px"
                      fontWeight={500}
                      color="#424242"
                      minW="100px"
                    >
                      {day.label}
                    </Text>

                    {isEditing ? (
                      <HStack spacing={4}>
                        <Switch
                          colorScheme="red"
                          isChecked={workingHours[day.key]?.isOpen || false}
                          onChange={(e) =>
                            handleWorkingHoursChange(
                              day.key,
                              "isOpen",
                              e.target.checked
                            )
                          }
                        />
                        <Input
                          type="time"
                          value={workingHours[day.key]?.openTime || "09:00"}
                          onChange={(e) =>
                            handleWorkingHoursChange(
                              day.key,
                              "openTime",
                              e.target.value
                            )
                          }
                          isDisabled={!workingHours[day.key]?.isOpen}
                          maxW="120px"
                          fontSize="14px"
                        />
                        <Text color="#8D8D8D">to</Text>
                        <Input
                          type="time"
                          value={workingHours[day.key]?.closeTime || "17:00"}
                          onChange={(e) =>
                            handleWorkingHoursChange(
                              day.key,
                              "closeTime",
                              e.target.value
                            )
                          }
                          isDisabled={!workingHours[day.key]?.isOpen}
                          maxW="120px"
                          fontSize="14px"
                        />
                      </HStack>
                    ) : (
                      <Text fontSize="16px" color="#717171">
                        {workingHours[day.key]?.isOpen
                          ? `${workingHours[day.key]?.openTime || "09:00"} - ${
                              workingHours[day.key]?.closeTime || "17:00"
                            }`
                          : "Closed"}
                      </Text>
                    )}
                  </Flex>
                ))}
              </Grid>
            </VStack>
          </TabPanel>
        </TabPanels>
      </Tabs>

      {/* Logo Management Modal */}
      <Modal isOpen={isLogoModalOpen} onClose={onLogoModalClose} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Logo Management</ModalHeader>
          <ModalBody>
            <VStack spacing={6} align="stretch">
              {/* Upload New Logo */}
              <Box>
                <Text fontSize="16px" fontWeight={500} color="#424242" mb={3}>
                  Upload New Logo
                </Text>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoFileChange}
                  fontFamily="IBM Plex Sans"
                  fontSize="14px"
                />
                {logoPreview && (
                  <Box mt={3}>
                    <Text fontSize="14px" color="#424242" mb={2}>
                      Preview:
                    </Text>
                    <Image
                      src={logoPreview}
                      alt="Logo Preview"
                      boxSize="100px"
                      objectFit="contain"
                      borderRadius="lg"
                      border="2px solid #EAEAEA"
                    />
                  </Box>
                )}
              </Box>

              {/* Existing Logos */}
              <Box>
                <Text fontSize="16px" fontWeight={500} color="#424242" mb={3}>
                  Existing Logos
                </Text>
                {logoError && (
                  <Alert status="error" mb={4}>
                    <AlertIcon />
                    {logoError}
                  </Alert>
                )}
                {logoLoading ? (
                  <Center py={4}>
                    <Spinner />
                  </Center>
                ) : (
                  <VStack spacing={3} align="stretch">
                    {allLogos.map((logoItem: Logo) => (
                      <Flex
                        key={logoItem._id}
                        align="center"
                        justify="space-between"
                        p={3}
                        bg={logoItem.isActive ? "blue.50" : "gray.50"}
                        borderRadius="lg"
                        border={logoItem.isActive ? "2px solid" : "1px solid"}
                        borderColor={
                          logoItem.isActive ? "blue.200" : "gray.200"
                        }
                      >
                        <Flex align="center" gap={3}>
                          <Image
                            src={logoItem.url}
                            alt={logoItem.originalName}
                            boxSize="40px"
                            objectFit="contain"
                            borderRadius="md"
                            bg="white"
                          />
                          <VStack align="start" spacing={0}>
                            <Text
                              fontSize="14px"
                              fontWeight={500}
                              color="#424242"
                            >
                              {logoItem.originalName}
                            </Text>
                            <Text fontSize="12px" color="#8D8D8D">
                              {new Date(
                                logoItem.createdAt
                              ).toLocaleDateString()}
                            </Text>
                            {logoItem.isActive && (
                              <Text
                                fontSize="12px"
                                color="blue.500"
                                fontWeight={500}
                              >
                                Active
                              </Text>
                            )}
                          </VStack>
                        </Flex>
                        <HStack spacing={2}>
                          {!logoItem.isActive && (
                            <Button
                              size="sm"
                              colorScheme="blue"
                              onClick={() => handleSetLogoActive(logoItem._id)}
                              isLoading={logoLoading}
                            >
                              Activate
                            </Button>
                          )}
                          <Button
                            size="sm"
                            colorScheme="red"
                            variant="outline"
                            onClick={() => handleDeleteLogo(logoItem._id)}
                            isLoading={logoLoading}
                            isDisabled={logoItem.isActive}
                          >
                            <DeleteIcon />
                          </Button>
                        </HStack>
                      </Flex>
                    ))}
                  </VStack>
                )}
              </Box>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <HStack spacing={3}>
              <Button variant="ghost" onClick={onLogoModalClose}>
                Cancel
              </Button>
              <Button
                colorScheme="blue"
                onClick={handleLogoUpload}
                isLoading={logoUploading}
                isDisabled={!selectedLogoFile}
              >
                Upload Logo
              </Button>
            </HStack>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
};

export default AdminCompanyProfile;
