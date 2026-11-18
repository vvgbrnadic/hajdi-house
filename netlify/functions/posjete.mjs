import { getStore } from "@netlify/blobs";

function empty(){
  return { views: 0, seconds: 0, visitors: [], byDay: {} };
}

function dayKey(){
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Zagreb", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

function countryOf(req){
  let code = String(req.headers.get("x-country") || "").trim().toUpperCase();
  const raw = req.headers.get("x-nf-geo");
  if (raw) {
    try {
      const geo = JSON.parse(Buffer.from(raw, "base64").toString("utf8"));
      if (geo && geo.country && geo.country.code) code = String(geo.country.code).toUpperCase();
    } catch (e) {}
  }
  if (!/^[A-Z]{2}$/.test(code)) return { code: "??", name: "Nepoznato" };
  let name = code;
  try { name = new Intl.DisplayNames(["hr"], { type: "region" }).of(code) || code; } catch (e) {}
  return { code, name };
}

function publicView(data){
  const today = data.byDay[dayKey()] || { views: 0, seconds: 0, visitors: [] };
  const days = Object.keys(data.byDay).sort().slice(-14).map((day) => {
    const row = data.byDay[day];
    return { day, views: row.views || 0, seconds: row.seconds || 0, visitors: (row.visitors || []).length };
  });
  const countries = Object.entries(data.countries || {}).map(([code, row]) => ({
    code,
    name: row.name || code,
    visits: row.visits || 0,
    visitors: row.visitors || 0
  })).sort((a, b) => b.visitors - a.visitors || b.visits - a.visits);
  return {
    views: data.views || 0,
    seconds: data.seconds || 0,
    visitors: (data.visitors || []).length,
    today: { views: today.views || 0, seconds: today.seconds || 0, visitors: (today.visitors || []).length },
    days,
    countries
  };
}

function remember(list, id){
  if (!id || list.includes(id)) return list;
  const next = list.concat(id);
  return next.length > 4000 ? next.slice(-4000) : next;
}

export default async (req) => {
  const store = getStore({ name: "posjete", consistency: "strong" });
  const data = (await store.get("summary", { type: "json" })) || empty();
  if (req.method === "GET") {
    return Response.json(publicView(data));
  }
  if (req.method !== "POST") return new Response("Metoda nije podržana", { status: 405 });
  const ua = String(req.headers.get("user-agent") || "");
  if (ua.length < 12 || /bot|crawl|spider|slurp|preview|headless|lighthouse|pagespeed|wget|curl|python-requests|go-http|facebookexternalhit|embedly|whatsapp|telegrambot|applebot|bingpreview|petalbot|semrush|ahrefs|mj12bot|dotbot|yandex|duckduckbot|baiduspider/i.test(ua)) {
    return Response.json({ ok: true, skipped: "bot" });
  }
  let body = {};
  try { body = await req.json(); } catch (e) { body = {}; }
  const id = String(body.id || "").slice(0, 80);
  const seconds = Math.max(0, Math.min(120, Math.round(Number(body.seconds) || 0)));
  const view = body.view === true;
  if (!id || (!view && seconds === 0)) return Response.json({ ok: true });
  const day = dayKey();
  data.byDay[day] = data.byDay[day] || { views: 0, seconds: 0, visitors: [] };
  if (view) {
    const seen = (data.visitors || []).includes(id);
    const place = countryOf(req);
    data.countries = data.countries || {};
    const row = data.countries[place.code] || { name: place.name, visits: 0, visitors: 0 };
    row.name = place.name || row.name;
    row.visits += 1;
    if (!seen) row.visitors += 1;
    data.countries[place.code] = row;
    data.views += 1;
    data.byDay[day].views += 1;
    data.visitors = remember(data.visitors || [], id);
    data.byDay[day].visitors = remember(data.byDay[day].visitors || [], id);
  }
  if (seconds) {
    data.seconds += seconds;
    data.byDay[day].seconds += seconds;
  }
  const keep = Object.keys(data.byDay).sort().slice(-60);
  data.byDay = Object.fromEntries(keep.map((key) => [key, data.byDay[key]]));
  await store.setJSON("summary", data);
  return Response.json({ ok: true });
};
