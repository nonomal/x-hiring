import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/(auth)/login")({
  component: () => <Navigate to="/signin" />,
});
