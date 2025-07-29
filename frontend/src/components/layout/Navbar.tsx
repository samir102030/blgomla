import { 
  Box, 
  Flex, 
  Button, 
  Image, 
  HStack, 
  Menu, 
  MenuButton, 
  MenuList, 
  MenuItem,
  Link,
  LinkProps,
  Text,
  IconButton,
  useDisclosure,
  Drawer,
  DrawerOverlay,
  DrawerContent,
  DrawerCloseButton,
  DrawerHeader,
  DrawerBody,
  VStack,
  useBreakpointValue,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Badge,
  Spinner
} from '@chakra-ui/react'
import { ChevronDownIcon, HamburgerIcon, BellIcon } from '@chakra-ui/icons'
import { ReactNode, useEffect, useState } from 'react'
import { Link as RouterLink, useLocation } from 'react-router-dom'
import { CustomerIcon } from '../icons/CustomIcons'
import { useUserStore } from '../../stores/user.store'
import { useTranslation } from 'react-i18next'
import { useLanguageDirection } from '../../hooks/useLanguageDirection'
import { useNotificationStore } from '../../stores/notification.store'
import { useAdminLogoStore } from '../../stores/adminLogo.store'

const languages = [
  { code: 'EN', flag: '/flags/en.png', name: 'English' },
  { code: 'AR', flag: '/flags/ar.png', name: 'Arabic' },
  { code: 'FR', flag: '/flags/fr.png', name: 'French' },
  { code: 'ZH', flag: '/flags/zh.png', name: 'Chinese' },
  // { code: 'TR', flag: '/flags/tr.png', name: 'Turkish' },
  { code: 'ES', flag: '/flags/es.png', name: 'Spanish' },
  { code: 'RU', flag: '/flags/ru.png', name: 'Russian' },
  // { code: 'IT', flag: '/flags/it.png', name: 'Italian' },
  { code: 'JA', flag: '/flags/ja.png', name: 'Japanese' },
  { code: 'DE', flag: '/flags/de.png', name: 'German' },
];

interface NavLinkProps extends Omit<LinkProps, 'href'> {
  href: string;
  children: ReactNode;
  isActive?: boolean;
}

const NavLink = ({ href, children, isActive = false, ...props }: NavLinkProps) => (
  <Link
    as={RouterLink}
    to={href}
    position="relative"
    color={isActive ? "red.600" : "gray.700"}
    _hover={{
      color: "red.600",
      textDecoration: "none",
      _after: {
        width: "100%",
      }
    }}
    _after={{
      content: '""',
      position: "absolute",
      width: isActive ? "100%" : "0%",
      height: "2px",
      bottom: "-2px",
      left: "0",
      bg: "red.600",
      transition: "all 0.3s ease"
    }}
    {...props}
  >
    {children}
  </Link>
);

interface NavbarProps {
  isSticky?: boolean;
}

