import { useAuth } from "./context/AuthContext";
import { Navigate } from "react-router-dom";

function ProtectedRoute({ children }) {
  const { user, initializing } = useAuth();

  if (initializing) return <div>Loading...</div>;

  if (!user) return <Navigate to="/login" replace />;

  return children;
}

export default ProtectedRoute;
