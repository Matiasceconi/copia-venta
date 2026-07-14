import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Mapping exacto de nombres de la lista del usuario a player_id del plantel
const PLAYER_IDS = {
  "Juan Puchetta":          "6a3f0effd901e7856b03a918",
  "Dylam Almada":           "6a3eef7270d826031108e316",
  "Alessandro Guennin":     "6a3eef733f6057f6e213cab6",
  "Patricio Flores":        "6a3eef72a61a01225d536269",
  "Emiliano Cantero":       "6a3eef7307e048e9c9925a45",
  "Jose Capponi":           "6a3f2745418de33154038772",
  "Joaquin Ejea":           "6a3eef722df7aa69de71b255",
  "Lautaro Quiroga":        "6a3eef7283dab3778fd32d1e",
  "Lautaro Agustin Vazquez": "6a3eef73d805d51b063617c8",
  "Uriel Ramos":            "6a3eef73e930b77bf695fc83",
  "Sebastian Neris Miño":   "6a3eef72b5e6b95a6d015ecc",
  "Franco Pastrana":        "6a3eef7312ba756ef5b69fa7",
  "Gaston Ayala":           "6a3eef73d26521423882cb27",
};

const FECHAS = [
  { label: "JUV F1",  date: "2026-03-15", rival: "Atletico Tucuman", jugadores: [
    ["Juan Puchetta", 74], ["Dylam Almada", 96], ["Alessandro Guennin", 77], ["Patricio Flores", 96],
  ] },
  { label: "JUV F2",  date: "2026-03-22", rival: "Independiente Rivadavia", jugadores: [
    ["Thomas Blasquez", 45], ["Emiliano Cantero", 89], ["Jose Capponi", 95], ["Joaquin Ejea", 89],
    ["Juan Puchetta", 72], ["Dylam Almada", 105], ["Alessandro Guennin", 105], ["Lautaro Quiroga", 65],
    ["Lautaro Agustin Vazquez", 95], ["Uriel Ramos", 95],
  ] },
  { label: "JUV F3",  date: "2026-03-28", rival: "Vélez", jugadores: [
    ["Thomas Blasquez", 45], ["Sebastian Neris Miño", 80], ["Dylam Almada", 53],
    ["Lautaro Quiroga", 93], ["Patricio Flores", 93],
  ] },
  { label: "JUV F4",  date: "2026-04-02", rival: "Ferro", jugadores: [
    ["Thomas Blasquez", 25], ["Emiliano Cantero", 97], ["Jose Capponi", 97], ["Joaquin Ejea", 64],
    ["Sebastian Neris Miño", 97], ["Franco Pastrana", 62], ["Juan Puchetta", 73], ["Alessandro Guennin", 97],
    ["Lautaro Quiroga", 64], ["Lautaro Agustin Vazquez", 97], ["Uriel Ramos", 97],
  ] },
  { label: "JUV F5",  date: "2026-04-08", rival: "Banfield", jugadores: [
    ["Thomas Blasquez", 45], ["Emiliano Cantero", 99], ["Jose Capponi", 69], ["Sebastian Neris Miño", 94],
    ["Juan Puchetta", 99], ["Alessandro Guennin", 99], ["Lautaro Quiroga", 94], ["Patricio Flores", 98],
  ] },
  { label: "JUV F6",  date: "2026-04-11", rival: "Lanús", jugadores: [
    ["Jose Capponi", 91], ["Joaquin Ejea", 46], ["Sebastian Neris Miño", 91], ["Juan Puchetta", 65],
    ["Alessandro Guennin", 96], ["Lautaro Agustin Vazquez", 69], ["Uriel Ramos", 96],
  ] },
  { label: "JUV F7",  date: "2026-04-15", rival: "Racing", jugadores: [
    ["Jose Capponi", 93], ["Joaquin Ejea", 93], ["Sebastian Neris Miño", 93], ["Juan Puchetta", 93],
    ["Alessandro Guennin", 93], ["Lautaro Agustin Vazquez", 93], ["Patricio Flores", 96],
  ] },
  { label: "JUV F8",  date: "2026-04-18", rival: "Rosario Central", jugadores: [
    ["Sebastian Neris Miño", 93], ["Franco Pastrana", 45], ["Juan Puchetta", 62],
    ["Dylam Almada", 95], ["Uriel Ramos", 93],
  ] },
  { label: "JUV F9",  date: "2026-04-21", rival: "Newell's", jugadores: [
    ["Patricio Flores", 96],
  ] },
  { label: "JUV F10", date: "2026-04-25", rival: "Godoy Cruz", jugadores: [
    ["Sebastian Neris Miño", 93], ["Dylam Almada", 78], ["Patricio Flores", 93],
  ] },
  { label: "JUV F11", date: "2026-04-28", rival: "Platense", jugadores: [
    ["Sebastian Neris Miño", 45], ["Dylam Almada", 96], ["Patricio Flores", 93],
  ] },
  { label: "JUV F12", date: "2026-05-02", rival: "Argentinos", jugadores: [
    ["Joaquin Ejea", 45], ["Sebastian Neris Miño", 94], ["Juan Puchetta", 45],
    ["Dylam Almada", 94], ["Patricio Flores", 94],
  ] },
  { label: "JUV F13", date: "2026-05-13", rival: "Godoy Cruz", jugadores: [] },
  { label: "JUV F14", date: "2026-05-20", rival: "Platense", jugadores: [
    ["Joaquin Ejea", 95], ["Sebastian Neris Miño", 95], ["Franco Pastrana", 80],
    ["Dylam Almada", 88], ["Alessandro Guennin", 95],
  ] },
  { label: "JUV F15", date: "2026-06-18", rival: "Argentinos", jugadores: [
    ["Gaston Ayala", 70], ["Jose Capponi", 96], ["Joaquin Ejea", 93],
    ["Sebastian Neris Miño", 93], ["Franco Pastrana", 70], ["Dylam Almada", 60],
    ["Alessandro Guennin", 90], ["Lautaro Quiroga", 46], ["Patricio Flores", 93],
  ] },
];

function norm(s) {
  return (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim();
}

function resolve(nombre) {
  if (PLAYER_IDS[nombre] !== undefined) return { id: PLAYER_IDS[nombre], name: nombre };
  const n = norm(nombre);
  for (const [k, v] of Object.entries(PLAYER_IDS)) {
    if (norm(k) === n) return { id: v, name: k };
  }
  return null;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const existing = await base44.asServiceRole.entities.MatchReport.filter({ competition: "Juveniles" }, "-date", 50);
    const matchByDate = {};
    existing.forEach(m => { matchByDate[m.date] = m; });

    let insertados = 0;
    let sinId = 0;

    for (const fecha of FECHAS) {
      const match = matchByDate[fecha.date];
      if (!match) {
        // crear solo si no existe
        await base44.asServiceRole.entities.MatchReport.create({
          date: fecha.date, rival: fecha.rival, competition: "Juveniles", location: "Local",
        });
      }

      for (const [nombre, mins] of fecha.jugadores) {
        const res = resolve(nombre);
        await base44.asServiceRole.entities.MinutesRecord.create({
          player_id: res?.id || null,
          player_name: res?.name || nombre,
          tournament: "Juveniles",
          match_label: fecha.label,
          match_date: fecha.date,
          rival: fecha.rival,
          minutes: mins,
        });
        insertados++;
        if (!res?.id) sinId++;
      }
    }

    return Response.json({
      success: true,
      minutosInsertados: insertados,
      sinPlayerId: sinId,
      message: `${insertados} minutos registrados (${sinId} sin player_id - solo Thomas Blasquez)`
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});