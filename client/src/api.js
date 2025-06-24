import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:8080", // your server’s URL
  headers: {
    "Content-Type": "application/json",
  },
});

// Optional: attach a request interceptor to include your JWT automatically
// api.interceptors.request.use((config) => {
//   const token = localStorage.getItem("token");
//   if (token) config.headers.Authorization = `Bearer ${token}`;
//   return config;
// });

export default api;
