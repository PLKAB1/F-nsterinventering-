import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ClipboardList,
  Download,
  Edit3,
  FileText,
  Plus,
  Printer,
  Save,
  Search,
  Smartphone,
  Trash2,
  WifiOff,
} from "lucide-react";

const STORAGE_KEY = "plkab-fonsterinventering-original-v3";
const typeOptions = Array.from({ length: 30 }, (_, index) => `F${index + 1}`);
const conditionOptions = ["OK", "Mindre bra", "Acceptabelt", "Mycket dåligt"];
const priorityOptions = ["Låg", "Medel", "Hög", "Akut"];
const facadeOptions = ["Norr", "Söder", "Öster", "Väster", "NV", "NO", "SV", "SO", "Invändigt", "Annat"];

const emptyProject = {
  projectNumber: "",
  projectName: "",
  client: "",
  object: "",
  date: new Date().toISOString().slice(0, 10),
  responsible: "",
  attendees: "",
  logoDataUrl: "",
  coverImageDataUrl: "",
  method:
    "Fönstren inventerades översiktligt på plats från insidan samt från utsidan från markplan. Inga prover på fönsterkitt eller fogar gjordes.",
};

const emptyWindow = {
  uid: "",
  id: "",
  building: "",
  floor: "",
  room: "",
  facade: "",
  typeKey: "F1",
  typeText: "",
  width: "",
  height: "",
  condition: "OK",
  action: "",
  priority: "Låg",
  deviations: "",
  notes: "",
  photoRef: "",
  photoDataUrl: "",
  glassBuddy: "",
  solarFilm: false,
  fireRisk: false,
  soundRequirement: false,
  safetyRequirement: false,
};

function makeUid() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function downloadFile(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function rowType(row) {
  const extra = row.typeText?.trim();
  return extra ? `${row.typeKey} – ${extra}` : row.typeKey;
}

function rowLocation(row) {
  return [
    row.building && `Byggnad ${row.building}`,
    row.floor && `plan ${row.floor}`,
    row.room,
    row.facade && `fasad ${row.facade}`,
  ]
    .filter(Boolean)
    .join(", ");
}

function downloadCsv(rows) {
  const headers = [
    "ID",
    "Byggnad",
    "Plan",
    "Rum",
    "Fasad",
    "Fönstertyp",
    "Fri typtext",
    "Bredd mm",
    "Höjd mm",
    "Skick",
    "Prioritet",
    "Avvikelser",
    "Åtgärdsförslag",
    "Glass Buddy",
    "Solfilm",
    "Brandrisk",
    "Ljudkrav",
    "Personsäkerhet",
    "Foto ref",
    "Har foto",
    "Anteckningar",
  ];
  const q = (value) => `"${String(value ?? "").replaceAll('"', '""')}"`;
  const csv = [
    headers.map(q).join(";"),
    ...rows.map((row) =>
      [
        row.id,
        row.building,
        row.floor,
        row.room,
        row.facade,
        row.typeKey,
        row.typeText,
        row.width,
        row.height,
        row.condition,
        row.priority,
        row.deviations,
        row.action,
        row.glassBuddy,
        row.solarFilm ? "Ja" : "Nej",
        row.fireRisk ? "Ja" : "Nej",
        row.soundRequirement ? "Ja" : "Nej",
        row.safetyRequirement ? "Ja" : "Nej",
        row.photoRef,
        row.photoDataUrl ? "Ja" : "Nej",
        row.notes,
      ]
        .map(q)
        .join(";")
    ),
  ].join("\n");
  downloadFile(`fonsterinventering-${new Date().toISOString().slice(0, 10)}.csv`, "\ufeff" + csv, "text/csv;charset=utf-8;");
}

function buildReport(project, rows) {
  const typeKeys = [...new Set(rows.map((w) => w.typeKey))];
  const byType = typeKeys.map((key) => ({ key, rows: rows.filter((w) => w.typeKey === key) }));
  const highPriority = rows.filter((w) => ["Hög", "Akut"].includes(w.priority) || w.condition === "Mycket dåligt");

  return `# Inventeringsrapport Fönster\n\n## Projekt\n\n**Projektnummer:** ${project.projectNumber || "-"}\n\n**Projekt:** ${project.projectName || "-"}\n\n**Beställare:** ${project.client || "-"}\n\n**Objekt:** ${project.object || "-"}\n\n**Datum:** ${project.date || "-"}\n\n**Ansvarig:** ${project.responsible || "-"}\n\n**Närvarande:** ${project.attendees || "-"}\n\n## 1. Bakgrund och syfte\n\nRapporten sammanfattar inventering av fönsterbeståndet och föreslår åtgärder baserat på registrerade fönstertyper, skick och funktionskrav.\n\n## 1.2 Metod\n\n${project.method || "-"}\n\n## 2. Fönstertyper\n\n${byType
    .map((t) => {
      const descriptions = [...new Set(t.rows.map((w) => w.typeText).filter(Boolean))];
      return `### ${t.key}\n\n**Antal registrerade:** ${t.rows.length}\n\n${descriptions.length ? descriptions.map((text) => `- ${text}`).join("\n") : "- Ingen fri typtext angiven"}\n`;
    })
    .join("\n")}\n\n## 3. Inventeringsresultat\n\nTotalt har ${rows.length} fönster/partier registrerats. ${highPriority.length} poster har hög prioritet eller mycket dåligt skick.\n\n${rows
    .map(
      (w) => `### ${w.id || "Utan ID"}\n\n- **Placering:** ${rowLocation(w) || "-"}\n- **Typ:** ${rowType(w)}\n- **Mått:** ${w.width || "?"} × ${w.height || "?"} mm\n- **Skick/prioritet:** ${w.condition} / ${w.priority}\n- **Avvikelser:** ${w.deviations || "-"}\n- **Åtgärdsförslag:** ${w.action || "-"}\n- **Funktionskrav:** ${[
        w.solarFilm && "solfilm/solvärme",
        w.fireRisk && "brand",
        w.soundRequirement && "ljud",
        w.safetyRequirement && "personsäkerhet",
      ]
        .filter(Boolean)
        .join(", ") || "-"}\n- **Foto:** ${w.photoRef || "-"}\n- **Anteckningar:** ${w.notes || "-"}\n`
    )
    .join("\n")}\n\n## 4. Rekommendationer\n\nRekommendationer fylls i utifrån registrerade avvikelser, fönstertyp och funktionskrav.\n`;
}

