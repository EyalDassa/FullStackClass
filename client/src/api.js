import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:8080", // your server’s URL
  headers: {
    "Content-Type": "application/json",
  },
});

export default api;
