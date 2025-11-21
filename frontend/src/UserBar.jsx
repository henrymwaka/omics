// src/UserBar.jsx

import { useAuth } from "./context/AuthContext.jsx";
import { Link } from "react-router-dom";

function UserBar() {
  const { user, logout } = useAuth();

  return (
    <div className="userbar">
      <div />

      <div className="userbar-right">
        {user ? (
          <>
            <span className="userbar-username">{user.username}</span>
            <button className="userbar-logout" onClick={logout}>
              Logout
            </button>
          </>
        ) : (
          <Link className="userbar-login" to="/login">
            Sign in
          </Link>
        )}
      </div>
    </div>
  );
}

export default UserBar;
