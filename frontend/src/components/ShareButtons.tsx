import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";

interface ShareButtonsProps {
  /** Title/text to share. Defaults to the page title. */
  title?: string;
  /** URL to share. Defaults to the current page URL. */
  url?: string;
}

const ShareButtons: React.FC<ShareButtonsProps> = ({ title, url }) => {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  const shareUrl =
    url || (typeof window !== "undefined" ? window.location.href : "");
  const shareTitle =
    title || (typeof document !== "undefined" ? document.title : "");
  const encodedUrl = encodeURIComponent(shareUrl);
  const encodedText = encodeURIComponent(shareTitle);

  const openShare = (href: string) => {
    window.open(href, "_blank", "noopener,noreferrer,width=600,height=500");
  };

  const handleNativeShare = async () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: shareTitle, url: shareUrl });
      } catch {
        // user dismissed — no-op
      }
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success(t("Link copied!"));
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(t("Couldn't copy link"));
    }
  };

  const btn =
    "inline-flex items-center justify-center w-9 h-9 rounded-full border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] hover:bg-[var(--surface-2)] transition-colors";

  const canNativeShare =
    typeof navigator !== "undefined" && !!navigator.share;

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-[var(--text-muted)] mr-1">
        {t("Share")}:
      </span>

      <a
        href={`https://wa.me/?text=${encodedText}%20${encodedUrl}`}
        target="_blank"
        rel="noopener noreferrer"
        className={`${btn} hover:!bg-[#25D366] hover:!text-white hover:!border-[#25D366]`}
        aria-label={t("Share on WhatsApp")}
        title={t("Share on WhatsApp")}
      >
        <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor" aria-hidden="true">
          <path d="M.057 24l1.687-6.163a11.867 11.867 0 01-1.587-5.945C.16 5.335 5.495 0 12.05 0a11.82 11.82 0 018.413 3.488 11.82 11.82 0 013.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 01-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884a9.86 9.86 0 001.51 5.26l-.999 3.648 3.488-.755zM17.99 14.6c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
        </svg>
      </a>

      <a
        href={`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`}
        target="_blank"
        rel="noopener noreferrer"
        className={`${btn} hover:!bg-[#1877F2] hover:!text-white hover:!border-[#1877F2]`}
        aria-label={t("Share on Facebook")}
        title={t("Share on Facebook")}
        onClick={(e) => {
          e.preventDefault();
          openShare(`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`);
        }}
      >
        <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor" aria-hidden="true">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
      </a>

      <a
        href={`https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedText}`}
        target="_blank"
        rel="noopener noreferrer"
        className={`${btn} hover:!bg-black hover:!text-white hover:!border-black`}
        aria-label={t("Share on X")}
        title={t("Share on X")}
        onClick={(e) => {
          e.preventDefault();
          openShare(`https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedText}`);
        }}
      >
        <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor" aria-hidden="true">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      </a>

      <button
        type="button"
        onClick={handleCopy}
        className={btn}
        aria-label={t("Copy link")}
        title={t("Copy link")}
      >
        {copied ? (
          <svg viewBox="0 0 24 24" className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 010 5.656l-3 3a4 4 0 01-5.656-5.656l1.5-1.5M10.172 13.828a4 4 0 010-5.656l3-3a4 4 0 015.656 5.656l-1.5 1.5" />
          </svg>
        )}
      </button>

      {canNativeShare && (
        <button
          type="button"
          onClick={handleNativeShare}
          className={`${btn} sm:hidden`}
          aria-label={t("Share")}
          title={t("Share")}
        >
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
          </svg>
        </button>
      )}
    </div>
  );
};

export default ShareButtons;
