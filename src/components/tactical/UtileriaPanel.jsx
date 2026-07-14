import React, { useRef, useState, useEffect, useCallback } from "react";
import { Trash2, Download, Minus, Square, Circle, Type, Pencil } from "lucide-react";
import jsPDF from "jspdf";

const TOOLS = [
  { id: "pencil", label: "Lápiz", icon: Pencil },
  { id: "line", label: "Línea", icon: Minus },
  { id: "rect", label: "Rectángulo", icon: Square },
  { id: "circle", label: "Círculo", icon: Circle },
  { id: "text", label: "Texto", icon: Type },
];

const COLORS = ["#FFFFFF", "#FACC15", "#F97316", "#EF4444", "#22C55E", "#3B82F6", "#A855F7", "#000000"];

// Draw the pitch background on a canvas context
function drawPitch(ctx, w, h) {
  // Green field
  ctx.fillStyle = "#16a34a";
  ctx.fillRect(0, 0, w, h);
  // Stripes
  const stripeW = w / 9;
  for (let i = 0; i < 9; i++) {
    if (i % 2 === 0) {
      ctx.fillStyle = "rgba(34,197,94,0.15)";
      ctx.fillRect(i * stripeW, 0, stripeW, h);
    }
  }
  // Lines
  ctx.strokeStyle = "rgba(255,255,255,0.85)";
  ctx.lineWidth = 2;
  const pad = 20;
  // Outer border
  ctx.strokeRect(pad, pad, w - pad * 2, h - pad * 2);
  // Center line
  ctx.beginPath(); ctx.moveTo(pad, h / 2); ctx.lineTo(w - pad, h / 2); ctx.stroke();
  // Center circle
  ctx.beginPath(); ctx.arc(w / 2, h / 2, h * 0.14, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = "white"; ctx.beginPath(); ctx.arc(w / 2, h / 2, 3, 0, Math.PI * 2); ctx.fill();
  // Penalty areas
  const paW = w * 0.46, paH = h * 0.22, paX = (w - paW) / 2;
  ctx.strokeRect(paX, pad, paW, paH);
  ctx.strokeRect(paX, h - pad - paH, paW, paH);
  // Goal areas
  const gaW = w * 0.28, gaH = h * 0.09, gaX = (w - gaW) / 2;
  ctx.strokeRect(gaX, pad, gaW, gaH);
  ctx.strokeRect(gaX, h - pad - gaH, gaW, gaH);
}

export default function UtileriaPanel() {
  const canvasRef = useRef(null);
  const overlayRef = useRef(null);
  const [tool, setTool] = useState("pencil");
  const [color, setColor] = useState("#FACC15");
  const [lineWidth, setLineWidth] = useState(3);
  const [drawing, setDrawing] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [shapes, setShapes] = useState([]); // all committed shapes
  const [pencilPoints, setPencilPoints] = useState([]);
  const [materials, setMaterials] = useState([
    { id: 1, text: "10 conos amarillos" },
    { id: 2, text: "4 estacas" },
  ]);
  const [newMaterial, setNewMaterial] = useState("");
  const [textInput, setTextInput] = useState(null); // { x, y }
  const [textValue, setTextValue] = useState("");

  // Redraw everything
  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    drawPitch(ctx, canvas.width, canvas.height);
    shapes.forEach(s => drawShape(ctx, s));
  }, [shapes]);

  useEffect(() => { redraw(); }, [redraw]);

  function drawShape(ctx, s) {
    ctx.save();
    ctx.strokeStyle = s.color;
    ctx.fillStyle = s.color;
    ctx.lineWidth = s.lineWidth;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    if (s.type === "pencil") {
      if (!s.points || s.points.length < 2) { ctx.restore(); return; }
      ctx.beginPath();
      ctx.moveTo(s.points[0].x, s.points[0].y);
      s.points.forEach(p => ctx.lineTo(p.x, p.y));
      ctx.stroke();
    } else if (s.type === "line") {
      ctx.beginPath(); ctx.moveTo(s.x1, s.y1); ctx.lineTo(s.x2, s.y2); ctx.stroke();
    } else if (s.type === "rect") {
      ctx.strokeRect(s.x, s.y, s.w, s.h);
    } else if (s.type === "circle") {
      ctx.beginPath(); ctx.arc(s.cx, s.cy, s.r, 0, Math.PI * 2); ctx.stroke();
    } else if (s.type === "text") {
      ctx.font = `bold ${s.fontSize}px sans-serif`;
      ctx.fillText(s.text, s.x, s.y);
    }
    ctx.restore();
  }

  function getPos(e) {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY };
  }

  function onMouseDown(e) {
    if (tool === "text") {
      const pos = getPos(e);
      setTextInput(pos);
      setTextValue("");
      return;
    }
    setDrawing(true);
    const pos = getPos(e);
    setStartPos(pos);
    if (tool === "pencil") setPencilPoints([pos]);
  }

  function onMouseMove(e) {
    if (!drawing) return;
    const pos = getPos(e);
    if (tool === "pencil") {
      setPencilPoints(prev => [...prev, pos]);
      // Live draw pencil on overlay
      const overlay = overlayRef.current;
      const ctx = overlay.getContext("2d");
      ctx.clearRect(0, 0, overlay.width, overlay.height);
      ctx.strokeStyle = color; ctx.lineWidth = lineWidth; ctx.lineCap = "round"; ctx.lineJoin = "round";
      const pts = [...pencilPoints, pos];
      if (pts.length > 1) {
        ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y);
        pts.forEach(p => ctx.lineTo(p.x, p.y)); ctx.stroke();
      }
    } else {
      // Preview shape on overlay
      const overlay = overlayRef.current;
      const ctx = overlay.getContext("2d");
      ctx.clearRect(0, 0, overlay.width, overlay.height);
      ctx.strokeStyle = color; ctx.lineWidth = lineWidth; ctx.lineCap = "round";
      if (tool === "line") {
        ctx.beginPath(); ctx.moveTo(startPos.x, startPos.y); ctx.lineTo(pos.x, pos.y); ctx.stroke();
      } else if (tool === "rect") {
        ctx.strokeRect(startPos.x, startPos.y, pos.x - startPos.x, pos.y - startPos.y);
      } else if (tool === "circle") {
        const r = Math.sqrt(Math.pow(pos.x - startPos.x, 2) + Math.pow(pos.y - startPos.y, 2));
        ctx.beginPath(); ctx.arc(startPos.x, startPos.y, r, 0, Math.PI * 2); ctx.stroke();
      }
    }
  }

  function onMouseUp(e) {
    if (!drawing) return;
    setDrawing(false);
    const pos = getPos(e);
    const overlay = overlayRef.current;
    overlay.getContext("2d").clearRect(0, 0, overlay.width, overlay.height);
    let shape = null;
    if (tool === "pencil") {
      shape = { type: "pencil", points: [...pencilPoints, pos], color, lineWidth };
      setPencilPoints([]);
    } else if (tool === "line") {
      shape = { type: "line", x1: startPos.x, y1: startPos.y, x2: pos.x, y2: pos.y, color, lineWidth };
    } else if (tool === "rect") {
      shape = { type: "rect", x: startPos.x, y: startPos.y, w: pos.x - startPos.x, h: pos.y - startPos.y, color, lineWidth };
    } else if (tool === "circle") {
      const r = Math.sqrt(Math.pow(pos.x - startPos.x, 2) + Math.pow(pos.y - startPos.y, 2));
      shape = { type: "circle", cx: startPos.x, cy: startPos.y, r, color, lineWidth };
    }
    if (shape) setShapes(prev => [...prev, shape]);
  }

  function commitText() {
    if (!textInput || !textValue.trim()) { setTextInput(null); return; }
    setShapes(prev => [...prev, { type: "text", x: textInput.x, y: textInput.y, text: textValue, color, fontSize: 18, lineWidth }]);
    setTextInput(null);
    setTextValue("");
  }

  function exportPDF() {
    const canvas = canvasRef.current;
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const pw = 297, ph = 210;
    // Title
    pdf.setFontSize(16);
    pdf.setTextColor(30, 30, 30);
    pdf.text("Plan de Cancha — Utilería", 14, 14);
    // Canvas image
    const imgH = ph * 0.62;
    const imgY = 20;
    pdf.addImage(imgData, "PNG", 14, imgY, pw - 28, imgH);
    // Materials list
    if (materials.length > 0) {
      const listY = imgY + imgH + 8;
      pdf.setFontSize(11);
      pdf.setTextColor(80, 80, 80);
      pdf.text("Materiales necesarios:", 14, listY);
      pdf.setFontSize(10);
      materials.forEach((m, i) => {
        pdf.text(`• ${m.text}`, 18, listY + 6 + i * 6);
      });
    }
    pdf.save("plan-cancha-utileria.pdf");
  }

  function undoLast() {
    setShapes(prev => prev.slice(0, -1));
  }

  function addMaterial() {
    if (!newMaterial.trim()) return;
    setMaterials(prev => [...prev, { id: Date.now(), text: newMaterial.trim() }]);
    setNewMaterial("");
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex flex-wrap items-center gap-3">
        {/* Tools */}
        <div className="flex items-center gap-1 bg-zinc-800 rounded-lg p-1">
          {TOOLS.map(t => (
            <button
              key={t.id}
              onClick={() => setTool(t.id)}
              title={t.label}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                tool === t.id ? "bg-yellow-400 text-zinc-900" : "text-zinc-400 hover:text-white"
              }`}
            >
              <t.icon size={13} /> {t.label}
            </button>
          ))}
        </div>

        {/* Colors */}
        <div className="flex items-center gap-1.5">
          {COLORS.map(c => (
            <button
              key={c}
              onClick={() => setColor(c)}
              style={{ background: c, outline: color === c ? "2px solid #FACC15" : "none", outlineOffset: "2px" }}
              className="w-5 h-5 rounded-full border border-zinc-600 transition-transform hover:scale-110"
            />
          ))}
        </div>

        {/* Line width */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-500">Grosor</span>
          <input type="range" min={1} max={12} value={lineWidth}
            onChange={e => setLineWidth(Number(e.target.value))}
            className="w-20 accent-yellow-400" />
          <span className="text-xs text-zinc-400 w-4">{lineWidth}</span>
        </div>

        <div className="flex items-center gap-2 ml-auto">
          <button onClick={undoLast}
            className="px-3 py-1.5 text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg transition-colors">
            Deshacer
          </button>
          <button onClick={() => setShapes([])}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg transition-colors">
            <Trash2 size={12} /> Limpiar
          </button>
          <button onClick={exportPDF}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-yellow-400 hover:bg-yellow-300 text-zinc-900 font-semibold rounded-lg transition-colors">
            <Download size={12} /> Exportar PDF
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-4 gap-4">
        {/* Canvas */}
        <div className="lg:col-span-3 bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          <div className="relative w-full" style={{ paddingBottom: "56%" }}>
            <canvas
              ref={canvasRef}
              width={1200}
              height={672}
              className="absolute inset-0 w-full h-full"
            />
            <canvas
              ref={overlayRef}
              width={1200}
              height={672}
              className="absolute inset-0 w-full h-full"
              style={{ cursor: tool === "text" ? "text" : "crosshair" }}
              onMouseDown={onMouseDown}
              onMouseMove={onMouseMove}
              onMouseUp={onMouseUp}
              onMouseLeave={onMouseUp}
              onTouchStart={onMouseDown}
              onTouchMove={onMouseMove}
              onTouchEnd={onMouseUp}
            />
            {/* Text input overlay */}
            {textInput && (
              <input
                autoFocus
                value={textValue}
                onChange={e => setTextValue(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") commitText(); if (e.key === "Escape") setTextInput(null); }}
                onBlur={commitText}
                style={{
                  position: "absolute",
                  left: `${(textInput.x / 1200) * 100}%`,
                  top: `${(textInput.y / 672) * 100}%`,
                  transform: "translateY(-100%)",
                  background: "rgba(0,0,0,0.7)",
                  border: "1px solid #facc15",
                  color: color,
                  fontSize: "14px",
                  fontWeight: "bold",
                  padding: "2px 6px",
                  borderRadius: "4px",
                  outline: "none",
                  minWidth: "80px",
                }}
              />
            )}
          </div>
        </div>

        {/* Materials list */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex flex-col gap-3">
          <div>
            <h3 className="text-sm font-semibold text-white mb-1">Lista de materiales</h3>
            <p className="text-xs text-zinc-500">Se incluye en el PDF exportado</p>
          </div>
          <div className="flex gap-2">
            <input
              value={newMaterial}
              onChange={e => setNewMaterial(e.target.value)}
              onKeyDown={e => e.key === "Enter" && addMaterial()}
              placeholder="Ej: 10 conos..."
              className="flex-1 h-8 text-xs bg-zinc-800 border border-zinc-700 text-white rounded-md px-2 focus:outline-none focus:border-yellow-400"
            />
            <button onClick={addMaterial}
              className="px-3 h-8 text-xs bg-yellow-400 hover:bg-yellow-300 text-zinc-900 font-semibold rounded-md">
              +
            </button>
          </div>
          <div className="space-y-1.5 flex-1 overflow-y-auto max-h-80">
            {materials.length === 0 && (
              <p className="text-zinc-600 text-xs text-center py-4">Sin materiales cargados</p>
            )}
            {materials.map((m, i) => (
              <div key={m.id} className="flex items-center gap-2 group">
                <span className="w-4 h-4 rounded-full bg-yellow-400/20 text-yellow-400 flex items-center justify-center text-[10px] font-bold shrink-0">{i + 1}</span>
                <span className="text-sm text-zinc-300 flex-1">{m.text}</span>
                <button
                  onClick={() => setMaterials(prev => prev.filter(x => x.id !== m.id))}
                  className="text-zinc-700 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100">
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}