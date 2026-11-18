import { getStore } from "@netlify/blobs";

function empty(){
  return { views: 0, seconds: 0, visitors: [], byDay: {} };
}

function dayKey(){
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Zagreb", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

function publicView(data){
  const today = data.byDay[dayKey()] || { views: 0, seconds: 0, visitors: [] };
  const days = Object.keys(data.byDay).sort().slice(-14).map((day) => {
    const row = data.byDay[day];
    return { day, views: row.views || 0, seconds: row.seconds || 0, visitors: (row.visitors || []).length };
  });
  return {
    views: data.views || 0,
    seconds: data.seconds || 0,
    visitors: (data.visitors || []).length,
    today: { views: today.views || 0, seconds: today.seconds || 0, visitors: (today.visitors || []).length },
    days
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
  let body = {};
  try { body = await req.json(); } catch (e) { body = {}; }
  const id = String(body.id || "").slice(0, 80);
  const seconds = Math.max(0, Math.min(120, Math.round(Number(body.seconds) || 0)));
  const view = body.view === true;
  if (!id || (!view && seconds === 0)) return Response.json({ ok: true });
  const day = dayKey();
  data.byDay[day] = data.byDay[day] || { views: 0, seconds: 0, visitors: [] };
  if (view) {
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
