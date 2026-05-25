import React from "react";
import { useTranslation } from "react-i18next";
import AuditTrail from "../../components/admin/AuditTrail";

const AuditLogPage: React.FC = () => {
  const { t } = useTranslation();
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text)]">{t("Audit Log")}</h1>
        <p className="text-sm text-[var(--text-muted)] mt-1">
          {t("A complete record of account, security and store activity.")}
        </p>
      </div>
      <AuditTrail />
    </div>
  );
};

export default AuditLogPage;
