import { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import useTypedSelector from "../hooks/useTypedSelector";
import { selectedUserRole } from "../redux/auth/authSlice";

interface ProtectedRoutesProps {
  allowedRoles?: string[];
  children: ReactNode;
}

const ProtectedRoutes = ({ allowedRoles, children }: ProtectedRoutesProps) => {
  const location = useLocation();
  const authUser = useTypedSelector((state) => state.auth?.user);
  const role = useTypedSelector(selectedUserRole);
  console.log("[ProtectedRoutes]", {
  path: location.pathname,
  authUser,
  role,
  allowedRoles,
});
  const destination =
    role === "admin" || role === "super_admin"
      ? "/dashboard/admin"
      : role === "landlord"
        ? "/dashboard/landlord"
        : role === "provider"
          ? "/dashboard/provider"
        : role === "tenant"
          ? "/dashboard/tenant"
          : "/";

  if (!authUser) {
    return (
      <Navigate
        to="/login"
        state={{ from: location.pathname + location.search }}
        replace
      />
    );
  }

  if (!allowedRoles || allowedRoles.length === 0) {
    return <>{children}</>;
  }

  if (role && allowedRoles.includes(role)) {
    return <>{children}</>;
  }

  return <Navigate to={destination} replace />;
};

export default ProtectedRoutes;
