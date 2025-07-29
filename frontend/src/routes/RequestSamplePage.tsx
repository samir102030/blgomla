import { Box } from '@chakra-ui/react';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import FloatingSidebar from '../components/layout/FloatingSidebar';
import RequestSample from '../pages/RequestSample';
import SEO from '../components/common/SEO';
import { useSEO } from '../hooks/useSEO';

function RequestSamplePage() {
  const { seoData } = useSEO({
    title: 'Request Sample - EGY-CHEM-HUB',
    description: 'Request free samples of our high-quality chemical products. Test our solutions before making your purchase decision. Fast and reliable sample delivery.',
    keywords: 'chemical sample request, free chemical samples, product testing, chemical solutions trial',
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
      <RequestSample />
      <FloatingSidebar />
      <Footer />
    </Box>
  );
}

export default RequestSamplePage;