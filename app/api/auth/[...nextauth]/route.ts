// Auth.js (NextAuth) catch-all route — delegates GET/POST to the handlers
// configured in lib/auth.ts (OAuth callbacks, session endpoints, etc.).
import { handlers } from "@/lib/auth";

export const { GET, POST } = handlers;
