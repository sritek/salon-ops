/**
 * Internal Admin Layout
 * Separate layout for internal admin portal
 */

export default function InternalLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-slate-50">{children}</div>;
}
