import React from "react";
import { useTranslation } from "react-i18next";
import ImageMigrationCard from "../../components/admin/ImageMigrationCard";

/**
 * Where the catalogue's pictures live.
 *
 * One card today. It has a page of its own rather than a corner of the products
 * table because the job it starts runs for a while and wants the tab left open,
 * which is a bad fit for a screen somebody is in the middle of editing on.
 */
const ProductImagesPage: React.FC = () => {
  const { i18n } = useTranslation();
  const ar = i18n.language === "ar";

  return (
    <div className="p-4 sm:p-6 max-w-3xl">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-[var(--text)]">
          {ar ? "صور المنتجات" : "Product images"}
        </h1>
        <p className="text-sm text-[var(--text-muted)] mt-1">
          {ar
            ? "مكان تخزين صور الكتالوج، ونقلها لحسابنا."
            : "Where the catalogue's pictures are stored, and moving them onto our own account."}
        </p>
      </header>

      <ImageMigrationCard />
    </div>
  );
};

export default ProductImagesPage;
