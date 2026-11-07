import { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { Menu, X, LogIn, Plus } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";

interface NavItem {
  to: string;
  label: string;
  end?: boolean;
}

const NAV_LINKS: NavItem[] = [
  { to: "/", label: "خانه", end: true },
  { to: "/scripts", label: "اسکریپت‌ها" },
  { to: "/scripts?sort=trending", label: "پرطرفدار" },
];

export default function Navbar() {
  const { user, loading } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const close = () => setMobileOpen(false);

  const navClass = mobileOpen ? "navbar-links open" : "navbar-links";
  const isAdmin = user && (user.role === "owner" || user.role === "moderator");
  const isOwner = user && user.role === "owner";

  return (
    <header className="navbar">
      <div className="container navbar-inner">
        <Link to="/" className="navbar-logo" onClick={close}>
          <span className="logo-mark">S</span>
          <span className="logo-text">SSBLOX</span>
        </Link>

        <nav className={navClass}>
          {NAV_LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              onClick={close}
              className={({ isActive }) => (isActive ? "active" : undefined)}
            >
              {link.label}
            </NavLink>
          ))}
          {user && (
            <NavLink to="/my-scripts" onClick={close}>
              اسکریپت‌های من
            </NavLink>
          )}
          {isAdmin && (
            <NavLink to="/admin" onClick={close}>
              پنل مدیریت
            </NavLink>
          )}
          {isOwner && (
            <NavLink to="/owner" onClick={close}>
              پنل مالک
            </NavLink>
          )}
        </nav>

        <div className="navbar-actions">
          {loading ? null : user ? (
            <>
              <Link
                to="/scripts/new"
                className="btn btn-primary btn-sm"
                onClick={close}
              >
                <Plus size={14} />
                <span className="navbar-hide-sm">اسکریپت جدید</span>
              </Link>
              <Link to="/profile" className="navbar-user" onClick={close}>
                <div className="navbar-avatar">
                  {user.username.charAt(0).toUpperCase()}
                </div>
                <span className="navbar-username">{user.username}</span>
              </Link>
            </>
          ) : (
            <>
              <Link to="/login" className="btn btn-ghost navbar-login">
                <LogIn size={16} />
                <span>ورود</span>
              </Link>
              <Link to="/register" className="btn btn-primary">
                ثبت‌نام
              </Link>
            </>
          )}

          <button
            type="button"
            className="navbar-toggle"
            aria-label="منو"
            onClick={() => setMobileOpen((v) => !v)}
          >
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>
    </header>
  );
}