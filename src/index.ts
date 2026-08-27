export type DiagnosisCategory = "input" | "smoothing" | "render" | "history";
export type FindingStatus = "clear" | "watch" | "likely";

export interface InputSample {
  /** Pointer timestamp in the document performance timeline, in milliseconds. */
  time: number;
  /** Time the event reached the listener. Defaults to performance.now(). */
  receivedAt?: number;
  x?: number;
  y?: number;
  pressure?: number;
  tiltX?: number;
  tiltY?: number;
  twist?: number;
}

export interface StoredSample {
  time: number;
  x?: number;
  y?: number;
  pressure?: number;
  tiltX?: number;
  tiltY?: number;
  twist?: number;
}

export interface StrokeSummary {
  id: number;
  pointerType: string;
  durationMs: number;
  sampleCount: number;
  eventCount: number;
  coalescedSampleCount: number;
  sampleRateHz: number;
  medianSampleIntervalMs: number;
  p95SampleIntervalMs: number;
  intervalJitterMs: number;
  p95RenderDelayMs: number;
  smoothingWindowMs: number;
  samples?: StoredSample[];
}

export interface HistoryMeasurement {
  label: string;
  durationMs: number;
  measuredAt: number;
}

export interface DiagnosticFinding {
  category: DiagnosisCategory;
  status: FindingStatus;
  score: number;
  label: string;
  evidence: string;
  recommendation: string;
}

export interface Diagnosis {
  primary: DiagnosisCategory | "healthy";
  summary: string;
  findings: DiagnosticFinding[];
}

export interface ReportEnvironment {
  pointerEvents: boolean;
  coalescedEvents: boolean;
  timestampPrecision: string;
  viewportClass: "small" | "medium" | "large" | "unknown";
}

export interface SessionReport {
  schemaVersion: "1.0";
  generatedAt: string;
  privacy: {
    geometryIncluded: boolean;
    penDetailsIncluded: boolean;
    localOnly: true;
  };
  environment: ReportEnvironment;
  strokes: StrokeSummary[];
  history: HistoryMeasurement[];
  diagnosis: Diagnosis;
}

export interface IssueContext {
  title?: string;
  notes?: string;
  app?: string;
  appVersion?: string;
}

export interface IssueBundle extends SessionReport {
  issue: IssueContext;
}

export interface LiveSample {
  strokeId: number;
  pointerType: string;
  phase: "start" | "move";
  sample: Required<Pick<InputSample, "time" | "receivedAt">> & Omit<InputSample, "time" | "receivedAt">;
}

export interface StrokeProbeOptions {
  smoothingWindowMs?: number;
  captureGeometry?: boolean;
  capturePenDetails?: boolean;
  maxStrokes?: number;
  autoFrameMeasure?: boolean;
  onSample?: (sample: LiveSample) => void;
  onStroke?: (stroke: StrokeSummary) => void;
}

export interface RecordStrokeOptions {
  pointerType?: string;
  eventCount?: number;
  coalescedSampleCount?: number;
  renderDelaysMs?: number[];
  smoothingWindowMs?: number;
}

export interface StrokeProbe {
  markRendered(at?: number): void;
  measureHistory<T>(label: string, action: () => T | Promise<T>): Promise<T>;
  recordStroke(samples: InputSample[], options?: RecordStrokeOptions): StrokeSummary;
  setPrivacy(options: { captureGeometry?: boolean; capturePenDetails?: boolean }): void;
  setSmoothingWindow(milliseconds: number): void;
  getReport(): SessionReport;
  exportIssueBundle(context?: IssueContext): string;
  reset(): void;
  destroy(): void;
}

interface ActiveStroke {
  id: number;
  pointerId: number;
  pointerType: string;
  samples: InputSample[];
  eventCount: number;
  coalescedSampleCount: number;
  renderDelaysMs: number[];
  latestReceivedAt: number;
}

const round = (value: number, digits = 1): number => {
  const scale = 10 ** digits;
  return Math.round(value * scale) / scale;
};

const quantile = (values: number[], amount: number): number => {
  if (values.length === 0) return 0;
  const ordered = [...values].sort((a, b) => a - b);
  const index = Math.min(ordered.length - 1, Math.max(0, Math.ceil(amount * ordered.length) - 1));
  return ordered[index] ?? 0;
};

const statusFor = (score: number): FindingStatus => score >= 70 ? "likely" : score >= 35 ? "watch" : "clear";

function finding(category: DiagnosisCategory, score: number, label: string, evidence: string, recommendation: string): DiagnosticFinding {
  const normalized = round(Math.max(0, Math.min(100, score)), 0);
  return { category, status: statusFor(normalized), score: normalized, label, evidence, recommendation };
}

