// middleware.js
// Runs on Vercel's Edge Network before protected pages are served.
// If the captcha_ok cookie isn't present, bounce back to the gate.

import { next } from "@vercel/functions";

export default function middleware(req) {
  const cookie = req.cookies.get("captcha_ok");

  if (!cookie) {
    const gateUrl = new URL("/index.html", req.url);
    return new Response(null, {
      status: 307,
      headers: { Location: gateUrl.toString() },
    });
  }

  // Cookie present -> let the request through
  return next();
}

export const config = {
  matcher: ["/admin.html", "/records.html", "/login.html", "/reward.html"],
};
