// api/verify.js
// Vercel serverless function — verifies the reCAPTCHA token server-side,
// then sets an HttpOnly cookie that middleware.js checks for.

// Set this in Vercel dashboard -> Project -> Settings -> Environment Variables
// Name: RECAPTCHA_SECRET_KEY
const RECAPTCHA_SECRET_KEY = process.env.RECAPTCHA_SECRET_KEY;

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { token } = req.body || {};

  if (!token) {
    return res.status(400).json({ error: "Missing CAPTCHA token" });
  }

  if (!RECAPTCHA_SECRET_KEY) {
    console.error("RECAPTCHA_SECRET_KEY is not set in environment variables");
    return res.status(500).json({ error: "Server misconfigured" });
  }

  try {
    const verifyRes = await fetch(
      "https://www.google.com/recaptcha/api/siteverify",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `secret=${RECAPTCHA_SECRET_KEY}&response=${token}`,
      },
    );

    const data = await verifyRes.json();

    if (!data.success) {
      return res.status(403).json({
        error: "CAPTCHA verification failed",
        details: data["error-codes"],
      });
    }

    // Optional: for reCAPTCHA v3 you'd also check data.score here, e.g.:
    // if (data.score < 0.5) return res.status(403).json({ error: 'Low trust score' });

    // Set a signed-ish, HttpOnly, short-lived cookie proving this browser passed.
    // Max-Age is in seconds — 3600 = 1 hour. Adjust as you like.
    res.setHeader(
      "Set-Cookie",
      `captcha_ok=1; Path=/; HttpOnly; Max-Age=3600; SameSite=Lax; Secure`,
    );

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error("CAPTCHA verify error:", err);
    return res.status(500).json({ error: "Verification request failed" });
  }
};
