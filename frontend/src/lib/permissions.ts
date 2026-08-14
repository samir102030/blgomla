import { useMemo } from "react";
import { useUserStore } from "../stores/user.store";

/** Does a permission list satisfy a key? Honors "*" and "resource.*". */
export const permsAllow = (perms: string[] | undefined, key: string): boolean => {
  if (!perms || perms.length === 0) return false;
  if (perms.includes("*")) return true;
  if (perms.includes(key)) return true;
  const resource = key.split(".")[0];
  return perms.includes(`${resource}.*`);
};

/** Returns a `can(key | key[])` checker bound to the current user (any-of). */
export const useCan = () => {
  const perms = useUserStore((s) => s.user?.permissions);
  return useMemo(() => {
    return (key: string | string[]): boolean => {
      const keys = Array.isArray(key) ? key : [key];
      return keys.some((k) => permsAllow(perms, k));
    };
  }, [perms]);
};

/**
 * Is this user staff — someone whose view spans the whole platform rather than
 * a single store or their own account?
 *
 * Pages kept asking this as `user?.role === "admin"`, which excluded
 * super_admins and any custom role created in Roles & Access. In OrdersPage
 * that check guarded the fetch itself, so a super_admin sent no request at all
 * and the page reported "Failed to fetch orders" over a response that was
 * never asked for. `dashboard.view` is the key that separates staff from
 * shoppers, and vendors are excluded by role since they see only their store.
 */
export const isPlatformStaff = (
  user?: { role?: string; permissions?: string[] }
): boolean => {
  if (!user || user.role === "store") return false;
  return permsAllow(user.permissions, "dashboard.view");
};

/** Hook form of {@link isPlatformStaff}, bound to the signed-in user. */
export const useIsPlatformStaff = (): boolean => {
  const user = useUserStore((s) => s.user);
  return useMemo(() => isPlatformStaff(user), [user]);
};

export const usePermissions = () => {
  const user = useUserStore((s) => s.user);
  const can = useCan();
  return { can, permissions: user?.permissions || [], role: user?.role };
};
