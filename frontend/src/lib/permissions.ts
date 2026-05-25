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

export const usePermissions = () => {
  const user = useUserStore((s) => s.user);
  const can = useCan();
  return { can, permissions: user?.permissions || [], role: user?.role };
};
