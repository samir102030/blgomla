import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  MagnifyingGlassIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  UserIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";
import { useUserStore } from "../../stores/user.store";
import AuditTrail from "../../components/admin/AuditTrail";
import { axiosInstance } from "../../lib/axios";

const UsersPage: React.FC = () => {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [editForm, setEditForm] = useState({
    role: "customer",
    active: true,
  });
  const [assignableRoles, setAssignableRoles] = useState<
    { key: string; name: string }[]
  >([]);
  const {
    users,
    paginated,
    loading,
    error,
    fetchUsers,
    updateUser,
    safeDeleteUser,
    finalDeleteUser,
    restoreUser,
  } = useUserStore();

  useEffect(() => {
    fetchUsers({ page: currentPage, limit: 10 });
  }, [currentPage, fetchUsers]);

  useEffect(() => {
    axiosInstance
      .get<{ roles: { key: string; name: string }[] }>("/roles/assignable")
      .then((r) => setAssignableRoles(r.data.roles || []))
      .catch(() => {});
  }, []);

  const handleViewUser = (user: any) => {
    setSelectedUser(user);
    setShowViewModal(true);
  };

  const handleEditUser = (user: any) => {
    setSelectedUser(user);
    setEditForm({
      role: user.role,
      active: user.active,
    });
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (selectedUser) {
      const success = await updateUser(selectedUser._id, {
        role: editForm.role,
        active: editForm.active,
      });
      if (success) {
        fetchUsers({ page: currentPage, limit: 10 });
        setShowEditModal(false);
        setSelectedUser(null);
      }
    }
  };

  const handleDeleteUser = (user: any) => {
    setSelectedUser(user);
    setShowDeleteModal(true);
  };

  const handleRestoreUser = (user: any) => {
    setSelectedUser(user);
    setShowRestoreModal(true);
  };

  const confirmDelete = async () => {
    if (selectedUser) {
      let success;
      if (selectedUser.deleted) {
        // Permanently delete
        success = await finalDeleteUser(selectedUser._id);
      } else {
        // Mark as deleted
        success = await safeDeleteUser(selectedUser._id);
      }
      if (success) {
        fetchUsers({ page: currentPage, limit: 10 });
        setShowDeleteModal(false);
        setSelectedUser(null);
      }
    }
  };

  const confirmRestore = async () => {
    if (selectedUser) {
      const success = await restoreUser(selectedUser._id);
      if (success) {
        fetchUsers({ page: currentPage, limit: 10 });
        setShowRestoreModal(false);
        setSelectedUser(null);
      }
    }
  };

  const getStatusColor = (user: any) => {
    if (user.deleted) return "bg-[#D32F2F]/10 text-[#D32F2F]";
    return user.active
      ? "bg-[#009688]/10 text-[#009688]"
      : "bg-[#9E9E9E]/10 text-[#9E9E9E]";
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case "admin":
        return "bg-[#673AB7]/10 text-[#673AB7]";
      case "store":
        return "bg-[#002B5B]/10 text-[#002B5B]";
      case "customer":
        return "bg-[#9E9E9E]/10 text-[#9E9E9E]";
      default:
        return "bg-[#9E9E9E]/10 text-[#9E9E9E]";
    }
  };

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.phoneNumber?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === "all" || user.role === roleFilter;
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active"
        ? user.active && !user.deleted
        : statusFilter === "inactive"
        ? !user.active && !user.deleted
        : statusFilter === "deleted"
        ? user.deleted
        : true);
    return matchesSearch && matchesRole && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#333333]">
            {t("users.title")}
          </h1>
          <p className="text-[#9E9E9E]">
            {t("users.subtitle")}
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">{t("users.totalUsers")}</p>
              <p className="text-2xl font-bold text-gray-900">
                {paginated?.total || 0}
              </p>
            </div>
            <div className="bg-[var(--brand-primary)]/10 p-3 rounded-full">
 <span className="text-2xl"></span>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">{t("users.activeUsers")}</p>
              <p className="text-2xl font-bold text-green-600">
                {users.filter((u) => u.active).length}
              </p>
            </div>
            <div className="bg-green-100 p-3 rounded-full">
 <span className="text-2xl"></span>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">{t("users.inactiveUsers")}</p>
              <p className="text-2xl font-bold text-red-600">
                {users.filter((u) => !u.active).length}
              </p>
            </div>
            <div className="bg-red-100 p-3 rounded-full">
 <span className="text-2xl"></span>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">{t("users.deletedUsers")}</p>
              <p className="text-2xl font-bold text-red-600">
                {users.filter((u) => u.deleted).length}
              </p>
            </div>
            <div className="bg-red-100 p-3 rounded-full">
 <span className="text-2xl"></span>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white p-3 sm:p-6 rounded-lg shadow-sm border">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder={t("users.searchPlaceholder")}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--brand-primary)] focus:border-transparent"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-2 sm:gap-4">
            <select
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--brand-primary)] focus:border-transparent"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
            >
              <option value="all">{t("users.allRoles")}</option>
              <option value="admin">{t("users.admin")}</option>
              <option value="store">{t("users.store")}</option>
              <option value="customer">{t("users.customer")}</option>
            </select>
            <select
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--brand-primary)] focus:border-transparent"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">{t("users.allStatus")}</option>
              <option value="active">{t("users.active")}</option>
              <option value="inactive">{t("users.inactive")}</option>
              <option value="deleted">{t("users.deleted")}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--brand-accent)] mx-auto"></div>
            <p className="mt-2 text-gray-600">{t("users.loading")}</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center">
            <p className="text-red-600">{t("users.errorLoading")}: {error}</p>
            <button
              onClick={() => fetchUsers({ page: currentPage, limit: 10 })}
              className="mt-2 px-4 py-2 bg-[var(--brand-accent)] text-white rounded hover:bg-[var(--brand-accent)]"
            >
              {t("users.retry")}
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t("users.colUser")}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t("users.colRole")}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t("users.colStatus")}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t("users.colJoinDate")}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t("users.colLastLogin")}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t("users.colActions")}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-6 py-4 text-center text-gray-500"
                    >
                      {t("users.noUsers")}
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr key={user._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-4">
                          {user.profilePicture ? (
                            <img
                              className="h-10 w-10 rounded-full object-cover shrink-0"
                              src={user.profilePicture}
                              alt={user.name || "User"}
                             loading="lazy" decoding="async"/>
                          ) : (
                            <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center shrink-0">
                              <UserIcon className="h-6 w-6 text-gray-500" />
                            </div>
                          )}
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {user.name || "N/A"}
                            </div>
                            <div className="text-sm text-gray-500">
                              {user.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleColor(
                            user.role
                          )}`}
                        >
                          {user.role.charAt(0).toUpperCase() +
                            user.role.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(
                            user
                          )}`}
                        >
                          {user.deleted
                            ? t("users.deleted")
                            : user.active
                            ? t("users.active")
                            : t("users.inactive")}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {user.createdAt
                          ? new Date(user.createdAt).toLocaleDateString()
                          : "N/A"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {user.lastLogin
                          ? new Date(user.lastLogin).toLocaleDateString()
                          : "Never"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            className="text-[var(--brand-primary)] hover:text-[var(--brand-accent)]"
                            onClick={() => handleViewUser(user)}
                          >
                            <EyeIcon className="h-4 w-4" />
                          </button>
                          {!user.deleted && (
                            <button
                              className="text-green-600 hover:text-green-900"
                              onClick={() => handleEditUser(user)}
                            >
                              <PencilIcon className="h-4 w-4" />
                            </button>
                          )}
                          {user.deleted ? (
                            <button
                              className="text-yellow-600 hover:text-yellow-900"
                              onClick={() => handleRestoreUser(user)}
                            >
                              <ArrowPathIcon className="h-4 w-4" />
                            </button>
                          ) : (
                            <button
                              className="text-red-600 hover:text-red-900"
                              onClick={() => handleDeleteUser(user)}
                            >
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      <div className="bg-white px-3 sm:px-6 py-3 rounded-lg shadow-sm border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="text-sm text-gray-700">
          Showing{" "}
          <span className="font-medium">
            {((paginated?.page || 1) - 1) * (paginated?.limit || 10) + 1}
          </span>{" "}
          to{" "}
          <span className="font-medium">
            {Math.min(
              (paginated?.page || 1) * (paginated?.limit || 10),
              paginated?.total || 0
            )}
          </span>{" "}
          of <span className="font-medium">{paginated?.total || 0}</span>{" "}
          results
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50 disabled:opacity-50"
            disabled={(paginated?.page || 1) <= 1}
            onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
          >
            Previous
          </button>
          {Array.from(
            { length: Math.min(5, paginated?.pages || 1) },
            (_, i) => {
              const pageNum = Math.max(1, (paginated?.page || 1) - 2) + i;
              if (pageNum > (paginated?.pages || 1)) return null;
              return (
                <button
                  key={pageNum}
                  className={`px-3 py-1 rounded text-sm ${
                    pageNum === (paginated?.page || 1)
                      ? "bg-[var(--brand-accent)] text-white"
                      : "border border-gray-300 hover:bg-gray-50"
                  }`}
                  onClick={() => setCurrentPage(pageNum)}
                >
                  {pageNum}
                </button>
              );
            }
          )}
          <button
            className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50 disabled:opacity-50"
            disabled={(paginated?.page || 1) >= (paginated?.pages || 1)}
            onClick={() =>
              setCurrentPage((prev) =>
                Math.min(paginated?.pages || 1, prev + 1)
              )
            }
          >
            Next
          </button>
        </div>
      </div>

      {/* View User Modal */}
      {showViewModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--surface)] text-[var(--text)] p-6 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold mb-4">{t("users.userDetails")}</h3>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
              <p>
                <strong>{t("Name")}:</strong> {selectedUser.name || "N/A"}
              </p>
              <p>
                <strong>{t("Email")}:</strong> {selectedUser.email}
              </p>
              <p>
                <strong>{t("Role")}:</strong> {selectedUser.role}
              </p>
              <p>
                <strong>{t("Status")}:</strong>{" "}
                {selectedUser.deleted
                  ? "Deleted"
                  : selectedUser.active
                  ? "Active"
                  : "Inactive"}
              </p>
              <p>
                <strong>{t("Phone")}:</strong> {selectedUser.phoneNumber || "N/A"}
              </p>
              <p>
                <strong>{t("Join Date")}:</strong>{" "}
                {selectedUser.createdAt
                  ? new Date(selectedUser.createdAt).toLocaleDateString()
                  : "N/A"}
              </p>
              <p>
                <strong>{t("Last Login")}:</strong>{" "}
                {selectedUser.lastLogin
                  ? new Date(selectedUser.lastLogin).toLocaleString()
                  : "Never"}
              </p>
            </div>

            <div className="mt-6">
              <h4 className="text-sm font-semibold text-[var(--text)] mb-2">
                {t("Activity")}
              </h4>
              <AuditTrail
                userId={selectedUser._id}
                showFilters={false}
                compact
                pageSize={20}
              />
            </div>

            <div className="flex justify-end mt-4">
              <button
                className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                onClick={() => setShowViewModal(false)}
              >
                {t("users.close")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold mb-4">{t("users.editUser")}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Role</label>
                <select
                  className="w-full p-2 border rounded"
                  value={editForm.role}
                  onChange={(e) =>
                    setEditForm({ ...editForm, role: e.target.value })
                  }
                >
                  {assignableRoles.length > 0 ? (
                    assignableRoles.map((r) => (
                      <option key={r.key} value={r.key}>
                        {r.name}
                      </option>
                    ))
                  ) : (
                    <>
                      <option value="customer">Customer</option>
                      <option value="store">Store</option>
                      <option value="admin">Admin</option>
                    </>
                  )}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Status</label>
                <select
                  className="w-full p-2 border rounded"
                  value={editForm.active ? "active" : "inactive"}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      active: e.target.value === "active",
                    })
                  }
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button
                className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                onClick={() => setShowEditModal(false)}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 bg-[var(--brand-accent)] text-white rounded hover:bg-[var(--brand-accent)]"
                onClick={handleSaveEdit}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete User Modal */}
      {showDeleteModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold mb-4">{t("users.deleteUser")}</h3>
            <p>
              Are you sure you want to{" "}
              {selectedUser.deleted ? "permanently delete" : "delete"} user "
              {selectedUser.name || selectedUser.email}"?
            </p>
            <p className="text-sm text-gray-600 mt-2">
              {selectedUser.deleted
                ? "This action cannot be undone."
                : "This action can be undone by restoring the user later."}
            </p>
            <div className="flex justify-end gap-2 mt-4">
              <button
                className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                onClick={() => setShowDeleteModal(false)}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                onClick={confirmDelete}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Restore User Modal */}
      {showRestoreModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold mb-4">{t("users.restoreUser")}</h3>
            <p>
              Are you sure you want to restore user "
              {selectedUser.name || selectedUser.email}"?
            </p>
            <p className="text-sm text-gray-600 mt-2">
              This will reactivate the user and make them active again.
            </p>
            <div className="flex justify-end gap-2 mt-4">
              <button
                className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                onClick={() => setShowRestoreModal(false)}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                onClick={confirmRestore}
              >
                Restore
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersPage;
