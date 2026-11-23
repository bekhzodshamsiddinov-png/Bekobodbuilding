import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

// Locale negotiation and prefixing for the public site.
export default createMiddleware(routing);

export const config = {
  // Everything except API routes, the CRM, Next internals and files with an extension.
  matcher: ["/((?!api|crm|_next|_vercel|.*\\..*).*)"],
};
