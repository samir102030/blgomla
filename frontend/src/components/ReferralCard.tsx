import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import { axiosInstance } from "../lib/axios";

const ReferralCard: React.FC = () => {
  const { t } = useTranslation();
  const [code, setCode] = useState<string>("");
  const [count, setCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    axiosInstance
      .get<{ success: boolean; referralCode: string; referralCount: number }>(
        "/users/referral"
      )
      .then((res) => {
        if (!active) return;
        setCode(res.data.referralCode);
        setCount(res.data.referralCount || 0);
      })
      .catch(() => {})
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  const shareUrl =
    code && typeof window !== "undefined"
      ? `${window.location.origin}/login?ref=${code}`
      : "";

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success(t("Referral link copied!"));
    } catch {
      toast.error(t("Couldn't copy link"));
    }
  };

  const shareWhatsApp = () => {
    const text = encodeURIComponent(
      t("Shop on Belgomla and get a bonus — use my link: {{url}}", { url: shareUrl })
    );
    window.open(`https://wa.me/?text=${text}`, "_blank", "noopener,noreferrer");
  };

  if (loading) return null;

  return (
    <div className="bg-gradient-to-br from-amber-500/10 to-yellow-500/5 border border-amber-500/15 rounded-2xl p-4 mb-8">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xl">🎁</span>
        <h3 className="text-base font-bold text-[var(--text)]">
          {t("Refer friends, earn points")}
        </h3>
      </div>
      <p className="text-xs text-[var(--text-muted)] mb-3">
        {t("Your friend gets a welcome bonus, and you earn points when their first order is delivered.")}
        {count > 0 && " " + t("{{count}} referral(s) so far.", { count })}
      </p>
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          readOnly
          value={shareUrl}
          onFocus={(e) => e.currentTarget.select()}
          className="flex-1 px-3 py-2 text-xs sm:text-sm border border-[var(--border)] rounded-lg bg-[var(--surface)] text-[var(--text)]"
        />
        <div className="flex gap-2">
          <button
            type="button"
            onClick={copy}
            className="px-3 py-2 rounded-lg bg-[var(--brand-primary)] text-white text-xs sm:text-sm font-medium hover:opacity-90 whitespace-nowrap"
          >
            {t("Copy link")}
          </button>
          <button
            type="button"
            onClick={shareWhatsApp}
            className="px-3 py-2 rounded-lg border border-[#25D366] text-[#25D366] text-xs sm:text-sm font-medium hover:bg-[#25D366] hover:text-white whitespace-nowrap"
          >
            {t("Share")}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReferralCard;
