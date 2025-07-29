import { Box } from '@chakra-ui/react'
import Navbar from '../components/layout/Navbar'
import Footer from '../components/layout/Footer'
import FloatingSidebar from '../components/layout/FloatingSidebar'
import Products from '../pages/Products'
import SEO from '../components/common/SEO'
import { useSEO } from '../hooks/useSEO'

function ProductsPage() {
  const { seoData } = useSEO({
    title: 'Chemical Products - EGY-CHEM-HUB',
    description: 'Explore our comprehensive range of high-quality chemical products for various industries. Find the perfect chemical solutions for your manufacturing needs.',
    keywords: 'chemical products, industrial chemicals, manufacturing chemicals, chemical solutions, EGY-CHEM-HUB products',
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
      <Products />
      <FloatingSidebar />
      <Footer />
    </Box>
  )
}

export default ProductsPage