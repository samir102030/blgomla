import React from 'react';
import Header from '../components/Header';
import Contact from '../components/Contact';
import Footer from '../components/Footer';

const ContactPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main>
        <Contact />
      </main>
      <Footer />
    </div>
  );
};

export default ContactPage;
