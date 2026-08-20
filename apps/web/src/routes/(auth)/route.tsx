import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AuthLayout } from "@/components/features/app/auth/auth-layout";

export const Route = createFileRoute("/(auth)")({
  component: () => (
    <AuthLayout>
      <Outlet />
    </AuthLayout>
  ),
});
