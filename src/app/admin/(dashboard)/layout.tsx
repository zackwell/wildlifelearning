import { redirect } from "next/navigation";
import { isAdminConfigured } from "@/lib/admin/config";
import { getAdminSession } from "@/lib/admin/session";
import { AdminNav } from "@/components/admin/AdminNav";

export default async function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!isAdminConfigured()) redirect("/admin/login");
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");

  return (
    <div className="flex min-h-screen">
      <AdminNav />
      <div className="flex-1 overflow-x-auto p-6 lg:p-8">{children}</div>
    </div>
  );
}
