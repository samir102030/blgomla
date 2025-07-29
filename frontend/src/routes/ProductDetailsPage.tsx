import { Box } from '@chakra-ui/react'
import Navbar from '../components/layout/Navbar'
import Footer from '../components/layout/Footer'
import FloatingSidebar from '../components/layout/FloatingSidebar'
import ProductDetails from '../pages/ProductDetails'
import SEO from '../components/common/SEO'
import { useProductSEO } from '../hooks/useSEO'
import { useParams } from 'react-router-dom'
import { useProductStore } from '../stores/product.store'
import { useEffect } from 'react'

function ProductDetailsPage() {
  const { id } = useParams();
  const { getProductById, product, getProductsByCategoryId, categoryProducts } = useProductStore();

  useEffect(() => {
    if (id) {
      getProductById(id);
    }
  }, [id, getProductById]);

  useEffect(() => {
    if (product && typeof product.category === 'object' && product.category._id) {
      getProductsByCategoryId(product.category._id);
    }
  }, [product, getProductsByCategoryId]);

  const productSEO = useProductSEO(product);

  return (
    <Box>
      <SEO 
        title={productSEO.title}
        description={productSEO.description}
        keywords={productSEO.keywords}
        ogTitle={productSEO.ogTitle}
        ogDescription={productSEO.ogDescription}
        ogImage={productSEO.ogImage}
        ogType={productSEO.ogType}
        canonicalUrl={productSEO.canonicalUrl}
        structuredData={productSEO.structuredData}
      />
      <Navbar />
      <ProductDetails product={product} categoryProducts={categoryProducts} />
      <FloatingSidebar />
      <Footer />
    </Box>
  )
}

export default ProductDetailsPage