export function analyzeSession(strokes: StrokeSummary[], history: HistoryMeasurement[] = []): Diagnosis {
  if (strokes.length === 0 && history.length === 0) {
    return {
      primary: "healthy",
      summary: "No stroke evidence yet. Record at least three representative strokes.",
      findings: [
        finding("input", 0, "No input evidence", "No samples recorded.", "Draw three slow and three fast strokes."),
        finding("smoothing", 0, "No smoothing evidence", "No smoothing window recorded.", "Repeat with smoothing at its usual setting."),
        finding("render", 0, "No render evidence", "No frame delay recorded.", "Call markRendered() after painting."),
        finding("history", 0, "No history evidence", "No undo operation measured.", "Wrap undo with measureHistory()."),
      ],
    };
  }

  const intervals = strokes.map((stroke) => stroke.p95SampleIntervalMs).filter(Number.isFinite);
  const rates = strokes.map((stroke) => stroke.sampleRateHz).filter((rate) => rate > 0);
  const jitters = strokes.map((stroke) => stroke.intervalJitterMs);
  const frameDelays = strokes.map((stroke) => stroke.p95RenderDelayMs).filter((delay) => delay > 0);
  const smoothing = strokes.map((stroke) => stroke.smoothingWindowMs);
  const historyDelays = history.map((item) => item.durationMs);

  const inputInterval = quantile(intervals, 0.5);
  const inputRate = quantile(rates, 0.5);
  const jitter = quantile(jitters, 0.95);
  const frame = quantile(frameDelays, 0.95);
  const smoothingDelay = quantile(smoothing, 0.95);
  const historyDelay = quantile(historyDelays, 0.95);

  const inputScore = Math.min(100, Math.max((inputInterval - 10) * 4, (jitter - 5) * 5, (60 - inputRate) * 1.5));
  const smoothingScore = Math.min(100, Math.max(0, (smoothingDelay - 8) * 4));
  const renderScore = Math.min(100, Math.max(0, (frame - 12) * 4));
  const historyScore = Math.min(100, Math.max(0, (historyDelay - 20) * 1.6));

  const findings = [
    finding("input", inputScore, `${round(inputRate)} Hz median sampling`, `Median p95 gap ${round(inputInterval)} ms; interval jitter ${round(jitter)} ms.`, "Test another browser/port and inspect lost or coalesced pointer samples."),
    finding("smoothing", smoothingScore, `${round(smoothingDelay)} ms smoothing window`, smoothingDelay > 0 ? "Configured smoothing adds intentional following distance." : "No smoothing delay was declared.", "Reduce the smoothing window and compare the same stroke."),
    finding("render", renderScore, `${round(frame)} ms p95 render wait`, frameDelays.length > 0 ? "Measured from input receipt to the reported paint frame." : "No paint marker was reported.", "Call markRendered after paint; then profile long tasks if delay remains high."),
    finding("history", historyScore, `${round(historyDelay)} ms p95 history cost`, historyDelays.length > 0 ? `${historyDelays.length} history operation(s) measured.` : "No history operations measured.", "Measure undo with a full document and cap snapshot/rebuild work."),
  ];
  const strongest = [...findings].sort((a, b) => b.score - a.score)[0];
  if (!strongest || strongest.score < 35) return { primary: "healthy", summary: "No dominant latency source appears in this capture.", findings };
  return {
    primary: strongest.category,
    summary: `${strongest.category[0]?.toUpperCase()}${strongest.category.slice(1)} is the strongest lead: ${strongest.evidence}`,
    findings,
  };
}

