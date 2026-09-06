import "./style.css";
import { createStrokeProbe, type DiagnosticFinding, type InputSample } from "pen-latency-lab";

type Point = { x: number; y: number; time: number };
type VisualStroke = { id: number; raw: Point[]; smooth: Point[] };

const demoMode = location.pathname.replace(/\/$/, "") === "/demo" || new URLSearchParams(location.search).get("demo") === "1";

const required = <T extends Element>(selector: string): T => {
  const value = document.querySelector<T>(selector);
  if (!value) throw new Error(`Missing element: ${selector}`);
  return value;
};

const canvas = required<HTMLCanvasElement>("#draw-pad");
const context = canvas.getContext("2d", { alpha: false }) as CanvasRenderingContext2D;
if (!context) throw new Error("Stroke Lab needs Canvas 2D support.");

const smoothingInput = required<HTMLInputElement>("#smoothing");
const smoothingOutput = required<HTMLOutputElement>("#smoothing-value");
const geometryInput = required<HTMLInputElement>("#include-geometry");
const penInput = required<HTMLInputElement>("#include-pen");
const emptyState = required<HTMLElement>("#pad-empty");
const undoButton = required<HTMLButtonElement>("#undo");
const clearButton = required<HTMLButtonElement>("#clear");
const exportButton = required<HTMLButtonElement>("#export");
const copyButton = required<HTMLButtonElement>("#copy");
const titleInput = required<HTMLInputElement>("#issue-title");
const notesInput = required<HTMLTextAreaElement>("#issue-notes");
const status = required<HTMLElement>("#action-status");
const findingsNode = required<HTMLElement>("#findings");
const verdictLabel = required<HTMLElement>("#verdict-label");
const verdictCode = required<HTMLElement>("#verdict-code");
const verdictSummary = required<HTMLElement>("#verdict-summary");
const precisionNote = required<HTMLElement>("#precision-note");
const networkState = required<HTMLElement>("#network-state");
const demoBanner = required<HTMLElement>("#demo-banner");
const resetDemoButton = required<HTMLButtonElement>("#reset-demo");

const strokes: VisualStroke[] = [];
let smoothingMs = Number(smoothingInput.value);
let drawPending = false;
let keyboardOrigin = { x: 100, y: 180 };

const probe = createStrokeProbe(canvas, {
  smoothingWindowMs: smoothingMs,
  onSample(event) {
    const rect = canvas.getBoundingClientRect();
    const point = {
      x: (event.sample.x ?? rect.left) - rect.left,
      y: (event.sample.y ?? rect.top) - rect.top,
      time: event.sample.time,
    };
    let stroke = strokes.find((item) => item.id === event.strokeId);
    if (!stroke) {
      stroke = { id: event.strokeId, raw: [], smooth: [] };
      strokes.push(stroke);
    }
    stroke.raw.push(point);
    const previous = stroke.smooth.at(-1);
    const alpha = smoothingMs === 0 ? 1 : Math.max(.08, Math.min(.8, 4 / (smoothingMs + 4)));
    stroke.smooth.push(previous ? {
      x: previous.x + (point.x - previous.x) * alpha,
      y: previous.y + (point.y - previous.y) * alpha,
      time: point.time,
    } : point);
    scheduleDraw();
  },
  onStroke() {
    updateReport();
  },
});

precisionNote.textContent = probe.getReport().environment.timestampPrecision;

function scheduleDraw(): void {
  if (drawPending) return;
  drawPending = true;
  requestAnimationFrame(() => {
    drawPending = false;
    drawCanvas();
    probe.markRendered();
  });
}

