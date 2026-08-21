import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-hot-toast";
import { ArrowPathIcon, EyeIcon, EyeSlashIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { axiosInstance } from "../../lib/axios";
import type { User } from "../../types/user.type";

type Role = { key: string; name: string; isSystem?: boolean };

type Props = {
  onClose: () => void;
  onCreated: (user: User) => void;
};

/** A password nobody has to invent, and nobody will reuse from somewhere else. */
const suggestPassword = () => {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*";
  const bytes = new Uint32Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
};

/**
 * Create a back-office account.
 *
 * The alternative was asking a colleague to register on the storefront and
 * then hunting for their row to promote it, which is two people and an inbox
 * for something one administrator should be able to do alone. The account
 * comes out verified and able to log in immediately; what it is allowed to
 * touch is the next question, asked straight after this one closes.
 */
const NewStaffModal: React.FC<Props> = ({ onClose, onCreated }) => {
  const { t } = useTranslation();

  const [roles, setRoles] = useState<Role[]>([]);
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "" });
  const [reveal, setReveal] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    axiosInstance
      .get("/roles/assignable")
      .then(({ data }) => {
        if (cancelled) return;
        // Customers and vendors are not staff — offering them here would only
        // ever be a mistake, and this dialog is the wrong place to make one.
        const staff: Role[] = (data.roles || []).filter(
          (r: Role) => !["customer", "store"].includes(r.key),
        );
        setRoles(staff);
        setForm((p) => ({
          ...p,
          role:
            p.role ||
            staff.find((r) => r.key === "category_manager")?.key ||
            staff[0]?.key ||
            "",
        }));
      })
      .catch(() => {
        if (!cancelled) toast.error(t("staff.rolesFailed", "Could not load the roles"));
      });
    return () => {
      cancelled = true;
    };
  }, [t]);

  const set =
    (key: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((p) => ({ ...p, [key]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password.length < 8) {
      toast.error(t("staff.passwordTooShort", "Password must be at least 8 characters"));
      return;
    }
    setSaving(true);
    try {
      const { data } = await axiosInstance.post("/users/staff", form);
      toast.success(t("staff.created", "Account created"));
      onCreated(data.user);
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message || t("staff.createFailed", "Could not create the account"),
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl border bg-white shadow-lg">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h3 className="text-lg font-semibold text-gray-900">
            {t("staff.newTitle", "New staff account")}
          </h3>
          <button type="button" className="rounded p-1 hover:bg-gray-100" onClick={onClose}>
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={submit} className="space-y-4 p-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-600">
              {t("staff.name", "Name")}
            </label>
            <input
              required
              value={form.name}
              onChange={set("name")}
              className="w-full rounded-lg border px-3 py-2 text-sm"
              placeholder={t("staff.namePlaceholder", "Full name")}
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-600">
              {t("staff.email", "Email")}
            </label>
            <input
              required
              type="email"
              dir="ltr"
              value={form.email}
              onChange={set("email")}
              className="w-full rounded-lg border px-3 py-2 text-sm"
              placeholder="name@belgomla.com"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-600">
              {t("staff.password", "Password")}
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  required
                  dir="ltr"
                  type={reveal ? "text" : "password"}
                  value={form.password}
                  onChange={set("password")}
                  minLength={8}
                  className="w-full rounded-lg border px-3 py-2 pe-10 text-sm"
                />
                <button
                  type="button"
                  onClick={() => setReveal((v) => !v)}
                  className="absolute inset-y-0 end-2 flex items-center text-gray-500 hover:text-gray-800"
                  aria-label={t("staff.togglePassword", "Show or hide the password")}
                >
                  {reveal ? <EyeSlashIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
                </button>
              </div>
              <button
                type="button"
                onClick={() => {
                  setForm((p) => ({ ...p, password: suggestPassword() }));
                  setReveal(true);
                }}
                className="flex items-center gap-1 rounded-lg border bg-gray-100 px-3 text-sm font-semibold hover:bg-gray-200"
              >
                <ArrowPathIcon className="h-4 w-4" />
                {t("staff.generate", "Generate")}
              </button>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              {t(
                "staff.passwordHint",
                "Hand this to them yourself. It is shown here once and never again.",
              )}
            </p>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-600">
              {t("staff.role", "Role")}
            </label>
            <select
              required
              value={form.role}
              onChange={set("role")}
              className="w-full rounded-lg border bg-white px-3 py-2 text-sm"
            >
              {roles.map((r) => (
                <option key={r.key} value={r.key}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100"
            >
              {t("admins.cancel")}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-[#002B5B] px-3 py-2 text-sm font-semibold text-white hover:bg-[#001a3d] disabled:opacity-60"
            >
              {saving
                ? t("staff.creating", "Creating...")
                : t("staff.create", "Create and choose categories")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewStaffModal;
