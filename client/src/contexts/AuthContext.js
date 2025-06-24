import React, { createContext, useState, useEffect } from "react";
import api from "../api";

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  // 1) token state, initialized from localStorage if present
  const [token, setToken] = useState(() => localStorage.getItem("token"));

  // 2) whenever the token changes, sync it to localStorage & axios
  useEffect(() => {
    if (token) {
      localStorage.setItem("token", token);
      api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    } else {
      localStorage.removeItem("token");
      delete api.defaults.headers.common["Authorization"];
    }
  }, [token]);

  // 3) login: call your backend, store returned token
  const login = async (email, password) => {
    const res = await api.post("/auth/login", { email, password });
    setToken(res.data.token);
  };

  // 4) register: call backend, then log in automatically
  const register = async (name, email, password) => {
    await api.post("/auth/register", { name, email, password });
    // now log them in
    return login(email, password);
  };

  // 5) logout: clear the token
  const logout = () => {
    setToken(null);
  };

  return (
    <AuthContext.Provider value={{ token, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
