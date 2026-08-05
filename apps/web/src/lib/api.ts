import { createApiClient } from "@ecus/api-client";

// Empty base URL uses the same-origin proxy in development and the web container.
export const api = createApiClient(import.meta.env.VITE_API_BASE_URL || "");
