import React from 'react';
import Header from '../components/Header';
import Contact from '../components/Contact';
import Footer from '../components/Footer';
import SEO from '../components/SEO';

const ContactPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-[var(--bg)]">
      <SEO
        title="Contact"
        description="Get in touch with Belgomla. Customer support, sales inquiries, and vendor onboarding."
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
