export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const token = url.searchParams.get("token") || "";
  const resp = await fetch(
    `https://qvmewmebcrkmyutvbzxv.functions.supabase.co/goodlede-unsubscribe?token=${encodeURIComponent(token)}`
  );
  const html = await resp.text();
  return new Response(html, {
    status: resp.status,
    headers: { "Content-Type": "text/html; charset=utf-8" }
  });
}
