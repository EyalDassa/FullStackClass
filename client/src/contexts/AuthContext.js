import React, { createContext, useState, useEffect } from "react";
import api from "../api";

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  // 1) token state, initialized from localStorage if present
  const [token, setToken] = useState(() => localStorage.getItem("token"));
  // 2) user state, initialized from localStorage if present
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem("user");
    return savedUser ? JSON.parse(savedUser) : null;
  });

  // 3) whenever the token or user changes, sync them to localStorage & axios
  useEffect(() => {
    if (token) {
      localStorage.setItem("token", token);
      api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    } else {
      localStorage.removeItem("token");
      delete api.defaults.headers.common["Authorization"];
    }
  }, [token]);

  // 4) whenever user changes, sync to localStorage
  useEffect(() => {
    if (user) {
      localStorage.setItem("user", JSON.stringify(user));
    } else {
      localStorage.removeItem("user");
    }
  }, [user]);

  // 5) login: call your backend, store returned token and user info
  const login = async (email, password) => {
    const res = await api.post("/auth/login", { email, password });
    setToken(res.data.token);
    setUser({ email: email }); // Store user email
  };

  // 6) register: call backend, then log in automatically
  const register = async (name, email, password) => {
    await api.post("/auth/register", { name, email, password });
    // now log them in
    return login(email, password);
  };

  // 7) logout: clear the token and user info
  const logout = () => {
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ token, user, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