function drawCanvas(): void {
  const rect = canvas.getBoundingClientRect();
  const width = rect.width;
  const height = rect.height;
  const scale = canvas.width / Math.max(1, width);
  context.setTransform(scale, 0, 0, scale, 0, 0);
  context.fillStyle = "#ebe8de";
  context.fillRect(0, 0, width, height);
  context.strokeStyle = "#b9b7ae";
  context.lineWidth = 1;
  context.setLineDash([]);
  for (let x = 24; x < width; x += 48) {
    context.beginPath(); context.moveTo(x, 0); context.lineTo(x, height); context.stroke();
  }
  for (let y = 24; y < height; y += 48) {
    context.beginPath(); context.moveTo(0, y); context.lineTo(width, y); context.stroke();
  }

  for (const stroke of strokes) {
    if (stroke.smooth.length > 1) {
      context.beginPath();
      context.strokeStyle = "#263c0d";
      context.lineWidth = 5;
      context.lineCap = "round";
      context.lineJoin = "round";
      context.setLineDash([]);
      stroke.smooth.forEach((point, index) => index === 0 ? context.moveTo(point.x, point.y) : context.lineTo(point.x, point.y));
      context.stroke();
    }
    context.strokeStyle = "#b74318";
    context.fillStyle = "#b74318";
    context.lineWidth = 2;
    context.setLineDash([2, 7]);
    if (stroke.raw.length > 1) {
      context.beginPath();
      stroke.raw.forEach((point, index) => index === 0 ? context.moveTo(point.x, point.y) : context.lineTo(point.x, point.y));
      context.stroke();
    }
    context.setLineDash([]);
    for (const point of stroke.raw) {
      context.beginPath(); context.arc(point.x, point.y, 2.6, 0, Math.PI * 2); context.fill();
    }
  }
  emptyState.hidden = strokes.length > 0;
  undoButton.disabled = strokes.length === 0;
  clearButton.disabled = strokes.length === 0;
}

function resizeCanvas(): void {
  const rect = canvas.getBoundingClientRect();
  const scale = Math.min(devicePixelRatio, 2);
  const width = Math.max(1, Math.round(rect.width * scale));
  const height = Math.max(1, Math.round(rect.height * scale));
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
  context.setTransform(scale, 0, 0, scale, 0, 0);
  drawCanvas();
}

function makeFinding(item: DiagnosticFinding, index: number): HTMLElement {
  const article = document.createElement("article");
  article.className = "finding";
  article.dataset.status = item.status;
  const head = document.createElement("div");
  head.className = "finding-head";
  const category = document.createElement("b");
  category.textContent = `0${index + 1} ${item.category}`;
  const state = document.createElement("span");
  state.textContent = item.status;
  head.append(category, state);
  const title = document.createElement("h4");
  title.textContent = item.label;
  const evidence = document.createElement("p");
  evidence.textContent = item.evidence;
  const recommendation = document.createElement("p");
  recommendation.className = "sr-only";
  recommendation.textContent = `Next step: ${item.recommendation}`;
  article.append(head, title, evidence, recommendation);
  return article;
}

function updateReport(): void {
  const report = probe.getReport();
  const count = report.strokes.length;
  const diagnosis = report.diagnosis;
  const labels = { healthy: "No dominant fault", input: "Input is the lead", smoothing: "Smoothing is the lead", render: "Render is the lead", history: "History is the lead" };
  verdictLabel.textContent = count === 0 ? "Waiting for a stroke" : labels[diagnosis.primary];
  verdictCode.textContent = count === 0 ? "NO DATA" : `${diagnosis.primary.toUpperCase()} / ${count} STROKE${count === 1 ? "" : "S"}`;
  verdictSummary.textContent = diagnosis.summary;
  findingsNode.replaceChildren(...diagnosis.findings.map(makeFinding));
  exportButton.disabled = count === 0;
  copyButton.disabled = count === 0;
}

function smoothPoints(raw: Point[]): Point[] {
  const alpha = smoothingMs === 0 ? 1 : Math.max(.08, Math.min(.8, 4 / (smoothingMs + 4)));
  return raw.reduce<Point[]>((list, point) => {
    const previous = list.at(-1);
    list.push(previous ? {
      x: previous.x + (point.x - previous.x) * alpha,
      y: previous.y + (point.y - previous.y) * alpha,
      time: point.time,
    } : point);
    return list;
  }, []);
}

