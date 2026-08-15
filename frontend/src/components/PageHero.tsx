import React from "react";
import Breadcrumb, { type Crumb } from "./Breadcrumb";

export type { Crumb };

interface PageHeroProps {
  /** Small label above the title. Optional — a bare title reads fine. */
  eyebrow?: string;
  title: string;
  subtitle?: string;
  /** Trail ending at the current page; the last entry renders unlinked. */
  breadcrumb?: Crumb[];
  /** Buttons or filters that belong with the title rather than below it. */
  actions?: React.ReactNode;
  /** A count, a price, a status — sits opposite the title on wide screens. */
  aside?: React.ReactNode;
  /**
   * "ink" is the dark brand canvas the home hero uses; it suits pages that
   * open on a statement. "plain" keeps the page background and is the right
   * choice when the content itself starts immediately below.
   */
  tone?: "ink" | "plain";
  className?: string;
}

/**
 * The opening band shared by every storefront page.
 *
 * Each page used to build its own top out of whatever heading size and gutter
 * it happened to be written with, so moving between them felt like moving
 * between sites. This puts one shape around all of them — same gutter as
 * .shell, same display scale as the home page, breadcrumbs in the same place —
 * and leaves the page free to differ where it actually differs, through
 * `actions` and `aside`.
 */
const PageHero: React.FC<PageHeroProps> = ({
  eyebrow,
  title,
  subtitle,
  breadcrumb,
  actions,
  aside,
  tone = "ink",
  className = "",
}) => {
  const onInk = tone === "ink";

  return (
    <section
      className={`relative isolate overflow-hidden ${
        onInk ? "bg-[var(--ink-canvas)]" : "bg-[var(--surface-2)]"
      } ${className}`}
    >
      {onInk && (
        <>
          <div
            className="absolute inset-0 grid-lines opacity-[0.5] pointer-events-none"
            aria-hidden="true"
          />
          <div
            className="absolute inset-0 overflow-hidden pointer-events-none"
            aria-hidden="true"
          >
            <div className="absolute -top-32 ltr:-left-20 rtl:-right-20 w-[26rem] h-[26rem] rounded-full bg-[#FF6A1A] opacity-[0.14] blur-[110px] animate-drift" />
            <div className="absolute -bottom-40 ltr:-right-14 rtl:-left-14 w-[22rem] h-[22rem] rounded-full bg-[#E8530A] opacity-[0.11] blur-[120px] animate-drift" />
          </div>
          {/* Melts into the page below instead of ending on a hard edge. */}
          <div
            className="absolute inset-x-0 bottom-0 h-16 pointer-events-none bg-gradient-to-b from-transparent to-[var(--bg)]"
            aria-hidden="true"
          />
        </>
      )}

      <div className="relative shell pt-8 pb-10 sm:pt-10 sm:pb-12 lg:pt-14 lg:pb-16">
        {breadcrumb && breadcrumb.length > 0 && (
          <Breadcrumb items={breadcrumb} onInk={onInk} className="mb-5" />
        )}

        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            {eyebrow && <span className="eyebrow mb-3">{eyebrow}</span>}
            <h1
              className={`text-display-sm ${
                onInk ? "text-[var(--on-ink)]" : "text-[var(--text)]"
              }`}
            >
              {title}
            </h1>
            {subtitle && (
              <p
                className={`mt-3 max-w-2xl text-sm sm:text-base leading-relaxed ${
                  onInk ? "text-[var(--on-ink-muted)]" : "text-[var(--text-muted)]"
                }`}
              >
                {subtitle}
              </p>
            )}
            {actions && (
              <div className="mt-6 flex flex-wrap items-center gap-3">{actions}</div>
            )}
          </div>

          {aside && <div className="flex-none">{aside}</div>}
        </div>
      </div>
    </section>
  );
};

export default PageHero;
