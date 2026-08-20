import { createFileRoute } from "@tanstack/react-router";
import { SignUp } from "@/components/features/app/auth/signup";

export const Route = createFileRoute("/(auth)/signup")({
  component: SignUp,
  head: () => ({ meta: [{ title: "注册 - X-Hiring" }] }),
});
