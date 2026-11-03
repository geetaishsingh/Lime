import axios from "axios";
import { serverUrl } from "../config";

export const api = axios.create({
  baseURL: `${serverUrl}/api`,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

export default api;
