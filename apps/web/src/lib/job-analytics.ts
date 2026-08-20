export function trackEvent(
  name: string,
  properties?: Record<string, string | number | boolean | null | undefined>,
) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent("x-hiring:analytics", {
      detail: { name, properties },
    }),
  );
}
