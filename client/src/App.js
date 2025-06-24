import React from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import PrivateRoute from "./components/PrivateRoute";
import NavBar from "./components/NavBar";
import Login from "./pages/Login";
import Register from "./pages/Register";
import PlanTrip from "./pages/PlanTrip";
import History from "./pages/History";
import TripDetail from "./pages/TripDetail";

function App() {
  const location = useLocation();
  // only show NavBar on paths other than /login and /register
  const hideNav = ["/login", "/register"].includes(location.pathname);

  return (
    <div className="app-container">
      {!hideNav && <NavBar />}
      <main>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          <Route
            path="/plan"
            element={
              <PrivateRoute>
                <PlanTrip />
              </PrivateRoute>
            }
          />
          <Route
            path="/history"
            element={
              <PrivateRoute>
                <History />
              </PrivateRoute>
            }
          />
          <Route
            path="/history/:id"
            element={
              <PrivateRoute>
                <TripDetail />
              </PrivateRoute>
            }
          />
          <Route path="*" element={<Navigate to="/plan" replace />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
