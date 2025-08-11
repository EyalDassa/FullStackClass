import React, { useContext } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { AuthContext } from "../contexts/AuthContext";
import "./NavBar.css";

export default function NavBar() {
  const { token, user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout(); // clears token in context & localStorage
    navigate("/login"); // send the user back to login page
  };

  return (
    <header>
      <nav className="navbar">
        <Link to="/plan" className="navbar-brand">
          TripPlanner
        </Link>
        <div className="navbar-links">
          <NavLink to="/plan">Plan</NavLink>
          <NavLink to="/history">History</NavLink>
          {token && user && <span className="user-email">{user.email}</span>}
          {token && (
            <button onClick={handleLogout} className="logout-btn">
              Logout
            </button>
          )}
        </div>
      </nav>
    </header>
  );
}
