import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { VerifyEmailInvalid } from "@/components/features/app/auth/verify-email-invalid";
import { VerifyEmailSuccess } from "@/components/features/app/auth/verify-email-success";

const searchSchema = z.object({ token: z.string(), email: z.email() });

export const Route = createFileRoute("/(auth)/verify-email")({
  validateSearch: searchSchema,
  component: () => {
    const { token, email } = Route.useSearch();
    const [state, setState] = useState<"loading" | "success" | "invalid">(
      "loading",
    );

    useEffect(() => {
      let cancelled = false;
      void fetch(`/api/auth/verify-email?token=${encodeURIComponent(token)}`, {
        credentials: "include",
      })
        .then((response) => {
          if (!cancelled) setState(response.ok ? "success" : "invalid");
        })
        .catch(() => {
          if (!cancelled) setState("invalid");
        });
      return () => {
        cancelled = true;
      };
    }, [token]);

    if (state === "loading") return <p>正在验证邮箱…</p>;
    return state === "success" ? <VerifyEmailSuccess /> : <VerifyEmailInvalid email={email} />;
  },
  head: () => ({ meta: [{ title: "验证邮箱 - X-Hiring" }] }),
});
