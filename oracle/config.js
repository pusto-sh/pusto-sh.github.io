// Set to the deployed HTTPS API origin after the Docker service is verified.
// This file contains public routing only. Never put credentials here.
export const API_BASE = ["localhost", "127.0.0.1"].includes(location.hostname)
  ? "/api"
  : null;
