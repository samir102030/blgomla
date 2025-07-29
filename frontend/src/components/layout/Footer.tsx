import {
  Box,
  Container,
  Grid,
  HStack,
  Text,
  Link,
  Image,
  Flex,
  IconButton,
} from "@chakra-ui/react";
import { ArrowUpIcon } from "@chakra-ui/icons";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useLanguageDirection } from "../../hooks/useLanguageDirection";
import { useEffect } from "react";
import { useCompanyProfileStore } from "../../stores/companyProfile.store";
import { useProductStore } from "../../stores/product.store";
import { useAdminLogoStore } from "../../stores/adminLogo.store";
import { useConsoleLog } from "../../hooks/useConsoleLog";
import SocialMediaIcons from "../home/SocialMediaButtons";
import {
  FaFacebook,
  FaInstagram,
  FaYoutube,
  FaLinkedin,
} from "react-icons/fa";
import { FaXTwitter } from "react-icons/fa6";

const Footer = () => {
  const currentYear = new Date().getFullYear();
  const { t } = useTranslation();
  const { dir, isRTL } = useLanguageDirection();
  const navigate = useNavigate();
  const { log } = useConsoleLog();

  // Fetch location and social links from store
  const { location, socialLinks, fetchLocation, fetchSocialLinks } =
    useCompanyProfileStore();
  const { categories, getAllCategories } = useProductStore();

  // Logo from database
  const { currentLogo, fetchCurrentLogo } = useAdminLogoStore();

  useEffect(() => {
    fetchLocation();
    fetchSocialLinks();
    getAllCategories();
    fetchCurrentLogo();
  }, [fetchLocation, fetchSocialLinks, getAllCategories, fetchCurrentLogo]);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  log("Social links loaded:", socialLinks, {
    dependencies: [socialLinks ? "loaded" : "null"],
  });

  // Helper: map social key to icon and color
  const socialIconMap = {
    facebook: { icon: FaFacebook, color: "#1877F3", label: "Facebook" },
    x: { icon: FaXTwitter, color: "#000", label: "X" },
    youtube: { icon: FaYoutube, color: "#FF0000", label: "YouTube" },
    instagram: { icon: FaInstagram, color: "#E4405F", label: "Instagram" },
    linkedin: { icon: FaLinkedin, color: "#0077B5", label: "LinkedIn" },
  } as const;
  const socialKeys = [
    "facebook",
    "x",
    "youtube",
    "instagram",
    "linkedin",
  ] as const;

  return (
    <Box bg="gray.50" dir={dir}>
      {/* logo wl goz2 elawl */}
      <Container maxW="1200px" py={4}>
        <Flex
          justify="space-between"
          align="center"
          direction={isRTL ? "row-reverse" : "row"}
        >
          <Image
            src={currentLogo?.url || "/images/logo1.png"}
            alt="EGY CHEM HUB"
            h="40px"
          />
          <IconButton
            aria-label="Return to top"
            icon={<ArrowUpIcon />}
            onClick={scrollToTop}
            colorScheme="red"
            rounded="full"
          />
        </Flex>
      </Container>

      {/* First Divider */}
      <Box h="1px" bg="red.500" />

      {/* goz2 2  */}
      <Container maxW="1200px" py={8}>
        <Grid templateColumns={{ base: "1fr", md: "repeat(3, 1fr)" }} gap={8}>
          {/* Company Section */}
          <Box>
            <Text
              color="red.600"
              fontWeight="bold"
              mb={4}
              textAlign={isRTL ? "right" : "left"}
            >
              {t("footerCompany")}
            </Text>
            <Grid gap={2}>
              <Link
                as={RouterLink}
                to="/products"
                onClick={() => window.scroll({ top: 0, behavior: "smooth" })}
                color="gray.600"
                textAlign={isRTL ? "right" : "left"}
              >
                {t("footerProducts")}
              </Link>
              <Link
                as={RouterLink}
                to="/request-sample"
                onClick={() => window.scroll({ top: 0, behavior: "smooth" })}
                color="gray.600"
                textAlign={isRTL ? "right" : "left"}
              >
                {t("footerServices")}
              </Link>
              <Link
                as={RouterLink}
                to="/industries"
                onClick={() => window.scroll({ top: 0, behavior: "smooth" })}
                color="gray.600"
                textAlign={isRTL ? "right" : "left"}
              >
                {t("footerIndustries")}
              </Link>
              <Link
                as={RouterLink}
                to="/contact"
                onClick={() => window.scroll({ top: 0, behavior: "smooth" })}
                color="gray.600"
                textAlign={isRTL ? "right" : "left"}
              >
                {t("footerContactUs")}
              </Link>
              <Link
                as={RouterLink}
                to="/news-events"
                onClick={() => window.scroll({ top: 0, behavior: "smooth" })}
                color="gray.600"
                textAlign={isRTL ? "right" : "left"}
              >
                {t("footerNewsArticles")}
              </Link>

              {/* Show location if public */}
              {location && location.isPublic && location.address && (
                <Box mt={2}>
                  {/* <Text color="gray.700" fontWeight="bold" fontSize="sm" mb={1}>{t('footerLocation') || 'Location'}</Text> */}

                  {/* Map View */}
                  {location.link && (
                    <Box mt={2}>
                      <iframe
                        src={location.link}
                        width="100%"
                        height="200"
                        style={{ border: 0 }}
                        allowFullScreen={true}
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                        title="Company Location Map"
                      />
                    </Box>
                  )}
                  <Text color="gray.600" fontSize="sm">
                    {location.link ? (
                      <a
                        href={location.link}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {location.address}
                      </a>
                    ) : (
                      location.address
                    )}
                  </Text>
                </Box>
              )}
            </Grid>
          </Box>

          {/* Resourcesss Section */}
          <Box>
            <Text
              color="red.600"
              fontWeight="bold"
              mb={4}
              textAlign={isRTL ? "right" : "left"}
            >
              {t("footerResources")}
            </Text>
            <Grid gap={2}>
              {/* <Link color="gray.600" textAlign={isRTL ? 'right' : 'left'}>{t('footerWaterTreatment')}</Link>
              <Link color="gray.600" textAlign={isRTL ? 'right' : 'left'}>{t('footerOleo')}</Link>
              <Link color="gray.600" textAlign={isRTL ? 'right' : 'left'}>{t('footerSodiumChloride')}</Link>
              <Link color="gray.600" textAlign={isRTL ? 'right' : 'left'}>{t('footerMining')}</Link>
              <Link color="gray.600" textAlign={isRTL ? 'right' : 'left'}>{t('footerPrinting')}</Link>
              <Link color="gray.600" textAlign={isRTL ? 'right' : 'left'}>{t('footerPaints')}</Link> */}
              {/* Category links */}
              {categories &&
                categories.map((cat) => (
                  <Link
                    key={cat._id}
                    color="gray.600"
                    textAlign={isRTL ? "right" : "left"}
                    cursor="pointer"
                    onClick={() => {
                      navigate(
                        `/products?industryCategory=${encodeURIComponent(
                          cat.name
                        )}`
                      );
                      window.scroll({ top: 0, behavior: "smooth" });
                    }}
                  >
                    {cat.name}
                  </Link>
                ))}
            </Grid>
          </Box>

          {/* Social Media Section */}
          {socialLinks && (
            <Box>
              <Text
                color="red.600"
                fontWeight="bold"
                mb={4}
                textAlign={isRTL ? "right" : "left"}
              >
                {t("footerFollowSocialMedia")}
              </Text>
              <HStack justify={isRTL ? "flex-end" : "flex-start"}>
                <SocialMediaIcons
                  iconSize={36}
                  icons={
                    socialKeys
                      .map((key) => {
                        const link = socialLinks[key];
                        if (
                          link &&
                          link.isPublic &&
                          typeof link.url === "string" &&
                          link.url.trim() !== ""
                        ) {
                          return {
                            href: link.url,
                            label: socialIconMap[key].label,
                            color: socialIconMap[key].color,
                            icon: socialIconMap[key].icon,
                          };
                        }
                        return null;
                      })
                      .filter(Boolean) as any
                  }
                />
              </HStack>
            </Box>
          )}
        </Grid>
      </Container>

      {/* Second Divider */}
      <Box h="1px" bg="red.500" />

      {/* copy right */}
      <Container maxW="1200px" py={4}>
        <Flex
          direction={{ base: "column", md: isRTL ? "row-reverse" : "row" }}
          justify="space-between"
          align="center"
          color="gray.600"
          fontSize="sm"
        >
          <Text textAlign={isRTL ? "right" : "left"}>
            {t("footerCopyright", { year: currentYear })}
          </Text>
          <HStack
            spacing={4}
            mt={{ base: 2, md: 0 }}
            direction={isRTL ? "row-reverse" : "row"}
          >
            <Link textAlign={isRTL ? "right" : "left"}>
              {t("footerTermsOfUse")}
            </Link>
            <Text>|</Text>
            <Link textAlign={isRTL ? "right" : "left"}>
              {t("footerPrivacyPolicy")}
            </Link>
          </HStack>
        </Flex>
      </Container>
    </Box>
  );
};

export default Footer;
