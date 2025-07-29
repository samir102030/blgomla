import { Box } from '@chakra-ui/react'
import Navbar from '../components/layout/Navbar'
import Footer from '../components/layout/Footer'
import Home from '../pages/Home'
import FloatingSidebar from '../components/layout/FloatingSidebar'
import SEO from '../components/common/SEO'
import { useSEO } from '../hooks/useSEO'

function HomePage() {
  const { seoData } = useSEO();

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
        twitterCard={seoData.twitterCard}
        twitterSite={seoData.twitterSite}
        twitterCreator={seoData.twitterCreator}
        canonicalUrl={seoData.canonicalUrl}
        structuredData={seoData.structuredData}
      />
      <Navbar />
      <Home />
      <FloatingSidebar />
      <Footer />
    </Box>
  )
}

export default HomePage