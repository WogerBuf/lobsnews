export async function onRequestGet() {
  const resp = await fetch("https://qvmewmebcrkmyutvbzxv.functions.supabase.co/goodlede-sitemap");
  const xml = await resp.text();
  return new Response(xml, {
    headers: { "Content-Type": "application/xml; charset=utf-8" }
  });
}
