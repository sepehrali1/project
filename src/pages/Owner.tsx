import { useCallback, useEffect, useState } from "react";
import { BadgeCheck, Shield } from "lucide-react";
import { describeError } from "../lib/api";
import { fetchAdminUsers, setUserRole, setUserVerified, type AdminUser } from "../lib/adminApi";
import { useAuth } from "../contexts/AuthContext";
import type { UserRole } from "../types/auth";

export default function Owner() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setUsers(await fetchAdminUsers());
      setError(null);
    } catch (err) {
      setError(describeError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function toggleVerified(u: AdminUser) {
    try {
      await setUserVerified(u.id, !u.verified);
      await refresh();
    } catch (err) {
      setError(describeError(err));
    }
  }

  async function changeRole(u: AdminUser, role: UserRole) {
    if (role === "owner" && !confirm("این کاربر مالک پلتفرم می‌شود و همه‌ی دسترسی‌ها را خواهد داشت. مطمئنید؟")) {
      return;
    }
    try {
      await setUserRole(u.id, role);
      await refresh();
    } catch (err) {
      setError(describeError(err));
    }
  }

  if (loading) {
    return (
      <div className="page-loading">
        <div className="loading-spinner" />
      </div>
    );
  }

  return (
    <div className="form-page">
      <div className="container">
        <div className="owner-header">
          <Shield size={28} />
          <div>
            <h1 className="section-title">پنل مالک</h1>
            <p className="section-subtitle">تأیید حساب کاربران و مدیریت نقش‌ها (ناظرها)</p>
          </div>
        </div>

        {error && <div className="form-error">{error}</div>}

        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>کاربر</th>
                <th>ایمیل</th>
                <th>تیک آبی</th>
                <th>نقش</th>
                <th>عملیات</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>
                    {u.username}
                    {u.id === me?.id && <span style={{ color: "var(--color-primary)", marginInlineStart: 8 }}>(شما)</span>}
                  </td>
                  <td dir="ltr">{u.email}</td>
                  <td>
                    {u.verified ? <BadgeCheck size={20} style={{ color: "#3b82f6" }} /> : <span style={{ color: "#6b7280" }}>—</span>}
                  </td>
                  <td>
                    <select
                      className="filter-select"
                      value={u.role}
                      onChange={(e) => changeRole(u, e.target.value as UserRole)}
                      disabled={u.id === me?.id}
                    >
                      <option value="user">کاربر</option>
                      <option value="moderator">ناظر</option>
                      <option value="owner">مالک</option>
                    </select>
                  </td>
                  <td>
                    <button
                      type="button"
                      className={u.verified ? "btn btn-outline btn-sm" : "btn btn-primary btn-sm"}
                      onClick={() => toggleVerified(u)}
                    >
                      <BadgeCheck size={14} />
                      {u.verified ? "حذف تیک" : "دادن تیک"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
