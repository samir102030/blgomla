import React, { useState, useRef, useEffect } from "react";
import {
  Drawer,
  DrawerBody,
  DrawerOverlay,
  DrawerContent,
  DrawerCloseButton,
  IconButton,
  useBreakpointValue,
} from "@chakra-ui/react";
import { HamburgerIcon } from "@chakra-ui/icons";
import { useLocation } from "react-router-dom";
import { useUserStore } from "../../stores/user.store";
import Sidebar, { SidebarItem } from "../layout/Sidebar";

// All possible admin sidebar items with their permission keys
const allAdminSidebarItems: Array<SidebarItem & { permission?: string }> = [
  { label: "Dashboard", path: "/admin", permission: "dashboard" },
  { label: "About company", path: "/admin/about", permission: "about" },
  { label: "Products", path: "/admin/products", permission: "products" },
  { label: "Industries", path: "/admin/industries", permission: "industries" },
  { label: "Companies", path: "/admin/companies", permission: "companies" },
  { label: "Events", path: "/admin/events", permission: "events" },
  { label: "News", path: "/admin/news", permission: "news" },
  { label: "Articles", path: "/admin/articles", permission: "articles" },
  { label: "Customers", path: "/admin/customers", permission: "customers" },
  { label: "Admins", path: "/admin/admins", permission: "admins" },
  { label: "CRM", path: "/admin/crm", permission: "crm" },
 // { label: "Quote", path: "/admin/quotes", permission: "quotes" },
  { label: "Company profile", path: "/admin/company-profile", permission: "company-profile" },
  // { label: 'SEO Management', path: '/admin/seo' },
];

const AdminSidebar = () => {
  // Determine if the viewport is mobile-sized (below the `md` breakpoint)
  const isMobile = useBreakpointValue({ base: true, md: false });

  // State to control the mobile drawer visibility
  const [isOpen, setIsOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);

  // Get current user and their permissions
  const user = useUserStore(state => state.user);
  const getProfile = useUserStore(state => state.getProfile);

  // Close the drawer whenever the route changes (helps with navigation UX)
  const location = useLocation();
  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);

  // Refresh user profile to ensure latest permissions are loaded
  useEffect(() => {
    if (user && user.isAdmin) {
      getProfile().catch(console.error);
    }
  }, [user?.isAdmin, getProfile]);

  // Filter sidebar items based on user permissions
  const getFilteredSidebarItems = (): SidebarItem[] => {
    if (!user) return [];

    // Super admin (admin@example.com) can see all items
    if (user.email === 'admin@example.com') {
      return allAdminSidebarItems.map(item => ({ label: item.label, path: item.path }));
    }

    // Regular admins can only see items they have permissions for
    return allAdminSidebarItems
      .filter(item => {
        // If item has no permission requirement, don't show it (except for super admin)
        if (!item.permission) {
          return false;
        }
        
        // Check if user has this permission
        return user.adminPermissions?.includes(item.permission);
      })
      .map(item => ({ label: item.label, path: item.path }));
  };

  const adminSidebarItems = getFilteredSidebarItems();

  // Render a hamburger button + drawer on mobile screens
  if (isMobile) {
    return (
      <>
        <IconButton
          ref={btnRef}
          icon={<HamburgerIcon />}
          aria-label="Open menu"
          variant="outline"
          position="fixed"
          top="100px"
          left={4}
          zIndex={1100}
          onClick={() => setIsOpen(true)}
          colorScheme="red"
          bg="white"
        />
        <Drawer
          isOpen={isOpen}
          placement="left"
          onClose={() => setIsOpen(false)}
          finalFocusRef={btnRef}
          size="xs"
        >
          <DrawerOverlay />
          <DrawerContent>
            <DrawerCloseButton />
            {/* Use p={0} so the Sidebar keeps its own padding */}
            <DrawerBody p={0}>
              <Sidebar items={adminSidebarItems} />
            </DrawerBody>
          </DrawerContent>
        </Drawer>
      </>
    );
  }

  // Default desktop sidebar
  return <Sidebar items={adminSidebarItems} />;
};

export default AdminSidebar;