function buildPrintableReport(project, rows) {
  const typeKeys = [...new Set(rows.map((w) => w.typeKey))];
  const byType = typeKeys.map((key) => ({ key, rows: rows.filter((w) => w.typeKey === key) }));
  const highPriority = rows.filter((w) => ["Hög", "Akut"].includes(w.priority) || w.condition === "Mycket dåligt");
  const safeTitle = project.projectName || "Inventeringsrapport Fönster";

  const inventoryRows = rows
    .map(
      (w) => `
    <tr>
      <td>${escapeHtml(w.id || "")}</td>
      <td>${escapeHtml(rowLocation(w))}</td>
      <td>${escapeHtml(rowType(w))}</td>
      <td>${escapeHtml(`${w.width || "?"} × ${w.height || "?"}`)}</td>
      <td>${escapeHtml(w.condition)}</td>
      <td>${escapeHtml(w.priority)}</td>
      <td>${escapeHtml(w.deviations || "-")}</td>
      <td>${escapeHtml(w.action || "-")}</td>
    </tr>`
    )
    .join("");

  const typeSections = byType
    .map((t) => {
      const descriptions = [...new Set(t.rows.map((w) => w.typeText).filter(Boolean))];
      return `
      <section class="page-section">
        <h3>${escapeHtml(t.key)}</h3>
        <table>
          <tr><th>Antal registrerade</th><td>${t.rows.length}</td></tr>
          <tr><th>Fri beskrivning</th><td>${descriptions.length ? descriptions.map(escapeHtml).join("<br>") : "-"}</td></tr>
        </table>
      </section>`;
    })
    .join("");

  const photoSections = rows
    .filter((w) => w.photoDataUrl)
    .map(
      (w) => `
    <div class="photo-card">
      <img src="${w.photoDataUrl}" alt="Foto ${escapeHtml(w.id)}" />
      <div>
        <h3>${escapeHtml(w.id || "Utan ID")}</h3>
        <p><strong>Placering:</strong> ${escapeHtml(rowLocation(w) || "-")}</p>
        <p><strong>Typ/skick:</strong> ${escapeHtml(rowType(w))} / ${escapeHtml(w.condition)}</p>
        <p><strong>Avvikelse:</strong> ${escapeHtml(w.deviations || "-")}</p>
      </div>
    </div>`
    )
    .join("");

  return `<!doctype html>
<html lang="sv">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(safeTitle)}</title>
  <style>
    @page { size: A4; margin: 14mm; }
    * { box-sizing: border-box; }
    body { font-family: Arial, Helvetica, sans-serif; color: #111; margin: 0; font-size: 11pt; line-height: 1.35; }
    .page { min-height: 267mm; border: 1.5px solid #111; padding: 10mm; position: relative; page-break-after: always; }
    .page:last-child { page-break-after: auto; }
    .report-logo { width: 100%; min-height: 22mm; display: flex; align-items: flex-start; justify-content: flex-start; margin-bottom: 8mm; }
    .report-logo img { max-height: 24mm; max-width: 75mm; object-fit: contain; }
    .logo-text { font-size: 30pt; font-weight: 800; letter-spacing: 1px; }
    .top-grid { display: grid; grid-template-columns: 22% 28% 25% 25%; border: 1px solid #111; margin-bottom: 18mm; }
    .cell { border-left: 1px solid #111; border-bottom: 1px solid #111; padding: 4px 7px; min-height: 12mm; }
    .cell:nth-child(4n+1) { border-left: 0; }
    .label { display: block; font-size: 7pt; font-weight: 700; text-transform: uppercase; color: #333; }
    .value { display: block; font-size: 10pt; margin-top: 2px; }
    .hero { height: 75mm; border: 1px solid #ccc; display: flex; align-items: center; justify-content: center; color: #777; margin: 0 0 24mm; background: #f7f7f7; width: 100%; object-fit: cover; }
    h1 { font-size: 24pt; text-transform: uppercase; margin: 0; line-height: 1.25; }
    h2 { font-size: 18pt; margin: 10mm 0 4mm; text-transform: uppercase; }
    h3 { font-size: 13pt; margin: 6mm 0 2mm; }
    p { margin: 0 0 4mm; }
    table { width: 100%; border-collapse: collapse; margin: 4mm 0 7mm; font-size: 9.5pt; }
    th { background: #111; color: #fff; text-align: left; }
    th, td { border: 1px solid #777; padding: 5px 6px; vertical-align: top; }
    .meta-table th { width: 32%; background: #eee; color: #111; }
    .footer { position: absolute; left: 10mm; right: 10mm; bottom: 6mm; display: grid; grid-template-columns: 1fr 22mm; border: 1px solid #111; font-size: 8pt; }
    .footer div { padding: 4px 6px; border-left: 1px solid #111; }
    .footer div:first-child { border-left: 0; }
    .muted { color: #555; font-style: italic; }
    .small { font-size: 8.5pt; }
    .page-section { page-break-inside: avoid; }
    .photo-card { display: grid; grid-template-columns: 55mm 1fr; gap: 8mm; border: 1px solid #999; padding: 5mm; margin: 4mm 0; page-break-inside: avoid; }
    .photo-card img { width: 55mm; height: 42mm; object-fit: cover; border: 1px solid #bbb; }
    .print-actions { position: fixed; right: 16px; top: 16px; z-index: 9999; display: flex; gap: 8px; }
    .print-actions button { border: 0; border-radius: 12px; padding: 10px 14px; font-weight: 700; cursor: pointer; background: #111; color: white; }
    @media print { .print-actions { display: none; } .page { border: 1.5px solid #111; } }
  </style>
</head>
<body>
  <div class="print-actions"><button onclick="window.print()">Skriv ut / Spara som PDF</button></div>

  <section class="page">
    <div class="report-logo">${project.logoDataUrl ? `<img src="${project.logoDataUrl}" alt="PLKAB logotyp" />` : `<div class="logo-text">PLKAB</div>`}</div>
    <div class="top-grid">
      <div class="cell"><span class="label">Projektnummer</span><span class="value">${escapeHtml(project.projectNumber || "-")}</span></div>
      <div class="cell"><span class="label">Dokumenttyp och projekt</span><span class="value">${escapeHtml(safeTitle)}</span></div>
      <div class="cell"><span class="label">Datum</span><span class="value">${escapeHtml(project.date || "-")}</span></div>
      <div class="cell"><span class="label">Ansvarig</span><span class="value">${escapeHtml(project.responsible || "-")}</span></div>
      <div class="cell"><span class="label">Objekt</span><span class="value">${escapeHtml(project.object || "-")}</span></div>
      <div class="cell"><span class="label">Beställare</span><span class="value">${escapeHtml(project.client || "-")}</span></div>
      <div class="cell"><span class="label">Antal poster</span><span class="value">${rows.length}</span></div>
      <div class="cell"><span class="label">Hög prio / dåligt skick</span><span class="value">${highPriority.length}</span></div>
    </div>
    ${project.coverImageDataUrl ? `<img class="hero" src="${project.coverImageDataUrl}" alt="Omslagsbild" />` : `<div class="hero">Omslagsbild / objektfoto</div>`}
    <h1>${escapeHtml(safeTitle)}</h1>
    <div class="footer"><div>PLKAB – BYGG, GLAS OCH FASADKONSULT</div><div>Sida 1</div></div>
  </section>

  <section class="page">
    <h2>1. Bakgrund och syfte</h2>
    <p>Rapporten sammanfattar inventering av fönsterbeståndet och föreslår åtgärder baserat på registrerade fönstertyper, skick och funktionskrav.</p>
    <h2>1.2 Objekt</h2>
    <table class="meta-table">
      <tr><th>Objekt</th><td>${escapeHtml(project.object || "-")}</td></tr>
      <tr><th>Beställare</th><td>${escapeHtml(project.client || "-")}</td></tr>
      <tr><th>Projektnummer</th><td>${escapeHtml(project.projectNumber || "-")}</td></tr>
    </table>
    <h2>1.3 Metod</h2>
    <p>${escapeHtml(project.method || "-")}</p>
    <table class="meta-table">
      <tr><th>Tid för inventering</th><td>${escapeHtml(project.date || "-")}</td></tr>
      <tr><th>Närvarande</th><td>${escapeHtml(project.attendees || "-")}</td></tr>
    </table>
    <div class="footer"><div>${escapeHtml(safeTitle)}</div><div>Sida 2</div></div>
  </section>

  <section class="page">
    <h2>2. Fönstertyper</h2>
    <p>Fönstertyper anges som littera F1–F30. Beskrivning kan fyllas i med fri text vid inventeringen.</p>
    ${typeSections || "<p>Inga fönstertyper registrerade.</p>"}
    <div class="footer"><div>${escapeHtml(safeTitle)}</div><div>Sida 3</div></div>
  </section>

  <section class="page">
    <h2>3. Inventeringsresultat</h2>
    <p>Totalt har <strong>${rows.length}</strong> fönster/partier registrerats. <strong>${highPriority.length}</strong> poster har hög prioritet eller mycket dåligt skick.</p>
    <table>
      <thead><tr><th>ID</th><th>Placering</th><th>Typ</th><th>Mått mm</th><th>Skick</th><th>Prio</th><th>Avvikelse</th><th>Åtgärd</th></tr></thead>
      <tbody>${inventoryRows || "<tr><td colspan='8'>Inga poster registrerade.</td></tr>"}</tbody>
    </table>
    <div class="footer"><div>${escapeHtml(safeTitle)}</div><div>Sida 4</div></div>
  </section>

  ${photoSections ? `<section class="page"><h2>4. Fotobilaga</h2>${photoSections}<div class="footer"><div>${escapeHtml(safeTitle)}</div><div>Sida 5</div></div></section>` : ""}

  <section class="page">
    <h2>${photoSections ? "5" : "4"}. Rekommendationer</h2>
    <p>Rekommendationer fylls i utifrån registrerade avvikelser, fönstertyp och funktionskrav.</p>
    <h2>${photoSections ? "5.1" : "4.1"} Funktionskrav</h2>
    <p>Vid större renovering bör brand, solvärmereduktion, personsäkerhet och ljudreduktion bedömas utifrån placering, väderstreck och byggnadens övriga krav.</p>
    <p class="muted small">Detta är ett automatiskt rapportutkast och bör granskas innan det skickas till beställare.</p>
    <div class="footer"><div>${escapeHtml(safeTitle)}</div><div>Sida ${photoSections ? "6" : "5"}</div></div>
  </section>
</body>
</html>`;
}

