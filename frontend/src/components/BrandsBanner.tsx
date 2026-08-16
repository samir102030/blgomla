import React from 'react';
import { useTranslation } from 'react-i18next';
import PageHero from './PageHero';

const BrandsBanner: React.FC = () => {
  const { t } = useTranslation();
  // Was its own navy-blue gradient — the third distinct page header colour on
  // a site with one brand palette.
  return (
    <PageHero
      eyebrow={t('Trusted Brands')}
      title={t('Brands')}
      subtitle={t('Partnered with leading technology brands worldwide')}
      breadcrumb={[{ label: t('Home'), to: '/' }, { label: t('Brands') }]}
    />
  );
};

export default BrandsBanner;
