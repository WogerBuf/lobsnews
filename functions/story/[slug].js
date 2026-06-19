export async function onRequestGet(context) {
  const slug = context.params.slug;
  if (!slug) return new Response("Not found", { status: 404 });
  const resp = await fetch(
    `https://qvmewmebcrkmyutvbzxv.functions.supabase.co/goodlede-story?id=${encodeURIComponent(slug)}`
  );
  const html = await resp.text();
  return new Response(html, {
    status: resp.status,
    headers: { "Content-Type": "text/html; charset=utf-8" }
  });
}
