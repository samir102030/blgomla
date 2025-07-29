import Register from '../pages/Register'
import SEO from '../components/common/SEO'
import { useSEO } from '../hooks/useSEO'

function RegisterPage() {
  const { seoData } = useSEO({
    title: 'Register - EGY-CHEM-HUB',
    description: 'Create an account to access premium chemical solutions and services from EGY-CHEM-HUB.',
    keywords: 'register, sign up, create account, EGY-CHEM-HUB',
    ogTitle: 'Register - EGY-CHEM-HUB',
    ogDescription: 'Create an account to access premium chemical solutions and services from EGY-CHEM-HUB.'
  });
  return (
    <>
      <SEO {...seoData} />
      <Register />
    </>
  )
}

export default RegisterPage