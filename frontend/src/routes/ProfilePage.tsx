import { Box } from '@chakra-ui/react'
import Navbar from '../components/layout/Navbar'
import Footer from '../components/layout/Footer'
import Profile from '../pages/Profile'
import FloatingSidebar from '../components/layout/FloatingSidebar'
import SEO from '../components/common/SEO'
import { useSEO } from '../hooks/useSEO'

function ProfilePage() {
  const { seoData } = useSEO({
    title: 'Profile - EGY-CHEM-HUB',
    description: 'View and manage your EGY-CHEM-HUB profile, update your information, and access your account settings.',
    keywords: 'profile, account, user, EGY-CHEM-HUB',
    ogTitle: 'Profile - EGY-CHEM-HUB',
    ogDescription: 'View and manage your EGY-CHEM-HUB profile, update your information, and access your account settings.'
  });
  return (
    <Box>
      <SEO {...seoData} />
      <Navbar />
      <Profile />
      <FloatingSidebar />
      <Footer />
    </Box>
  )
}

export default ProfilePage 