function openPdfReport(project, rows) {
  const html = buildPrintableReport(project, rows);
  const popup = window.open("", "_blank");
  if (popup) {
    popup.document.open();
    popup.document.write(html);
    popup.document.close();
    popup.focus();
    return;
  }
  downloadFile("inventeringsrapport.html", html, "text/html;charset=utf-8");
}

function Card({ children, className = "" }) {
  return <div className={`rounded-3xl bg-white shadow-sm ${className}`}>{children}</div>;
}

function Button({ children, className = "", variant = "default", ...props }) {
  const variantClass = variant === "outline" ? "border border-slate-200 bg-white text-slate-800" : "bg-slate-900 text-white";
  return (
    <button
      {...props}
      className={`inline-flex items-center justify-center rounded-2xl px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 ${variantClass} ${className}`}
    >
      {children}
    </button>
  );
}

function Field({ label, children }) {
  return (
    <label className="space-y-1 text-sm font-medium text-slate-700">
      <span>{label}</span>
      {children}
    </label>
  );
}

function TextInput(props) {
  return (
    <input
      {...props}
      className={`w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-100 ${props.className || ""}`}
    />
  );
}

function SelectInput({ children, ...props }) {
  return (
    <select
      {...props}
      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-slate-500 focus:ring-2 focus:ring-slate-100"
    >
      {children}
    </select>
  );
}