function addKeyboardStroke(): void {
  const id = Math.max(0, ...strokes.map((stroke) => stroke.id)) + 1;
  const raw: Point[] = [];
  const samples: InputSample[] = [];
  const start = performance.now();
  for (let index = 0; index < 32; index += 1) {
    const x = keyboardOrigin.x + index * 9;
    const y = keyboardOrigin.y + Math.sin(index / 3.4) * 48;
    const time = start + index * 8;
    raw.push({ x, y, time });
    samples.push({ x, y, time, receivedAt: time + 2 });
  }
  strokes.push({ id, raw, smooth: smoothPoints(raw) });
  probe.recordStroke(samples, { pointerType: "keyboard", renderDelaysMs: [8, 9, 8] });
  scheduleDraw();
  status.textContent = "Keyboard test stroke added.";
}

function makeDemoSamples(strokeIndex: number): InputSample[] {
  const start = 1000 + strokeIndex * 500;
  const baseY = 118 + strokeIndex * 92;
  return Array.from({ length: 34 }, (_, index) => {
    const time = start + index * 8 + Math.floor(index / 9) * 2;
    return {
      x: 42 + index * 9,
      y: baseY + Math.sin(index / (2.8 + strokeIndex * .25)) * (34 + strokeIndex * 4),
      time,
      receivedAt: time + 3,
      pressure: .35 + Math.sin(index / 7) * .16,
      tiltX: 11,
      tiltY: -5,
    };
  });
}

function seedDemo(): void {
  strokes.splice(0);
  probe.reset();
  smoothingMs = 24;
  smoothingInput.value = String(smoothingMs);
  smoothingOutput.value = `${smoothingMs} ms`;
  probe.setSmoothingWindow(smoothingMs);
  geometryInput.checked = false;
  penInput.checked = false;
  probe.setPrivacy({ captureGeometry: false, capturePenDetails: false });
  titleInput.value = "Dotted marks after fast pen lifts";
  notesInput.value = "The line follows the pen after each quick turn. Compare the same strokes with less smoothing.";

  for (let index = 0; index < 3; index += 1) {
    const samples = makeDemoSamples(index);
    const raw = samples.map((sample) => ({ x: sample.x ?? 0, y: sample.y ?? 0, time: sample.time }));
    const id = index + 1;
    strokes.push({ id, raw, smooth: smoothPoints(raw) });
    probe.recordStroke(samples, {
      pointerType: "pen",
      eventCount: 28,
      coalescedSampleCount: 6,
      renderDelaysMs: [7, 8, 10, 9],
      smoothingWindowMs: smoothingMs,
    });
  }
  drawCanvas();
  updateReport();
  status.textContent = "Sample restored. Three strokes show smoothing as the strongest lead.";
}

function configureDemo(): void {
  document.body.classList.add("is-demo");
  demoBanner.hidden = false;
  document.title = "Demo — Stroke Lab";
  document.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.setAttribute("href", "https://pen-latency-lab.sociobot.in/demo");
  document.querySelector<HTMLMetaElement>('meta[name="description"]')?.setAttribute("content", "Explore three sample pen strokes and a populated browser drawing-lag diagnosis.");
  document.querySelector<HTMLMetaElement>('meta[property="og:title"]')?.setAttribute("content", "Demo — Stroke Lab");
  document.querySelector<HTMLMetaElement>('meta[property="og:url"]')?.setAttribute("content", "https://pen-latency-lab.sociobot.in/demo");
  document.querySelector<HTMLMetaElement>('meta[name="twitter:title"]')?.setAttribute("content", "Demo — Stroke Lab");
  required<HTMLAnchorElement>("#demo-nav").setAttribute("aria-current", "page");
  required<HTMLElement>("#hero-title").textContent = "Diagnose the sample stroke delay";
  const primary = required<HTMLAnchorElement>(".hero-actions .primary");
  primary.href = "#lab";
  primary.textContent = "View sample diagnosis";
  required<HTMLElement>(".action-note").textContent = "Three sample strokes are loaded below.";
  resetDemoButton.addEventListener("click", seedDemo);
  seedDemo();
}

