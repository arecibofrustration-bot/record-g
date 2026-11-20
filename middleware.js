const { NextResponse } = require("next/server");

function middleware(req) {
  const cookie = req.cookies.get("captcha_ok");

  if (!cookie) {
    const gateUrl = new URL("/index.html", req.url);
    return NextResponse.redirect(gateUrl, 307);
  }

  return NextResponse.next();
}

const config = {
  matcher: ["/admin.html", "/records.html", "/login.html", "/reward.html"],
};

module.exports = { middleware, config };