function summarize(
  id: number,
  samples: InputSample[],
  options: Required<Pick<RecordStrokeOptions, "pointerType" | "eventCount" | "coalescedSampleCount" | "renderDelaysMs" | "smoothingWindowMs">>,
  privacy: { captureGeometry: boolean; capturePenDetails: boolean },
): StrokeSummary {
  const ordered = [...samples].sort((a, b) => a.time - b.time);
  const intervals = ordered.slice(1).map((sample, index) => Math.max(0, sample.time - (ordered[index]?.time ?? sample.time))).filter((gap) => gap > 0);
  const durationMs = ordered.length > 1 ? Math.max(0, (ordered.at(-1)?.time ?? 0) - (ordered[0]?.time ?? 0)) : 0;
  const median = quantile(intervals, 0.5);
  const stored = (privacy.captureGeometry || privacy.capturePenDetails) ? ordered.map((sample) => {
    const value: StoredSample = { time: round(sample.time, 2) };
    if (privacy.captureGeometry && sample.x !== undefined) value.x = round(sample.x, 2);
    if (privacy.captureGeometry && sample.y !== undefined) value.y = round(sample.y, 2);
    if (privacy.capturePenDetails) {
      if (sample.pressure !== undefined) value.pressure = round(sample.pressure, 3);
      if (sample.tiltX !== undefined) value.tiltX = sample.tiltX;
      if (sample.tiltY !== undefined) value.tiltY = sample.tiltY;
      if (sample.twist !== undefined) value.twist = sample.twist;
    }
    return value;
  }) : undefined;

  const result: StrokeSummary = {
    id,
    pointerType: options.pointerType,
    durationMs: round(durationMs),
    sampleCount: ordered.length,
    eventCount: options.eventCount,
    coalescedSampleCount: options.coalescedSampleCount,
    sampleRateHz: durationMs > 0 ? round((ordered.length - 1) * 1000 / durationMs) : 0,
    medianSampleIntervalMs: round(median),
    p95SampleIntervalMs: round(quantile(intervals, 0.95)),
    intervalJitterMs: round(quantile(intervals.map((gap) => Math.abs(gap - median)), 0.95)),
    p95RenderDelayMs: round(quantile(options.renderDelaysMs, 0.95)),
    smoothingWindowMs: round(options.smoothingWindowMs),
  };
  if (stored) result.samples = stored;
  return result;
}

function estimateTimestampPrecision(): string {
  if (typeof performance === "undefined") return "Unknown outside a browser; browser timestamps may be rounded.";
  const values: number[] = [];
  let previous = performance.now();
  for (let index = 0; index < 200; index += 1) {
    const current = performance.now();
    if (current > previous) values.push(current - previous);
    previous = current;
  }
  const minimum = values.length ? Math.min(...values) : 1;
  return `Estimated ≥${round(minimum, 3)} ms; the browser may clamp or round event timestamps.`;
}

function environmentFor(target: EventTarget): ReportEnvironment {
  const view = typeof window === "undefined" ? undefined : window;
  const width = view?.innerWidth;
  const viewportClass = width === undefined ? "unknown" : width < 600 ? "small" : width < 1100 ? "medium" : "large";
  const pointerPrototype = typeof PointerEvent === "undefined" ? undefined : PointerEvent.prototype;
  return {
    pointerEvents: typeof PointerEvent !== "undefined" || "onpointerdown" in target,
    coalescedEvents: Boolean(pointerPrototype && "getCoalescedEvents" in pointerPrototype),
    timestampPrecision: estimateTimestampPrecision(),
    viewportClass,
  };
}

