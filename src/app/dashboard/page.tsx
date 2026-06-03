import { redirect } from "next/navigation";
import { getUserId } from "@/lib/session";
import SystemDashboard from "@/components/SystemDashboard";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const userId = await getUserId();
  if (!userId) redirect("/login");
  return <SystemDashboard />;
}