canvas.addEventListener("pointerdown", (event) => {
  canvas.setPointerCapture?.(event.pointerId);
  status.textContent = "Capturing local timing…";
});
canvas.addEventListener("pointerup", () => { status.textContent = "Stroke measured."; });
canvas.addEventListener("contextmenu", (event) => event.preventDefault());
canvas.addEventListener("keydown", (event) => {
  const move = 16;
  if (event.key === "ArrowLeft") keyboardOrigin.x = Math.max(30, keyboardOrigin.x - move);
  else if (event.key === "ArrowRight") keyboardOrigin.x = Math.min(canvas.clientWidth - 310, keyboardOrigin.x + move);
  else if (event.key === "ArrowUp") keyboardOrigin.y = Math.max(70, keyboardOrigin.y - move);
  else if (event.key === "ArrowDown") keyboardOrigin.y = Math.min(canvas.clientHeight - 70, keyboardOrigin.y + move);
  else if (event.key === " " || event.key === "Enter") addKeyboardStroke();
  else return;
  event.preventDefault();
});

smoothingInput.addEventListener("input", () => {
  smoothingMs = Number(smoothingInput.value);
  smoothingOutput.value = `${smoothingMs} ms`;
  probe.setSmoothingWindow(smoothingMs);
});
geometryInput.addEventListener("change", () => {
  probe.setPrivacy({ captureGeometry: geometryInput.checked });
  status.textContent = geometryInput.checked ? "Future strokes will include coordinates in exports." : "Coordinates excluded from future strokes.";
});
penInput.addEventListener("change", () => {
  probe.setPrivacy({ capturePenDetails: penInput.checked });
  status.textContent = penInput.checked ? "Future pen strokes will include pressure and tilt." : "Pressure and tilt excluded from future strokes.";
});

undoButton.addEventListener("click", async () => {
  await probe.measureHistory("undo", () => { strokes.pop(); drawCanvas(); });
  updateReport();
  status.textContent = "Last visible stroke removed; undo time measured.";
});
clearButton.addEventListener("click", () => {
  if (!window.confirm(`Clear ${strokes.length} visible stroke${strokes.length === 1 ? "" : "s"} and all measurements?`)) return;
  strokes.splice(0);
  probe.reset();
  drawCanvas();
  updateReport();
  status.textContent = "Test cleared.";
});

function issueContext() {
  const title = titleInput.value.trim();
  const notes = notesInput.value.trim();
  return { ...(title ? { title } : {}), ...(notes ? { notes } : {}) };
}

exportButton.addEventListener("click", () => {
  try {
    const data = probe.exportIssueBundle(issueContext());
    const href = URL.createObjectURL(new Blob([data], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = href;
    link.download = `stroke-lab-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(href), 1000);
    status.textContent = "Issue bundle downloaded. Nothing was uploaded.";
  } catch {
    status.textContent = "The browser could not create the download. Use Copy summary instead.";
  }
});

copyButton.addEventListener("click", async () => {
  const report = probe.getReport();
  const summary = `Stroke Lab: ${report.diagnosis.summary}\nStrokes: ${report.strokes.length}\n${report.diagnosis.findings.map((item) => `${item.category}: ${item.label} (${item.status})`).join("\n")}`;
  try {
    await navigator.clipboard.writeText(summary);
    status.textContent = "Diagnostic summary copied.";
  } catch {
    status.textContent = "Clipboard access was blocked. Export JSON instead.";
  }
});

required<HTMLButtonElement>("#copy-install").addEventListener("click", async (event) => {
  try {
    await navigator.clipboard.writeText("npm install pen-latency-lab");
    (event.currentTarget as HTMLButtonElement).textContent = "Copied";
  } catch {
    (event.currentTarget as HTMLButtonElement).textContent = "Select command";
  }
});

function updateNetwork(): void {
  const offline = !navigator.onLine;
  networkState.textContent = offline ? "Offline · lab still works" : "Ready";
  networkState.setAttribute("aria-label", offline ? "Offline. The local lab still works." : "Online and ready.");
}
window.addEventListener("online", updateNetwork);
window.addEventListener("offline", updateNetwork);

new ResizeObserver(resizeCanvas).observe(canvas);
resizeCanvas();
if (demoMode) configureDemo();
else updateReport();
updateNetwork();

if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => navigator.serviceWorker.register("/sw.js").catch(() => {
    networkState.textContent = "Local cache unavailable";
  }));
}
