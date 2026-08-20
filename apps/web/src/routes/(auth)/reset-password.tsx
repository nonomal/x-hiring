import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { ResetPasswordForm } from "@/components/features/app/auth/reset-password-form";
import { ResetPasswordInvalid } from "@/components/features/app/auth/reset-password-invalid";

const searchSchema = z.object({ token: z.string(), email: z.email() });

export const Route = createFileRoute("/(auth)/reset-password")({
  validateSearch: searchSchema,
  errorComponent: ResetPasswordInvalid,
  component: () => {
    const { token, email } = Route.useSearch();
    return token && email ? (
      <ResetPasswordForm email={email} token={token} />
    ) : (
      <ResetPasswordInvalid />
    );
  },
  head: () => ({ meta: [{ title: "设置新密码 - X-Hiring" }] }),
});
