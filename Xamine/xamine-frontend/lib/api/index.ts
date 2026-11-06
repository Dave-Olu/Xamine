import { createHttpApi } from "./http";
import { mockApi } from "./mock";
import type { XamineApi } from "./types";

// Mock by default. Set NEXT_PUBLIC_API_URL to use the real backend.
const url = process.env.NEXT_PUBLIC_API_URL;
export const api: XamineApi = url ? createHttpApi(url) : mockApi;
export * from "./types";
