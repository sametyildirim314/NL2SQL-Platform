import { Navigate, useLocation } from "react-router-dom";
import { api } from "../../services/api";

/**
 * Route guard. Redirects unauthenticated users to /login,
 * preserving the original location for post-login redirect.
 */
export default function RequireAuth({ children }) {
  const location = useLocation();

  if (!api.isAuthenticated()) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return children;
}
