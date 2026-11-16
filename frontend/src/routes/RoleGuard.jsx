/* Restricts nested routes to users with one of the allowed roles. */
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../contexts/useAuth";

export default function RoleGuard({ roles = [] }) {
  const { user } = useAuth();
  const userRoles = [...(Array.isArray(user?.roles) ? user.roles : []), user?.role]
    .filter(Boolean)
    .map((role) => String(role).toLowerCase());
  const hasAllowedRole = roles.some((role) =>
    userRoles.includes(String(role).toLowerCase())
  );

  return hasAllowedRole ? <Outlet /> : <Navigate to="/403" replace />;
}
