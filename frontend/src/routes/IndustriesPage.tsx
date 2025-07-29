import { Box } from '@chakra-ui/react'
import Navbar from '../components/layout/Navbar'
import Footer from '../components/layout/Footer'
import FloatingSidebar from '../components/layout/FloatingSidebar'
import Industries from '../pages/Industries'
import SEO from '../components/common/SEO'
import { useSEO } from '../hooks/useSEO'

function IndustriesPage() {
  const { seoData } = useSEO({
    title: 'Industries We Serve - EGY-CHEM-HUB',
    description: 'EGY-CHEM-HUB serves diverse industries including paints, coatings, pharmaceuticals, manufacturing, and more. Discover our industry-specific chemical solutions.',
    keywords: 'chemical industry solutions, paints industry, pharmaceutical chemicals, manufacturing chemicals, industrial applications',
    ogType: 'website'
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
      <Industries />
      <FloatingSidebar />
      <Footer />
    </Box>
  )
}

export default IndustriesPage 