export function createStrokeProbe(target: EventTarget, options: StrokeProbeOptions = {}): StrokeProbe {
  let smoothingWindowMs = Math.max(0, options.smoothingWindowMs ?? 0);
  let captureGeometry = options.captureGeometry ?? false;
  let capturePenDetails = options.capturePenDetails ?? false;
  const maxStrokes = Math.max(1, options.maxStrokes ?? 40);
  const autoFrameMeasure = options.autoFrameMeasure ?? true;
  const strokes: StrokeSummary[] = [];
  const history: HistoryMeasurement[] = [];
  const active = new Map<number, ActiveStroke>();
  const environment = environmentFor(target);
  let nextId = 1;
  let destroyed = false;
  let frameHandle: number | undefined;
  let lastActive: ActiveStroke | undefined;
  const now = (): number => typeof performance === "undefined" ? Date.now() : performance.now();

  const scheduleFrame = () => {
    if (!autoFrameMeasure || frameHandle !== undefined || typeof requestAnimationFrame === "undefined") return;
    frameHandle = requestAnimationFrame((time) => {
      frameHandle = undefined;
      if (lastActive) lastActive.renderDelaysMs.push(Math.max(0, time - lastActive.latestReceivedAt));
    });
  };

  const readSample = (event: PointerEvent): InputSample => {
    const sample: InputSample = { time: event.timeStamp, receivedAt: now(), x: event.clientX, y: event.clientY };
    if (capturePenDetails) {
      sample.pressure = event.pressure;
      sample.tiltX = event.tiltX;
      sample.tiltY = event.tiltY;
      sample.twist = event.twist;
    }
    return sample;
  };

  const collect = (event: PointerEvent, phase: "start" | "move") => {
    const current = active.get(event.pointerId);
    if (!current) return;
    const coalesced = typeof event.getCoalescedEvents === "function" ? event.getCoalescedEvents() : [];
    const source = coalesced.length > 0 ? coalesced : [event];
    current.eventCount += 1;
    current.coalescedSampleCount += Math.max(0, source.length - 1);
    for (const item of source) {
      const sample = readSample(item);
      current.samples.push(sample);
      current.latestReceivedAt = sample.receivedAt ?? now();
      options.onSample?.({ strokeId: current.id, pointerType: current.pointerType, phase, sample: { ...sample, receivedAt: sample.receivedAt ?? now() } });
    }
    lastActive = current;
    scheduleFrame();
  };

  const finish = (event: PointerEvent) => {
    const current = active.get(event.pointerId);
    if (!current) return;
    if (event.type === "pointerup") collect(event, "move");
    active.delete(event.pointerId);
    const summary = summarize(current.id, current.samples, {
      pointerType: current.pointerType,
      eventCount: current.eventCount,
      coalescedSampleCount: current.coalescedSampleCount,
      renderDelaysMs: current.renderDelaysMs,
      smoothingWindowMs,
    }, { captureGeometry, capturePenDetails });
    strokes.push(summary);
    if (strokes.length > maxStrokes) strokes.splice(0, strokes.length - maxStrokes);
    options.onStroke?.(summary);
  };

  const onPointerDown = (raw: Event) => {
    const event = raw as PointerEvent;
    if (destroyed || (event.isPrimary === false && event.pointerType !== "mouse")) return;
    active.set(event.pointerId, {
      id: nextId++, pointerId: event.pointerId, pointerType: event.pointerType || "unknown",
      samples: [], eventCount: 0, coalescedSampleCount: 0, renderDelaysMs: [], latestReceivedAt: now(),
    });
    collect(event, "start");
  };
  const onPointerMove = (event: Event) => collect(event as PointerEvent, "move");
  const onPointerEnd = (event: Event) => finish(event as PointerEvent);

  target.addEventListener("pointerdown", onPointerDown);
  target.addEventListener("pointermove", onPointerMove);
  target.addEventListener("pointerup", onPointerEnd);
  target.addEventListener("pointercancel", onPointerEnd);

  const report = (): SessionReport => ({
    schemaVersion: "1.0",
    generatedAt: new Date().toISOString(),
    privacy: { geometryIncluded: captureGeometry, penDetailsIncluded: capturePenDetails, localOnly: true },
    environment,
    strokes: strokes.map((stroke) => stroke.samples
      ? { ...stroke, samples: stroke.samples.map((sample) => ({ ...sample })) }
      : { ...stroke }),
    history: history.map((item) => ({ ...item })),
    diagnosis: analyzeSession(strokes, history),
  });

  return {
    markRendered(at = now()) {
      if (lastActive) lastActive.renderDelaysMs.push(Math.max(0, at - lastActive.latestReceivedAt));
    },
    async measureHistory<T>(label: string, action: () => T | Promise<T>): Promise<T> {
      const started = now();
      try { return await action(); }
      finally { history.push({ label, durationMs: round(now() - started, 2), measuredAt: Date.now() }); }
    },
    recordStroke(samples, recordOptions = {}) {
      const summary = summarize(nextId++, samples.map((sample) => ({ ...sample, receivedAt: sample.receivedAt ?? now() })), {
        pointerType: recordOptions.pointerType ?? "external",
        eventCount: recordOptions.eventCount ?? samples.length,
        coalescedSampleCount: recordOptions.coalescedSampleCount ?? 0,
        renderDelaysMs: recordOptions.renderDelaysMs ?? [],
        smoothingWindowMs: recordOptions.smoothingWindowMs ?? smoothingWindowMs,
      }, { captureGeometry, capturePenDetails });
      strokes.push(summary);
      if (strokes.length > maxStrokes) strokes.splice(0, strokes.length - maxStrokes);
      options.onStroke?.(summary);
      return summary;
    },
    setPrivacy(next) {
      if (next.captureGeometry !== undefined) captureGeometry = next.captureGeometry;
      if (next.capturePenDetails !== undefined) capturePenDetails = next.capturePenDetails;
    },
    setSmoothingWindow(milliseconds) { smoothingWindowMs = Math.max(0, milliseconds); },
    getReport: report,
    exportIssueBundle(context = {}) {
      const bundle: IssueBundle = { ...report(), issue: { ...context } };
      return JSON.stringify(bundle, null, 2);
    },
    reset() { strokes.splice(0); history.splice(0); active.clear(); lastActive = undefined; },
    destroy() {
      destroyed = true;
      target.removeEventListener("pointerdown", onPointerDown);
      target.removeEventListener("pointermove", onPointerMove);
      target.removeEventListener("pointerup", onPointerEnd);
      target.removeEventListener("pointercancel", onPointerEnd);
      if (frameHandle !== undefined && typeof cancelAnimationFrame !== "undefined") cancelAnimationFrame(frameHandle);
      active.clear();
    },
  };
}
