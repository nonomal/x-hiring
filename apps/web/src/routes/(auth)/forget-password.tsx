import { createFileRoute } from "@tanstack/react-router";
import { ForgotPassword } from "@/components/features/app/auth/forgot-password";

export const Route = createFileRoute("/(auth)/forget-password")({
  component: ForgotPassword,
  head: () => ({ meta: [{ title: "重置密码 - X-Hiring" }] }),
});
