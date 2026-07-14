export function parseSystem(system) {
  return String(system || "4-3-3").split("-").map((n) => Number(n)).filter(Boolean);
}

const POSITION_LABELS = {
  ARQ: { group: "Arquero", preferred: ["ARQ", "Arquero", "Portero", "Goalkeeper"] },
  LD: { group: "Defensor", preferred: ["LD", "Lateral derecho", "Lateral Derecho"] },
  LI: { group: "Defensor", preferred: ["LI", "Lateral izquierdo", "Lateral Izquierdo"] },
  DFC: { group: "Defensor", preferred: ["DFC", "Defensor central", "Defensor Central", "Central", "Zaguero"] },
  MCD: { group: "Mediocampista", preferred: ["MCD", "Volante central", "Mediocampista defensivo", "Cinco"] },
  MC: { group: "Mediocampista", preferred: ["MC", "Mediocampista central", "Volante interno", "Interior"] },
  MCO: { group: "Mediocampista", preferred: ["MCO", "Enganche", "Mediapunta", "Volante ofensivo"] },
  ED: { group: "Delantero", preferred: ["ED", "Extremo derecho", "Wing derecho"] },
  EI: { group: "Delantero", preferred: ["EI", "Extremo izquierdo", "Wing izquierdo"] },
  DC: { group: "Delantero", preferred: ["DC", "Delantero centro", "Centrodelantero", "Nueve"] },
};

function strip(value) {
  return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

function tokenFromText(value) {
  const text = strip(value);
  if (!text) return "";
  if (/(arquero|portero|goalkeeper|\barq\b)/.test(text)) return "ARQ";
  if (/(lateral derecho|\bld\b|right back)/.test(text)) return "LD";
  if (/(lateral izquierdo|\bli\b|left back)/.test(text)) return "LI";
  if (/(defensor central|central|zaguero|\bdfc\b)/.test(text)) return "DFC";
  if (/(mcd|mediocampista defensivo|volante central|cinco|pivote)/.test(text)) return "MCD";
  if (/(mco|enganche|mediapunta|volante ofensivo)/.test(text)) return "MCO";
  if (/(extremo derecho|wing derecho|\bed\b)/.test(text)) return "ED";
  if (/(extremo izquierdo|wing izquierdo|\bei\b)/.test(text)) return "EI";
  if (/(delantero centro|centrodelantero|delantero|nueve|\bdc\b)/.test(text)) return "DC";
  if (/(mediocampista central|volante interno|interior|mediocampista|volante|\bmc\b)/.test(text)) return "MC";
  if (/(defensor|lateral)/.test(text)) return "DFC";
  if (/(extremo|atacante)/.test(text)) return "ED";
  return "";
}

function slotMeta(slotKey) {
  const base = POSITION_LABELS[slotKey] || POSITION_LABELS.MC;
  return { slot_key: slotKey, position_group: base.group, preferred_positions: base.preferred };
}

function keysForLine(count, lineIndex, totalLines) {
  if (lineIndex === 0) {
    if (count === 3) return ["DFC", "DFC", "DFC"];
    if (count === 5) return ["LI", "DFC", "DFC", "DFC", "LD"];
    if (count === 4) return ["LI", "DFC", "DFC", "LD"];
    return Array.from({ length: count }, () => "DFC");
  }
  const isLast = lineIndex === totalLines - 1;
  const isAttackMid = totalLines >= 4 && lineIndex === totalLines - 2;
  if (isLast) {
    if (count === 1) return ["DC"];
    if (count === 2) return ["DC", "DC"];
    if (count === 3) return ["EI", "DC", "ED"];
    return Array.from({ length: count }, () => "DC");
  }
  if (isAttackMid) {
    if (count === 1) return ["MCO"];
    if (count === 2) return ["MCO", "MCO"];
    if (count === 3) return ["EI", "MCO", "ED"];
    if (count === 4) return ["EI", "MC", "MC", "ED"];
  }
  if (count === 1) return ["MCD"];
  if (count === 2) return ["MCD", "MCD"];
  if (count === 3) return ["MC", "MCD", "MC"];
  if (count === 4) return ["EI", "MC", "MC", "ED"];
  return Array.from({ length: count }, () => "MC");
}

export function buildFormationSlots(system) {
  const lines = parseSystem(system);
  const yValues = lines.length === 4 ? [69, 51, 34, 16] : [69, 46, 22];
  const slots = [{ ...slotMeta("ARQ"), x: 50, y: 88 }];
  lines.forEach((count, lineIndex) => {
    const keys = keysForLine(count, lineIndex, lines.length);
    keys.forEach((slotKey, index) => {
      slots.push({
        ...slotMeta(slotKey),
        x: ((index + 1) * 100) / (count + 1),
        y: yValues[lineIndex] || 20,
      });
    });
  });
  return slots.slice(0, 11);
}

export function nearestSlotForPosition(pos, slots) {
  if (!pos || !slots?.length) return null;
  return slots.reduce((best, slot) => {
    const distance = Math.hypot(Number(pos.x) - slot.x, Number(pos.y) - slot.y);
    return !best || distance < best.distance ? { ...slot, distance } : best;
  }, null);
}

export function compatibilityScore(player, slot) {
  const token = tokenFromText(player?.position || player?.player_position || player?.detected_position || "");
  if (!slot) return 99;
  if (token && token === slot.slot_key) return 0;
  if (slot.preferred_positions?.some((item) => tokenFromText(item) === token)) return 0;
  const group = POSITION_LABELS[token]?.group || "";
  if (group && group === slot.position_group) {
    if (["LD", "LI", "DFC"].includes(token) && ["LD", "LI", "DFC"].includes(slot.slot_key)) return 1;
    if (["MCD", "MC", "MCO"].includes(token) && ["MCD", "MC", "MCO"].includes(slot.slot_key)) return 1;
    if (["EI", "ED", "DC"].includes(token) && ["EI", "ED", "DC"].includes(slot.slot_key)) return 1;
    return 2;
  }
  return 3;
}

export function shortPosition(player) {
  return tokenFromText(player?.position || player?.player_position || "") || "—";
}