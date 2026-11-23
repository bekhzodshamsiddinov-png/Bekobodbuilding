// The real root layouts are app/[locale]/layout.tsx (public site) and
// app/crm/layout.tsx (staff panel). This pass-through lets app/not-found.tsx
// handle URLs that match neither.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
