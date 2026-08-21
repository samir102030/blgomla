import React, { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  HomeIcon,
  Squares2X2Icon,
  TagIcon,
  ShoppingCartIcon,
  UserIcon,
} from "@heroicons/react/24/outline";
import { useUserStore } from "../stores/user.store";

/**
 * The bottom bar a phone shops from.
 *
 * Most of the traffic here is a phone, and a phone's whole navigation was one
 * hamburger in the top corner: every move — home, catalogue, cart — cost a tap
 * to open the drawer and a second to choose. This is the pattern every app the
 * customer already uses puts at the bottom, within reach of a thumb.
 *
 * Not on the dashboard. That is a work surface with its own sidebar, and a
 * shopping bar across the bottom of it would be noise.
 *
 * The height it occupies is published as `--mobile-nav-h` so everything else
 * anchored to the bottom of the screen — the chat bubble, the compare bar, the
 * product page's sticky buy bar — can sit above it instead of underneath, and
 * so the page can end above it rather than behind it.
 */
const ITEMS = [
  { to: "/", icon: HomeIcon, label: "nav.home", exact: true },
  { to: "/products", icon: Squares2X2Icon, label: "nav.products" },
  { to: "/deals", icon: TagIcon, label: "nav.deals" },
  { to: "/cart", icon: ShoppingCartIcon, label: "nav.cart", badge: true },
  { to: "/account", icon: UserIcon, label: "nav.account" },
];

const MobileTabBar: React.FC = () => {
  const { t } = useTranslation();
  const { pathname } = useLocation();
  const user = useUserStore((s) => s.user);

  // Storefront only. Checked here rather than in CSS because it depends on the
  // route; the breakpoint stays in CSS, where it belongs.
  const hidden =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/vendor") ||
    pathname.startsWith("/checkout");

  useEffect(() => {
    const root = document.documentElement;
    if (hidden) root.removeAttribute("data-mobile-nav");
    else root.setAttribute("data-mobile-nav", "on");
    return () => root.removeAttribute("data-mobile-nav");
  }, [hidden]);

  if (hidden) return null;

  const cartCount = user?.cart?.length
    ? user.cart.reduce((total, item) => total + (item.quantity || 0), 0)
    : 0;

  const isActive = (to: string, exact?: boolean) =>
    exact ? pathname === to : pathname === to || pathname.startsWith(`${to}/`);

  return (
    <nav
      // Above the page and the compare bar, below the drawer and any modal.
      className="fixed inset-x-0 bottom-0 z-40 lg:hidden border-t border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur-md"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      aria-label={t("nav.primary", "Primary")}
    >
      <ul className="flex items-stretch">
        {ITEMS.map((item) => {
          const active = isActive(item.to, item.exact);
          const Icon = item.icon;
          return (
            <li key={item.to} className="flex-1">
              <Link
                to={item.to}
                aria-current={active ? "page" : undefined}
                className={`relative flex h-14 flex-col items-center justify-center gap-0.5 transition-colors ${
                  active ? "text-[var(--brand-primary)]" : "text-[var(--text-muted)]"
                }`}
              >
                {/* Reads as selected without relying on colour alone. */}
                {active && (
                  <span
                    className="absolute inset-x-4 top-0 h-0.5 rounded-b bg-[var(--brand-primary)]"
                    aria-hidden="true"
                  />
                )}
                <span className="relative">
                  <Icon className="h-6 w-6" aria-hidden="true" />
                  {item.badge && cartCount > 0 && (
                    <span className="absolute -end-2 -top-1.5 min-w-[17px] rounded-full bg-[var(--brand-accent)] px-1 text-center text-[10px] font-bold leading-[17px] text-white">
                      {cartCount > 99 ? "99+" : cartCount}
                    </span>
                  )}
                </span>
                <span className="text-[10px] font-semibold leading-none">
                  {t(item.label)}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};

export default MobileTabBar;