const Navbar = ({ isSticky = true }: NavbarProps) => {
  const location = useLocation();
  const currentPath = location.pathname;
  // console.log(currentPath.includes('products'));
  const lang = useUserStore(state => state.lang);
  const user = useUserStore(state => state.user);
  const {logout} = useUserStore();
  const setLang = useUserStore(state => state.setLang);
  const { t } = useTranslation();
  const { dir, isRTL } = useLanguageDirection();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const isMobile = useBreakpointValue({ base: true, md: false });
  
  // Logo from database
  const { currentLogo, fetchCurrentLogo } = useAdminLogoStore();
  
  const {
    notifications,
    loading: notificationsLoading,
    error: notificationsError,
    fetchNotifications,
    fetchAllNotifications,
    markAsRead,
    markAllAsRead,
    showAll,
    setShowAll,
    deleteNotification
  } = useNotificationStore();
  const unreadCount = notifications.filter(n => !n.read).length;
  const [isNotifOpen, setNotifOpen] = useState(false);
  
  useEffect(() =>{
    console.log("lang " + lang);
  }, [lang])

  // Fetch notifications on mount
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Fetch current logo on mount
  useEffect(() => {
    fetchCurrentLogo();
  }, [fetchCurrentLogo]);

  const handleShowAllToggle = async () => {
    if (showAll) {
      setShowAll(false);
      await fetchNotifications();
    } else {
      setShowAll(true);
      await fetchAllNotifications();
    }
  };

  return (
    <Box 
      bg="gray.50" 
      py={4} 
      borderBottom="1px" 
      borderColor="gray.200" 
      dir={dir}
      position={isSticky ? "sticky" : "static"}
      top={0}
      zIndex={1000}
      boxShadow="sm"
      width="100%"
    >
      <Flex
        maxW="1300px"
        mx="auto"
        px={4}
        align="center"
        justify="space-between"
        direction="row"
      >
        {/* Left: Logo + Navigation Links (row or row-reverse) */}
        <Flex align="center" direction="row" gap={8}>
          {/* Logo */}
          <Link href="/">
            <Flex gap={4} direction={isRTL ? 'row-reverse' : 'row'} align="center">
              <Image 
                src={currentLogo?.url || "/images/logo1.png"} 
                h="30px" 
                _hover={{ opacity: 0.8 }}
                transition="opacity 0.2s"
                alt="Company Logo"
              />
              <Image 
                src="/images/logo2.png" 
                h="30px" 
                _hover={{ opacity: 0.8 }}
                transition="opacity 0.2s"
                alt="Company Logo Secondary"
              />
            </Flex>
          </Link>
          {/* Navigation Links */}
          {/* Desktop Nav */}
          <Flex
            gap={8}
            direction="row"
            flexWrap="wrap"
            justify={isRTL ? 'flex-end' : 'flex-start'}
            align="center"
            flexDir={isRTL ? 'row-reverse' : 'row'}
            display={{ base: 'none', md: 'flex' }}
            overflowX="auto"
            sx={{
              scrollbarWidth: 'none', // Firefox
              '&::-webkit-scrollbar': { display: 'none' }, // Chrome/Safari
            }}
          >
            <NavLink href="/" isActive={currentPath === "/"}>
              {t('home')}
            </NavLink>
            <NavLink href="/products" isActive={currentPath === "/products" || currentPath.includes('products')}>
              {t('products')}
            </NavLink>
            <NavLink href="/industries" isActive={currentPath === "/industries" || currentPath.includes('industries')}>
              {t('industries')}
            </NavLink>
            <NavLink href="/request-sample" isActive={currentPath === "/request-sample"}>
              {t('services')}
            </NavLink>
            <NavLink href="/news-events" isActive={currentPath === "/news-events" || currentPath.includes('news') || currentPath.includes('articles')}>
              {t('newsArticles')}
            </NavLink>
            <NavLink href="/contact" isActive={currentPath === "/contact"}>
              {t('contactUs')}
            </NavLink>
            {user?.isAdmin && (
              <NavLink href="/admin" isActive={currentPath === "/admin" || currentPath.includes('admin')}>
                {t('admin')}
              </NavLink>
            )}
          </Flex>
          {/* Mobile Hamburger */}
          <IconButton
            aria-label="Open menu"
            icon={<HamburgerIcon />}
            display={{ base: 'flex', md: 'none' }}
            onClick={onOpen}
            variant="ghost"
            size="md"
          />
        </Flex>
        {/* Right: User/Profile/Language/Logout */}
        <Flex align="center" gap={4} direction={isRTL ? 'row-reverse' : 'row'}>
          {/* Notification Bell Icon */}
          {(user && user.isAdmin) && (
            <Box position="relative">
              <IconButton
                aria-label="Notifications"
                icon={<BellIcon boxSize={6} />}
                variant="ghost"
                onClick={() => setNotifOpen(true)}
              />
              {unreadCount > 0 && (
                <Badge
                  colorScheme="red"
                  borderRadius="full"
                  position="absolute"
                  top={1}
                  right={1}
                  fontSize="0.65em"
                  px={1}
                  py={0.5}
                  minW="16px"
                  h="16px"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  zIndex={1}
                >
                  {unreadCount}
                </Badge>
              )}
            </Box>
          )}
          {/* Notification Modal */}
          <Modal isOpen={isNotifOpen} onClose={() => setNotifOpen(false)} size="lg">
            <ModalOverlay />
            <ModalContent>
              <ModalHeader>Notifications</ModalHeader>
              <ModalBody>
                {notificationsLoading && <Spinner />}
                {notificationsError && <Text color="red.500">{notificationsError}</Text>}
                {notifications.length === 0 && !notificationsLoading && <Text>No notifications.</Text>}
                <VStack align="stretch" spacing={4}>
                  {notifications.map((n) => (
                    <Flex key={n._id} align="center" justify="space-between" bg={n.read ? 'gray.100' : 'yellow.50'} p={3} borderRadius="md">
                      <Box>
                        <Text fontWeight={n.read ? 'normal' : 'bold'}>{n.title}</Text>
                        <Text fontSize="sm" color="gray.600">{n.description}</Text>
                        <Text fontSize="xs" color="gray.400">{new Date(n.time).toLocaleString()}</Text>
                      </Box>
                      <Flex gap={2}>
                        {!n.read && (
                          <Button size="sm" colorScheme="green" onClick={() => markAsRead(n._id)}>
                            Mark as read
                          </Button>
                        )}
                        {n.read && (
                          <Button size="sm" colorScheme="red" variant="outline" onClick={() => deleteNotification(n._id)}>
                            Delete
                          </Button>
                        )}
                      </Flex>
                    </Flex>
                  ))}
                </VStack>
              </ModalBody>
              <ModalFooter>
                <Button colorScheme="gray" mr={3} onClick={handleShowAllToggle}>
                  {showAll ? 'Show Unread' : 'Show All'}
                </Button>
                <Button colorScheme="blue" mr={3} onClick={async () => { await markAllAsRead(); }}>
                  Mark all as Read
                </Button>
                <Button variant="ghost" onClick={() => setNotifOpen(false)}>Close</Button>
              </ModalFooter>
            </ModalContent>
          </Modal>
          {!user ? 
            <Button
              as={RouterLink}
              to="/login"
              bg="gray.600"
              color="white"
              _hover={{ bg: 'gray.700' }}
              size="md"
              px={6}
              leftIcon={isRTL ? <Box as="span" mr={2}>←</Box> : undefined}
              rightIcon={isRTL ? undefined : <Box as="span" ml={2}>→</Box>}
              display={{ base: 'none', md: 'flex' }}
            >
              {t('login')}
            </Button>
            :
            <Button
              as={RouterLink}
              to="/login"
              bg="gray.600"
              color="white"
              _hover={{ bg: 'gray.700' }}
              size="md"
              px={6}
              leftIcon={isRTL ? <Box as="span" mr={2}>←</Box> : undefined}
              rightIcon={isRTL ? undefined : <Box as="span" ml={2}>→</Box>}
              onClick={() => logout()}
              display={{ base: 'none', md: 'flex' }}
            >
              {t('logout')}
            </Button>
          }

          {user && <IconButton
            as={RouterLink}
            to="/profile"
            aria-label="Profile"
            icon={<CustomerIcon boxSize={5} />}
            variant="ghost"
            borderRadius="full"
            _hover={{ bg: 'gray.100' }}
            display={{ base: 'none', md: 'flex' }}
          />}

          {!currentPath.includes('admin') && (
            <Menu>
              <MenuButton
                as={Button}
                leftIcon={isRTL ? <ChevronDownIcon /> : undefined}
                rightIcon={isRTL ? undefined : <ChevronDownIcon />}
                variant="ghost"
                p={2}
                _hover={{ bg: 'gray.100' }}
                _active={{ bg: 'gray.200' }}
                display={{ base: 'none', md: 'flex' }}
              >
                <Flex align="center" direction="row" gap={2}>
                  <Box 
                    width="24px" 
                    height="24px" 
                    borderRadius="full" 
                    overflow="hidden"
                    border="1px solid"
                    borderColor="gray.200"
                  >
                    <Image
                      src={`/flags/${lang || "en"}.png`}
                      alt="Flag"
                      width="100%"
                      height="100%"
                      objectFit="cover"
                    />
                  </Box>
                  <Text>{lang.toUpperCase() || "EN"}</Text>
                </Flex>
              </MenuButton>
              <MenuList py={2}>
                {languages.map((lang) => (
                  <MenuItem 
                    key={lang.code}
                    _hover={{ bg: 'gray.100' }}
                    px={4}
                    py={2}
                    onClick={() => setLang(lang.code.toLowerCase())}
                  >
                    <Flex align="center" direction="row" gap={2}>
                      <Box 
                        width="24px" 
                        height="24px" 
                        borderRadius="full" 
                        overflow="hidden"
                        border="1px solid"
                        borderColor="gray.200"
                      >
                        <Image
                          src={`/flags/${lang.code.toLowerCase() || "en"}.png`}
                          alt={`${lang.name} Flag`}
                          width="100%"
                          height="100%"
                          objectFit="cover"
                        />
                      </Box>
                      <Text>{lang.code}</Text>
                    </Flex>
                  </MenuItem>
                ))}
              </MenuList>
            </Menu>
          )}
        </Flex>
      </Flex>
      {/* Mobile Drawer */}
      <Drawer placement={isRTL ? 'right' : 'left'} onClose={onClose} isOpen={isOpen}>
        <DrawerOverlay />
        <DrawerContent>
          <DrawerCloseButton />
          <DrawerHeader>{t('menu')}</DrawerHeader>
          <DrawerBody>
            <VStack align="stretch" spacing={4} mt={4}>
              <NavLink href="/" isActive={currentPath === "/"} onClick={onClose}>
                {t('home')}
              </NavLink>
              <NavLink href="/products" isActive={currentPath === "/products" || currentPath.includes('products')} onClick={onClose}>
                {t('products')}
              </NavLink>
              <NavLink href="/industries" isActive={currentPath === "/industries" || currentPath.includes('industries')} onClick={onClose}>
                {t('industries')}
              </NavLink>
              <NavLink href="/request-sample" isActive={currentPath === "/request-sample"} onClick={onClose}>
                {t('services')}
              </NavLink>
              <NavLink href="/news-events" isActive={currentPath === "/news-events" || currentPath.includes('news') || currentPath.includes('articles')} onClick={onClose}>
                {t('newsArticles')}
              </NavLink>
              <NavLink href="/contact" isActive={currentPath === "/contact"} onClick={onClose}>
                {t('contactUs')}
              </NavLink>
              {user?.isAdmin && (
                <NavLink href="/admin" isActive={currentPath === "/admin" || currentPath.includes('admin')} onClick={onClose}>
                  {t('admin')}
                </NavLink>
              )}
              <Box pt={4}>
                {!user ? (
                  <Button
                    as={RouterLink}
                    to="/login"
                    bg="gray.600"
                    color="white"
                    _hover={{ bg: 'gray.700' }}
                    size="md"
                    w="100%"
                    onClick={onClose}
                  >
                    {t('login')}
                  </Button>
                ) : (
                  <Button
                    as={RouterLink}
                    to="/login"
                    bg="gray.600"
                    color="white"
                    _hover={{ bg: 'gray.700' }}
                    size="md"
                    w="100%"
                    onClick={() => { logout(); onClose(); }}
                  >
                    {t('logout')}
                  </Button>
                )}
              </Box>
              {user && (
                <IconButton
                  as={RouterLink}
                  to="/profile"
                  aria-label="Profile"
                  icon={<CustomerIcon boxSize={5} />}
                  variant="ghost"
                  borderRadius="full"
                  _hover={{ bg: 'gray.100' }}
                  w="100%"
                  onClick={onClose}
                />
              )}
              {!currentPath.includes('admin') && (
                <Menu>
                  <MenuButton as={Button} w="100%" variant="outline">
                    <Flex align="center" direction="row" gap={2}>
                      <Box 
                        width="24px" 
                        height="24px" 
                        borderRadius="full" 
                        overflow="hidden"
                        border="1px solid"
                        borderColor="gray.200"
                      >
                        <Image
                          src={`/flags/${lang || "en"}.png`}
                          alt="Flag"
                          width="100%"
                          height="100%"
                          objectFit="cover"
                        />
                      </Box>
                      <Text>{lang.toUpperCase() || "EN"}</Text>
                    </Flex>
                  </MenuButton>
                  <MenuList>
                    {languages.map((lang) => (
                      <MenuItem 
                        key={lang.code}
                        onClick={() => { setLang(lang.code.toLowerCase()); onClose(); }}
                      >
                        <Flex align="center" direction="row" gap={2}>
                          <Box 
                            width="24px" 
                            height="24px" 
                            borderRadius="full" 
                            overflow="hidden"
                            border="1px solid"
                            borderColor="gray.200"
                          >
                            <Image
                              src={`/flags/${lang.code.toLowerCase() || "en"}.png`}
                              alt={`${lang.name} Flag`}
                              width="100%"
                              height="100%"
                              objectFit="cover"
                            />
                          </Box>
                          <Text>{lang.code}</Text>
                        </Flex>
                      </MenuItem>
                    ))}
                  </MenuList>
                </Menu>
              )}
            </VStack>
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </Box>
  )
}

export default Navbar
