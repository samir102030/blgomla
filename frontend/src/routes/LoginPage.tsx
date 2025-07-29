import Login from '../pages/Login'
import SEO from '../components/common/SEO'
import { useSEO } from '../hooks/useSEO'

function LoginPage() {
  const { seoData } = useSEO({
    title: 'Login - EGY-CHEM-HUB',
    description: 'Login to your EGY-CHEM-HUB account to manage your profile and access exclusive chemical solutions.',
    keywords: 'login, sign in, EGY-CHEM-HUB',
    ogTitle: 'Login - EGY-CHEM-HUB',
    ogDescription: 'Login to your EGY-CHEM-HUB account to manage your profile and access exclusive chemical solutions.'
  });
  return (
    <>
      <SEO {...seoData} />
      <Login />
    </>
  )
}

export default LoginPage