import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import { axiosInstance } from "../../lib/axios";
import { permsAllow } from "../../lib/permissions";

interface PermissionAction {
  key: string;
  label: string;
}
interface PermissionGroup {
  resource: string;
  label: string;
  actions: PermissionAction[];
}
interface Role {
  _id: string;
  key: string;
  name: string;
  description?: string;
  isSystem: boolean;
  permissions: string[];
  userCount?: number;
}

const RolesAccessPage: React.FC = () => {
  const { t } = useTranslation();
  const [roles, setRoles] = useState<Role[]>([]);
  const [groups, setGroups] = useState<PermissionGroup[]>([]);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Editable draft for the selected role.
  const [draftName, setDraftName] = useState("");
  const [draftDesc, setDraftDesc] = useState("");
  const [draftPerms, setDraftPerms] = useState<Set<string>>(new Set());

  // New-role form.
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");

  const allKeys = useMemo(
    () => groups.flatMap((g) => g.actions.map((a) => `${g.resource}.${a.key}`)),
    [groups]
  );

  const load = async () => {
    setLoading(true);
    try {
      const [rolesRes, permRes] = await Promise.all([
        axiosInstance.get<{ roles: Role[] }>("/roles"),
        axiosInstance.get<{ groups: PermissionGroup[] }>("/roles/permissions"),
      ]);
      setRoles(rolesRes.data.roles || []);
      setGroups(permRes.data.groups || []);
      setSelectedKey((prev) => prev || rolesRes.data.roles?.[0]?.key || null);
    } catch {
      toast.error(t("Failed to load roles"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selected = roles.find((r) => r.key === selectedKey) || null;
  const isSuper = selected?.key === "super_admin";

  // Sync draft when selection changes — expand wildcards into explicit keys.
  useEffect(() => {
    if (!selected) return;
    setDraftName(selected.name);
    setDraftDesc(selected.description || "");
    const set = new Set<string>();
    for (const k of allKeys) if (permsAllow(selected.permissions, k)) set.add(k);
    setDraftPerms(set);
  }, [selectedKey, roles, allKeys]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = (key: string) => {
    setDraftPerms((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleGroup = (g: PermissionGroup, on: boolean) => {
    setDraftPerms((prev) => {
      const next = new Set(prev);
      for (const a of g.actions) {
        const k = `${g.resource}.${a.key}`;
        if (on) next.add(k);
        else next.delete(k);
      }
      return next;
    });
  };

  const save = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const { data } = await axiosInstance.put<{ role: Role }>(`/roles/${selected.key}`, {
        name: draftName,
        description: draftDesc,
        permissions: [...draftPerms],
      });
      setRoles((rs) => rs.map((r) => (r.key === data.role.key ? { ...r, ...data.role } : r)));
      toast.success(t("Role saved"));
    } catch (e: any) {
      toast.error(e?.response?.data?.message || t("Failed to save role"));
    } finally {
      setSaving(false);
    }
  };

  const createRole = async () => {
    if (!newName.trim()) return;
    try {
      const { data } = await axiosInstance.post<{ role: Role }>("/roles", {
        name: newName.trim(),
        description: newDesc.trim(),
        permissions: [],
      });
      setRoles((rs) => [...rs, { ...data.role, userCount: 0 }]);
      setSelectedKey(data.role.key);
      setCreating(false);
      setNewName("");
      setNewDesc("");
      toast.success(t("Role created"));
    } catch (e: any) {
      toast.error(e?.response?.data?.message || t("Failed to create role"));
    }
  };

  const deleteRole = async () => {
    if (!selected || selected.isSystem) return;
    if (!window.confirm(t("Delete this role? This cannot be undone."))) return;
    try {
      await axiosInstance.delete(`/roles/${selected.key}`);
      setRoles((rs) => rs.filter((r) => r.key !== selected.key));
      setSelectedKey(roles.find((r) => r.key !== selected.key)?.key || null);
      toast.success(t("Role deleted"));
    } catch (e: any) {
      toast.error(e?.response?.data?.message || t("Failed to delete role"));
    }
  };

  const grantedCount = isSuper ? allKeys.length : draftPerms.size;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text)]">{t("Roles & Access")}</h1>
        <p className="text-sm text-[var(--text-muted)] mt-1">
          {t("Create roles and control exactly what each one can see and do.")}
        </p>
      </div>

      {loading ? (
        <div className="text-center py-16 text-[var(--text-muted)]">{t("Loading…")}</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-5">
          {/* Roles list */}
          <div className="space-y-2">
            {roles.map((r) => (
              <button
                key={r.key}
                onClick={() => setSelectedKey(r.key)}
                className={`w-full text-left px-4 py-3 rounded-xl border transition-colors ${
                  selectedKey === r.key
                    ? "border-[var(--brand-primary)] bg-[var(--brand-primary)]/5"
                    : "border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--bg)]"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-[var(--text)]">{r.name}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                      r.isSystem
                        ? "bg-slate-100 text-slate-600 dark:bg-slate-700/40 dark:text-slate-300"
                        : "bg-[var(--brand-primary)]/15 text-[var(--brand-primary)]"
                    }`}
                  >
                    {r.isSystem ? t("Built-in") : t("Custom")}
                  </span>
                </div>
                <div className="text-xs text-[var(--text-muted)] mt-0.5">
                  {(r.userCount || 0).toLocaleString()} {t("users")}
                </div>
              </button>
            ))}

            {creating ? (
              <div className="p-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] space-y-2">
                <input
                  autoFocus
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder={t("Role name")}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text)] text-sm"
                />
                <input
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder={t("Description (optional)")}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--bg)] text-[var(--text)] text-sm"
                />
                <div className="flex gap-2">
                  <button
                    onClick={createRole}
                    className="flex-1 px-3 py-1.5 text-sm rounded-lg bg-[var(--brand-primary)] text-white hover:opacity-90"
                  >
                    {t("Create")}
                  </button>
                  <button
                    onClick={() => setCreating(false)}
                    className="px-3 py-1.5 text-sm rounded-lg border border-[var(--border)] text-[var(--text-muted)]"
                  >
                    {t("Cancel")}
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setCreating(true)}
                className="w-full px-4 py-3 rounded-xl border border-dashed border-[var(--border)] text-sm text-[var(--text-muted)] hover:text-[var(--text)] hover:border-[var(--brand-primary)]"
              >
                + {t("New role")}
              </button>
            )}
          </div>

          {/* Permission matrix */}
          {selected && (
            <div className="bg-[var(--surface)] border border-[var(--border)] rounded-xl p-5 space-y-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  {selected.isSystem ? (
                    <h2 className="text-lg font-bold text-[var(--text)]">{selected.name}</h2>
                  ) : (
                    <input
                      value={draftName}
                      onChange={(e) => setDraftName(e.target.value)}
                      className="text-lg font-bold text-[var(--text)] bg-transparent border-b border-transparent hover:border-[var(--border)] focus:border-[var(--brand-primary)] outline-none"
                    />
                  )}
                  <input
                    value={draftDesc}
                    onChange={(e) => setDraftDesc(e.target.value)}
                    disabled={isSuper}
                    placeholder={t("Description")}
                    className="block mt-1 text-sm text-[var(--text-muted)] bg-transparent outline-none w-full disabled:opacity-70"
                  />
                  <div className="mt-1 text-xs text-[var(--text-muted)]">
                    <span className="font-mono">{selected.key}</span> · {grantedCount}/{allKeys.length}{" "}
                    {t("permissions")}
                  </div>
                </div>
                <div className="flex gap-2">
                  {!selected.isSystem && (
                    <button
                      onClick={deleteRole}
                      className="px-3 py-2 text-sm rounded-lg border border-red-300 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      {t("Delete")}
                    </button>
                  )}
                  <button
                    onClick={save}
                    disabled={saving || isSuper}
                    className="px-4 py-2 text-sm rounded-lg bg-[var(--brand-primary)] text-white hover:opacity-90 disabled:opacity-50"
                  >
                    {saving ? t("Saving…") : t("Save changes")}
                  </button>
                </div>
              </div>

              {isSuper && (
                <div className="text-sm text-[var(--text-muted)] bg-[var(--bg)] rounded-lg px-4 py-3">
                  {t("Super Admin always has full, unrestricted access and cannot be edited.")}
                </div>
              )}

              <div className="space-y-3">
                {groups.map((g) => {
                  const keys = g.actions.map((a) => `${g.resource}.${a.key}`);
                  const allOn = isSuper || keys.every((k) => draftPerms.has(k));
                  const someOn = keys.some((k) => draftPerms.has(k));
                  return (
                    <div key={g.resource} className="border border-[var(--border)] rounded-lg">
                      <div className="flex items-center justify-between px-4 py-2.5 bg-[var(--bg)] rounded-t-lg">
                        <span className="font-medium text-[var(--text)]">{g.label}</span>
                        <label className="flex items-center gap-2 text-xs text-[var(--text-muted)] cursor-pointer">
                          <input
                            type="checkbox"
                            checked={allOn}
                            ref={(el) => {
                              if (el) el.indeterminate = !allOn && someOn;
                            }}
                            disabled={isSuper}
                            onChange={(e) => toggleGroup(g, e.target.checked)}
                            className="accent-[var(--brand-primary)]"
                          />
                          {t("All")}
                        </label>
                      </div>
                      <div className="p-3 flex flex-wrap gap-2">
                        {g.actions.map((a) => {
                          const k = `${g.resource}.${a.key}`;
                          const on = isSuper || draftPerms.has(k);
                          return (
                            <label
                              key={k}
                              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm cursor-pointer transition-colors ${
                                on
                                  ? "border-[var(--brand-primary)] bg-[var(--brand-primary)]/5 text-[var(--text)]"
                                  : "border-[var(--border)] text-[var(--text-muted)] hover:bg-[var(--bg)]"
                              } ${isSuper ? "cursor-not-allowed opacity-80" : ""}`}
                            >
                              <input
                                type="checkbox"
                                checked={on}
                                disabled={isSuper}
                                onChange={() => toggle(k)}
                                className="accent-[var(--brand-primary)]"
                              />
                              {a.label}
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default RolesAccessPage;
