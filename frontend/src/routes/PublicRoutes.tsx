import { Navigate, useLocation } from "react-router-dom";

const PublicRoutes = (props: any) => {
  const location = useLocation();
  if (localStorage.getItem("user")) {
    const locationState = location.state as any;
    const from = locationState?.from || "/";
    return <Navigate to={from} replace />;
  }
  return props.children;
};

export default PublicRoutes;
