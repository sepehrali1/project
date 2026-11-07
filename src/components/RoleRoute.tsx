import { Navigate } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuth } from "../contexts/AuthContext";

const HIERARCHY: Record<string, number> = {
  user: 0,
  moderator: 1,
  owner: 2,
};

interface Props {
  children: ReactNode;
  minRole: "user" | "moderator" | "owner";
}

export default function RoleRoute({ children, minRole }: Props) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="page-loading">
        <div className="loading-spinner" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (HIERARCHY[user.role] < HIERARCHY[minRole]) return <Navigate to="/" replace />;

  return <>{children}</>;
}