import axios from "axios";

export const axiosInstance = axios.create({
  // baseURL: "http://localhost:5000/api/",
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api/",
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});
