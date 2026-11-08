export function allowedOrigin(request: Request, allowlist: string): string | null {
  const origin = request.headers.get("origin");
  if (!origin) return null;
  const allowed = allowlist
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .some((pattern) => pattern === "*" || new RegExp(`^${pattern.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*")}$`).test(origin));
  return allowed ? origin : null;
}

export function corsHeaders(origin: string | null): Record<string, string> {
  if (!origin) return { vary: "Origin" };
  return {
    "access-control-allow-origin": origin,
    "access-control-allow-methods": "GET, POST, OPTIONS",
    "access-control-allow-headers": "content-type",
    "access-control-expose-headers": "server-timing",
    "access-control-max-age": "86400",
    vary: "Origin",
  };
}
