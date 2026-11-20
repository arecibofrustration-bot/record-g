// middleware.js
// Runs on Vercel's Edge Network before protected.html is served.
// If the captcha_ok cookie isn't present, bounce back to the gate.

export function middleware(req) {
  const cookie = req.cookies.get("captcha_ok");

  if (!cookie) {
    const gateUrl = new URL("/index.html", req.url);
    return Response.redirect(gateUrl, 307);
  }

  // Cookie present -> let the request through to protected.html
  return;
}

// Only run this middleware for requests to protected.html.
// Add more paths here (comma-separated) if you gate more pages later,
// e.g. matcher: ['/protected.html', '/dashboard.html']
export const config = {
  matcher: ["/admin.html", "/records.html", "/login.html", "/reward.html"],
};
