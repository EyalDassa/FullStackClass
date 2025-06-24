import React, { useContext } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthContext } from "../contexts/AuthContext";

export default function NavBar() {
  const { token, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout(); // clears token in context & localStorage
    navigate("/login"); // send the user back to login page
  };

  return (
    <nav style={{ padding: "1rem", borderBottom: "1px solid #ccc" }}>
      {/* always show these links */}
      <Link to="/plan" style={{ marginRight: "1rem" }}>
        Plan
      </Link>
      <Link to="/history" style={{ marginRight: "1rem" }}>
        History
      </Link>

      {/* only show logout when logged in */}
      {token && <button onClick={handleLogout}>Logout</button>}
    </nav>
  );
}
