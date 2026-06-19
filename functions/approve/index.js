export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const params = url.searchParams.toString();
  const resp = await fetch(
    `https://qvmewmebcrkmyutvbzxv.functions.supabase.co/goodlede-approve?${params}`
  );
  const html = await resp.text();
  return new Response(html, {
    status: resp.status,
    headers: { "Content-Type": "text/html; charset=utf-8" }
  });
}
