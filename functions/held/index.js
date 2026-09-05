// Held stories, served through goodlede.com.
//
// Why this proxy exists (2026-09-05): the digest linked straight at
// https://qvmewmebcrkmyutvbzxv.functions.supabase.co/goodlede-held, and Michael clicked it and got
// a screenful of raw HTML source. The function sets "content-type: text/html" correctly -- the raw
// Supabase functions domain overrides it. Every function on that domain answers with
// "Content-Type: text/plain", "X-Content-Type-Options: nosniff" and a "sandbox" CSP, so a browser
// shows the markup instead of rendering it. Redeploying the function does not change that; it is
// the domain, not the code.
//
// Story pages already avoid this by coming through goodlede.com (functions/story/[slug].js), which
// is why they render and this one did not. Same trick here: fetch the function server-side and
// re-serve the body under our own domain with the right content type.
// The page posts back to itself (Run it / Save caveat), so this route has to accept POST as well
// as GET -- a GET-only Pages Function answers a form submit with 405 and the button does nothing.
export async function onRequestPost(context) {
  const FN = "https://qvmewmebcrkmyutvbzxv.functions.supabase.co/goodlede-held";
  let upstream;
  try {
    upstream = await fetch(FN, {
      method: "POST",
      headers: {
        "content-type": context.request.headers.get("content-type") || "application/x-www-form-urlencoded",
        "user-agent": "goodlede-site-proxy",
      },
      // The token travels inside the form body, so the body is passed through untouched.
      body: await context.request.text(),
    });
  } catch (_) {
    return new Response(
      "<!DOCTYPE html><meta charset=utf-8><title>Held stories</title>" +
      "<p style=\"font-family:Georgia,serif;padding:32px\">Could not reach the held-stories service. Nothing was changed &mdash; go back and try again.</p>",
      { status: 502, headers: { "content-type": "text/html; charset=utf-8" } }
    );
  }
  const body = await upstream.text();
  return new Response(body, {
    status: upstream.status,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
      "referrer-policy": "no-referrer",
      "x-robots-tag": "noindex",
    },
  });
}

export async function onRequestGet(context) {
  const FN = "https://qvmewmebcrkmyutvbzxv.functions.supabase.co/goodlede-held";

  const url = new URL(context.request.url);
  // The function does its own token check and returns 403 on a bad one -- pass the token straight
  // through rather than duplicating the check (and the secret) here.
  const token = url.searchParams.get("token") || url.searchParams.get("t") || "";

  let upstream;
  try {
    upstream = await fetch(FN + "?token=" + encodeURIComponent(token), {
      headers: { "user-agent": "goodlede-site-proxy" },
    });
  } catch (_) {
    return new Response(
      "<!DOCTYPE html><meta charset=utf-8><title>Held stories</title>" +
      "<p style=\"font-family:Georgia,serif;padding:32px\">Could not reach the held-stories service. Try again in a moment.</p>",
      { status: 502, headers: { "content-type": "text/html; charset=utf-8" } }
    );
  }

  const body = await upstream.text();
  return new Response(body, {
    status: upstream.status,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
      "referrer-policy": "no-referrer",
      "x-robots-tag": "noindex",
    },
  });
}
