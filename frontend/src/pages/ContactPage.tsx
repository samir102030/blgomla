import React from 'react';
import { useTranslation } from 'react-i18next';
import Header from '../components/Header';
import Contact from '../components/Contact';
import Footer from '../components/Footer';
import SEO from '../components/SEO';

const ContactPage: React.FC = () => {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <SEO
        title={t("Contact")}
        description={t("Get in touch with Belgomla. Customer support, sales inquiries, and vendor onboarding.")}
      />
      <Header />
      <main>
        <Contact />
      </main>
      <Footer />
    </div>
  );
};

export default ContactPage;
