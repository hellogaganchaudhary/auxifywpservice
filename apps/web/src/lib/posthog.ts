"use client";

import posthog from "posthog-js";

export function initPosthog() {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://app.posthog.com";
  if (!key) return;
  if (posthog.__loaded) return;
  posthog.init(key, {
    api_host: host,
    autocapture: true,
    capture_pageview: true,
  });
}

export function identifyPosthog(user?: { id: string; email: string; name: string }) {
  if (!user) return;
  posthog.identify(user.id, {
    email: user.email,
    name: user.name,
  });
}
