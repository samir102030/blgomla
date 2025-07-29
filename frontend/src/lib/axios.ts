import axios from "axios";

export const axiosInstance = axios.create({
  baseURL: process.env.NODE_ENV === 'production' 
    ? "https://egy-chem-hub-production.up.railway.app/api"
    : "http://localhost:5002/api",
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});
