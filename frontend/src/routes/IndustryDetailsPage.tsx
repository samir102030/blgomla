import { Box } from '@chakra-ui/react'
import Navbar from '../components/layout/Navbar'
import Footer from '../components/layout/Footer'
import IndustryDetails from '../pages/IndustryDetails'
import FloatingSidebar from '../components/layout/FloatingSidebar'
import SEO from '../components/common/SEO'
import { useSEO } from '../hooks/useSEO'
import { useParams } from 'react-router-dom'
import { dummyIndustries } from '../data/dummyData'

function IndustryDetailsPage() {
  const { id } = useParams();
  const industry = dummyIndustries.find(i => i._id === id);
  const { seoData } = useSEO(industry ? {
    title: `${industry.name} - ${industry.category} | EGY-CHEM-HUB`,
    description: industry.description,
    keywords: `${industry.name}, ${industry.category}, chemical industry, EGY-CHEM-HUB`,
    ogTitle: `${industry.name} - ${industry.category} | EGY-CHEM-HUB`,
    ogDescription: industry.description,
    ogImage: industry.image
  } : {
    title: 'Industry Details - EGY-CHEM-HUB',
    description: 'Explore detailed information about this industry and its chemical solutions at EGY-CHEM-HUB.',
    keywords: 'industry, chemical industry, EGY-CHEM-HUB',
    ogTitle: 'Industry Details - EGY-CHEM-HUB',
    ogDescription: 'Explore detailed information about this industry and its chemical solutions at EGY-CHEM-HUB.'
  });
  return (
    <Box>
      <SEO {...seoData} />
      <Navbar />
      <IndustryDetails />
      <FloatingSidebar />
      <Footer />
    </Box>
  )
}

export default IndustryDetailsPage 