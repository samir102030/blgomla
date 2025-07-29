import { Box } from '@chakra-ui/react';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import FloatingSidebar from '../components/layout/FloatingSidebar';
import ContactUs from '../pages/ContactUs';
import SEO from '../components/common/SEO';
import { useSEO } from '../hooks/useSEO';

function ContactUsPage() {
  const { seoData } = useSEO({
    title: 'Contact Us - EGY-CHEM-HUB',
    description: 'Get in touch with EGY-CHEM-HUB for all your chemical solution needs. Contact our expert team for quotes, technical support, and business inquiries.',
    keywords: 'contact EGY-CHEM-HUB, chemical company contact, chemical solutions inquiry, technical support',
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
      <ContactUs />
      <FloatingSidebar />
      <Footer />
    </Box>
  );
}

export default ContactUsPage;