function Check({ checked, onChange, label }) {
  return (
    <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      {label}
    </label>
  );
}

function ImageInput({ label, value, onChange }) {
  function handleFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => onChange(String(reader.result || ""));
    reader.readAsDataURL(file);
  }

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-slate-700">{label}</label>
      <input type="file" accept="image/*" onChange={handleFile} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" />
      {value && (
        <div className="space-y-2">
          <img src={value} alt={label} className="max-h-40 w-full rounded-xl border border-slate-200 object-cover" />
          <Button type="button" variant="outline" onClick={() => onChange("")}>Ta bort bild</Button>
        </div>
      )}
    </div>
  );
}

export default function WindowInventoryApp() {
  const [project, setProject] = useState(emptyProject);
  const [windows, setWindows] = useState([]);
  const [form, setForm] = useState(emptyWindow);
  const [query, setQuery] = useState("");
  const [editingUid, setEditingUid] = useState(null);
  const [tab, setTab] = useState("field");
  const [isReady, setIsReady] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState(null);
  const [isOnline, setIsOnline] = useState(typeof navigator === "undefined" ? true : navigator.onLine);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.project) setProject({ ...emptyProject, ...parsed.project });
        if (Array.isArray(parsed.windows)) setWindows(parsed.windows.map((w) => ({ ...emptyWindow, ...w, uid: w.uid || makeUid() })));
      }
    } catch (error) {
      console.warn("Kunde inte läsa sparad inventering", error);
    } finally {
      setIsReady(true);
    }
  }, []);

  useEffect(() => {
    if (!isReady) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ project, windows, savedAt: new Date().toISOString() }));
      setLastSavedAt(new Date());
    } catch (error) {
      console.warn("Kunde inte autospara inventering", error);
    }
  }, [project, windows, isReady]);

  useEffect(() => {
    function updateStatus() {
      setIsOnline(navigator.onLine);
    }
    window.addEventListener("online", updateStatus);
    window.addEventListener("offline", updateStatus);
    return () => {
      window.removeEventListener("online", updateStatus);
      window.removeEventListener("offline", updateStatus);
    };
  }, []);

  useEffect(() => {
    const manifest = {
      name: "PLKAB Fönsterinventering",
      short_name: "Fönster",
      start_url: ".",
      display: "standalone",
      background_color: "#f8fafc",
      theme_color: "#0f172a",
      description: "Fältapp för fönsterinventering och rapportutkast.",
      icons: [],
    };
    const blob = new Blob([JSON.stringify(manifest)], { type: "application/manifest+json" });
    const manifestUrl = URL.createObjectURL(blob);
    let link = document.querySelector("link[rel='manifest']");
    if (!link) {
      link = document.createElement("link");
      link.rel = "manifest";
      document.head.appendChild(link);
    }
    link.href = manifestUrl;
    document.title = "PLKAB Fönsterinventering";
    return () => URL.revokeObjectURL(manifestUrl);
  }, []);

  const filteredWindows = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return windows;
    return windows.filter((item) =>
      [item.id, item.building, item.floor, item.room, item.facade, item.typeKey, item.typeText, item.condition, item.priority]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [query, windows]);

  const stats = useMemo(
    () => ({
      total: windows.length,
      high: windows.filter((w) => ["Hög", "Akut"].includes(w.priority) || w.condition === "Mycket dåligt").length,
      types: new Set(windows.map((w) => w.typeKey)).size,
    }),
    [windows]
  );

  function updateProject(field, value) {
    setProject((current) => ({ ...current, [field]: value }));
  }

  function updateForm(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function submitWindow(event) {
    event.preventDefault();
    const normalized = { ...form, uid: form.uid || editingUid || makeUid() };
    if (editingUid) {
      setWindows((current) => current.map((item) => (item.uid === editingUid ? normalized : item)));
      setEditingUid(null);
    } else {
      setWindows((current) => [normalized, ...current]);
    }
    setForm(emptyWindow);
  }

  function editWindow(item) {
    setForm({ ...emptyWindow, ...item });
    setEditingUid(item.uid);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function deleteWindow(uid) {
    setWindows((current) => current.filter((item) => item.uid !== uid));
  }

  function clearLocalData() {
    if (!window.confirm("Vill du rensa projektet och alla inventeringsposter från denna enhet?")) return;
    localStorage.removeItem(STORAGE_KEY);
    setProject(emptyProject);
    setWindows([]);
    setForm(emptyWindow);
    setEditingUid(null);
  }

  const reportMarkdown = buildReport(project, windows);

  return (
    <div className="min-h-screen bg-slate-50 p-4 text-slate-900 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <motion.header initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className="rounded-3xl bg-white p-6 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center gap-3 text-sm font-semibold text-slate-500">
            {project.logoDataUrl ? <img src={project.logoDataUrl} alt="PLKAB logga" className="h-12 max-w-44 object-contain" /> : <span className="text-xl font-black text-slate-900">PLKAB</span>}
            <span className="flex items-center gap-2"><ClipboardList className="h-4 w-4" /> Fönsterinventering</span>
            <span className={`flex items-center gap-1 rounded-full px-3 py-1 ${isOnline ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
              <WifiOff className="h-4 w-4" /> {isOnline ? "Online" : "Offline"}
            </span>
            <span className="flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-slate-600">
              <Save className="h-4 w-4" /> Autosparad {lastSavedAt ? lastSavedAt.toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit" }) : "-"}
            </span>
          </div>
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight md:text-4xl">Fältapp + rapportgenerator</h1>
              <p className="mt-2 max-w-2xl text-slate-600">Samla inventeringsdata ute på plats och exportera till CSV eller PDF-rapport.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant={tab === "field" ? "default" : "outline"} onClick={() => setTab("field")}>Fältläge</Button>
              <Button variant={tab === "report" ? "default" : "outline"} onClick={() => setTab("report")}><FileText className="mr-2 h-4 w-4" /> Rapport</Button>
              <Button variant={tab === "install" ? "default" : "outline"} onClick={() => setTab("install")}><Smartphone className="mr-2 h-4 w-4" /> iPad/PWA</Button>
              <Button onClick={() => downloadCsv(windows)} disabled={!windows.length}><Download className="mr-2 h-4 w-4" /> CSV</Button>
              <Button onClick={() => openPdfReport(project, windows)} disabled={!windows.length}><Printer className="mr-2 h-4 w-4" /> PDF</Button>
              <Button variant="outline" onClick={clearLocalData}>Rensa lokalt</Button>
            </div>
          </div>
        </motion.header>

        <section className="grid gap-4 md:grid-cols-3">
          <Card className="p-5"><p className="text-sm text-slate-500">Registrerade poster</p><p className="mt-1 text-3xl font-bold">{stats.total}</p></Card>
          <Card className="p-5"><p className="text-sm text-slate-500">Hög prio / dåligt skick</p><p className="mt-1 text-3xl font-bold">{stats.high}</p></Card>
          <Card className="p-5"><p className="text-sm text-slate-500">Fönstertyper</p><p className="mt-1 text-3xl font-bold">{stats.types}</p></Card>
        </section>

        {tab === "install" ? (
          <Card className="space-y-5 p-6">
            <h2 className="text-2xl font-bold">PWA på iPad</h2>
            <p className="text-slate-600">När appen ligger online: öppna webblänken i Safari, tryck Dela och välj “Lägg till på hemskärmen”. Data sparas lokalt på enheten.</p>
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><b>Viktigt:</b> Exportera alltid CSV/PDF efter platsbesök. Lokal data kan försvinna om webbläsardata rensas.</div>
          </Card>
        ) : tab === "field" ? (
          <main className="grid gap-6 lg:grid-cols-[430px_1fr]">
            <div className="space-y-6">
              <Card className="space-y-4 p-5">
                <h2 className="text-xl font-bold">Projekt</h2>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Projektnummer"><TextInput value={project.projectNumber} onChange={(e) => updateProject("projectNumber", e.target.value)} /></Field>
                  <Field label="Datum"><TextInput type="date" value={project.date} onChange={(e) => updateProject("date", e.target.value)} /></Field>
                  <Field label="Projekt"><TextInput value={project.projectName} onChange={(e) => updateProject("projectName", e.target.value)} /></Field>
                  <Field label="Beställare"><TextInput value={project.client} onChange={(e) => updateProject("client", e.target.value)} /></Field>
                  <Field label="Objekt"><TextInput value={project.object} onChange={(e) => updateProject("object", e.target.value)} /></Field>
                  <Field label="Ansvarig"><TextInput value={project.responsible} onChange={(e) => updateProject("responsible", e.target.value)} /></Field>
                </div>
                <Field label="Närvarande"><TextInput value={project.attendees} onChange={(e) => updateProject("attendees", e.target.value)} /></Field>
                <Field label="Metod"><textarea value={project.method} onChange={(e) => updateProject("method", e.target.value)} className="min-h-24 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" /></Field>
                <ImageInput label="PLKAB-logga" value={project.logoDataUrl} onChange={(value) => updateProject("logoDataUrl", value)} />
                <ImageInput label="Omslagsbild / objektfoto" value={project.coverImageDataUrl} onChange={(value) => updateProject("coverImageDataUrl", value)} />
              </Card>

              <Card className="p-5">
                <h2 className="mb-4 text-xl font-bold">{editingUid ? "Redigera post" : "Ny inventeringspost"}</h2>
                <form onSubmit={submitWindow} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="ID"><TextInput value={form.id} onChange={(e) => updateForm("id", e.target.value)} placeholder="Fylls i manuellt" /></Field>
                    <Field label="Fönstertyp"><SelectInput value={form.typeKey} onChange={(e) => updateForm("typeKey", e.target.value)}>{typeOptions.map((key) => <option key={key}>{key}</option>)}</SelectInput></Field>
                    <Field label="Byggnad"><TextInput value={form.building} onChange={(e) => updateForm("building", e.target.value)} /></Field>
                    <Field label="Plan"><TextInput value={form.floor} onChange={(e) => updateForm("floor", e.target.value)} /></Field>
                    <Field label="Rum"><TextInput value={form.room} onChange={(e) => updateForm("room", e.target.value)} /></Field>
                    <Field label="Fasad"><SelectInput value={form.facade} onChange={(e) => updateForm("facade", e.target.value)}><option value="">Välj</option>{facadeOptions.map((o) => <option key={o}>{o}</option>)}</SelectInput></Field>
                    <Field label="Bredd mm"><TextInput type="number" value={form.width} onChange={(e) => updateForm("width", e.target.value)} /></Field>
                    <Field label="Höjd mm"><TextInput type="number" value={form.height} onChange={(e) => updateForm("height", e.target.value)} /></Field>
                    <Field label="Skick"><SelectInput value={form.condition} onChange={(e) => updateForm("condition", e.target.value)}>{conditionOptions.map((o) => <option key={o}>{o}</option>)}</SelectInput></Field>
                    <Field label="Prioritet"><SelectInput value={form.priority} onChange={(e) => updateForm("priority", e.target.value)}>{priorityOptions.map((o) => <option key={o}>{o}</option>)}</SelectInput></Field>
                  </div>

                  <div className="rounded-2xl bg-slate-100 p-4 text-sm text-slate-700">
                    <p className="font-bold">Fönstertyp: {form.typeKey}</p>
                    <p className="mt-1">Skriv egen fri beskrivning av fönsterlitterat nedan.</p>
                  </div>

                  <Field label="Fri text om fönstertyp/littera"><textarea value={form.typeText} onChange={(e) => updateForm("typeText", e.target.value)} placeholder="Ex: sidohängda trä/alufönster, kopplade bågar, spaltventil..." className="min-h-24 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" /></Field>
                  <Field label="Avvikelser"><textarea value={form.deviations} onChange={(e) => updateForm("deviations", e.target.value)} className="min-h-20 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" /></Field>
                  <Field label="Åtgärdsförslag"><textarea value={form.action} onChange={(e) => updateForm("action", e.target.value)} className="min-h-24 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" /></Field>
                  <Field label="Glass Buddy / glasdata"><TextInput value={form.glassBuddy} onChange={(e) => updateForm("glassBuddy", e.target.value)} /></Field>
                  <div className="grid grid-cols-2 gap-2">
                    <Check label="Solfilm/solvärme" checked={form.solarFilm} onChange={(v) => updateForm("solarFilm", v)} />
                    <Check label="Brandrisk" checked={form.fireRisk} onChange={(v) => updateForm("fireRisk", v)} />
                    <Check label="Ljudkrav" checked={form.soundRequirement} onChange={(v) => updateForm("soundRequirement", v)} />
                    <Check label="Personsäkerhet" checked={form.safetyRequirement} onChange={(v) => updateForm("safetyRequirement", v)} />
                  </div>
                  <Field label="Fotoreferens"><TextInput value={form.photoRef} onChange={(e) => updateForm("photoRef", e.target.value)} /></Field>
                  <ImageInput label="Foto till rapporten" value={form.photoDataUrl} onChange={(value) => updateForm("photoDataUrl", value)} />
                  <Field label="Anteckningar"><textarea value={form.notes} onChange={(e) => updateForm("notes", e.target.value)} className="min-h-20 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm" /></Field>
                  <Button type="submit" className="w-full py-3"><Plus className="mr-2 h-4 w-4" />{editingUid ? "Spara ändringar" : "Lägg till"}</Button>
                </form>
              </Card>
            </div>

            <Card className="p-5">
              <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <h2 className="text-xl font-bold">Inventerade fönster</h2>
                <div className="relative w-full md:w-80"><Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" /><TextInput value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Sök..." className="pl-9" /></div>
              </div>
              <div className="space-y-3">
                {filteredWindows.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-slate-500">Inga poster ännu.</div> : filteredWindows.map((item) => (
                  <motion.div key={item.uid} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2"><h3 className="text-lg font-bold">{item.id || "Utan ID"}</h3><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold">{item.typeKey}</span><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold">{item.condition}</span><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold">{item.priority}</span></div>
                        <p className="mt-1 text-sm text-slate-600">{rowLocation(item) || "Ingen placering"}</p>
                        {item.typeText && <p className="mt-2 text-sm text-slate-700"><b>Typtext:</b> {item.typeText}</p>}
                        <p className="mt-2 text-sm text-slate-700">{item.width || "?"} × {item.height || "?"} mm</p>
                        {item.deviations && <p className="mt-2 text-sm text-slate-700"><b>Avvikelse:</b> {item.deviations}</p>}
                        {item.action && <p className="mt-2 text-sm text-slate-700"><b>Åtgärd:</b> {item.action}</p>}
                        {item.photoDataUrl && <img src={item.photoDataUrl} alt={`Foto ${item.id}`} className="mt-3 max-h-44 rounded-xl border border-slate-200 object-cover" />}
                      </div>
                      <div className="flex gap-2"><Button variant="outline" onClick={() => editWindow(item)}><Edit3 className="h-4 w-4" /></Button><Button variant="outline" onClick={() => deleteWindow(item.uid)}><Trash2 className="h-4 w-4" /></Button></div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </Card>
          </main>
        ) : (
          <Card className="p-5">
            <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between"><h2 className="text-xl font-bold">Rapportutkast</h2><div className="flex flex-wrap gap-2"><Button onClick={() => downloadFile("inventeringsrapport.md", reportMarkdown, "text/markdown;charset=utf-8")} disabled={!windows.length}><Download className="mr-2 h-4 w-4" /> Markdown</Button><Button onClick={() => openPdfReport(project, windows)} disabled={!windows.length}><Printer className="mr-2 h-4 w-4" /> Skriv ut / PDF</Button></div></div>
            <pre className="max-h-[70vh] overflow-auto whitespace-pre-wrap rounded-2xl bg-slate-950 p-5 text-sm text-slate-50">{reportMarkdown}</pre>
          </Card>
        )}
      </div>
    </div>
  );
}
