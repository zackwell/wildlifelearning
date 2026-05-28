import { redirect } from "next/navigation";
import { isAdminConfigured } from "@/lib/admin/config";
import { getAdminSession } from "@/lib/admin/session";
import { AdminLoginForm } from "@/components/admin/AdminLoginForm";

export default async function AdminLoginPage() {
  if (!isAdminConfigured()) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="max-w-md text-center">
          <h1 className="text-xl font-semibold text-stone-100">管理员功能未配置</h1>
          <p className="mt-3 text-sm text-stone-400">
            请在服务器 .env 中设置 ADMIN_USERNAME 与 ADMIN_PASSWORD 后重启应用。
          </p>
        </div>
      </div>
    );
  }

  const session = await getAdminSession();
  if (session) redirect("/admin");

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-stone-800 bg-stone-900/80 p-8 shadow-xl">
        <h1 className="text-center text-xl font-semibold text-stone-50">管理员登录</h1>
        <p className="mt-2 text-center text-sm text-stone-500">此页面不在公开导航中显示</p>
        <div className="mt-8">
          <AdminLoginForm />
        </div>
      </div>
    </div>
  );
}
