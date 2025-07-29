import { Box } from '@chakra-ui/react'
import Navbar from '../components/layout/Navbar'
import Footer from '../components/layout/Footer'
import FloatingSidebar from '../components/layout/FloatingSidebar'
import NewsEventDetails from '../pages/NewsEventDetails'
import SEO from '../components/common/SEO'
import { useSEO } from '../hooks/useSEO'

function NewsEventDetailsPage() {
  const { seoData } = useSEO({
    title: 'News & Events - EGY-CHEM-HUB',
    description: 'Stay updated with the latest news, events, and industry insights from EGY-CHEM-HUB. Discover chemical industry trends and company updates.',
    keywords: 'chemical news, industry events, EGY-CHEM-HUB updates, chemical industry trends',
    ogType: 'article'
  });

  return (
    <Box>
      <SEO 
        title={seoData.title}
        description={seoData.description}
        keywords={seoData.keywords}
        ogTitle={seoData.ogTitle}
        ogDescription={seoData.ogDescription}
        ogImage={seoData.ogImage}
        ogType={seoData.ogType}
        canonicalUrl={seoData.canonicalUrl}
        structuredData={seoData.structuredData}
      />
      <Navbar />
      <NewsEventDetails />
      <FloatingSidebar />
      <Footer />
    </Box>
  )
}

export default NewsEventDetailsPage 