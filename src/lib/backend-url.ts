export const backendUrl = (process.env.BACKEND_URL ?? "http://api:8000").replace(/\/$/, "");
