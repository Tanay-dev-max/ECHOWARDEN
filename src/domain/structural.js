/**
 * STRUCTURAL PATTERNS
 *  - Composite : ThreatNode -> ReserveNode -> ZoneNode -> SensorNode -> AudioEventNode
 *  - Flyweight : SignatureFactory (shared acoustic signatures)
 *  - Decorator : AudioStream + NoiseReduction / WindFilter / EchoCancellation
 * (Facade lives in services/DetectionFacade.js and ai/AIService.js)
 */

// ---------- FLYWEIGHT ----------
// Intrinsic (shared, immutable) state = the signature template.
// Extrinsic state (timestamp, amplitude, sensor id) stays on each event.
const SIGNATURE_DEFS = {
  gunshot: { impulsiveness: 0.95, centroid: 2800, durationMs: 80,   periodicity: 0.05, rms: 0.9 },
  engine:  { impulsiveness: 0.10, centroid: 900,  durationMs: 3000, periodicity: 0.8,  rms: 0.6 },
  species: { impulsiveness: 0.20, centroid: 1500, durationMs: 1800, periodicity: 0.4,  rms: 0.5 },
  vehicle: { impulsiveness: 0.30, centroid: 350,  durationMs: 4500, periodicity: 0.5,  rms: 0.6 },
};

class SignatureFactory {
  constructor() { this.pool = new Map(); this.created = 0; this.requests = 0; }
  get(label) {
    this.requests++;
    if (!this.pool.has(label)) {
      const def = SIGNATURE_DEFS[label];
      if (!def) throw new Error(`No signature for ${label}`);
      this.pool.set(label, Object.freeze({ label, ...def }));
      this.created++;
    }
    return this.pool.get(label);
  }
  stats() { return { created: this.created, requests: this.requests, shared: this.requests - this.created }; }
}
const signatures = new SignatureFactory(); // one shared pool for the whole app

// ---------- COMPOSITE ----------
const SEVERITY = { gunshot: 1.0, engine: 0.8, vehicle: 0.75, species: 0.7 };

function levelOf(score) {
  if (score >= 0.8) return "CRITICAL";
  if (score >= 0.6) return "HIGH";
  if (score >= 0.3) return "MEDIUM";
  return "LOW";
}

class ThreatNode {
  constructor(id, type) { this.id = id; this.type = type; this.children = []; }
  add(child) { this.children.push(child); return this; }
  score() { return 0; }
  level() { return levelOf(this.score()); }
  toJSON() {
    return { id: this.id, type: this.type, score: +this.score().toFixed(3), level: this.level(),
             children: this.children.map((c) => c.toJSON()) };
  }
}

class AudioEventNode extends ThreatNode {
  constructor(event) { super(`event-${event.id}`, "event"); this.event = event; }
  score() {
    if (this.event.dismissed) return 0;
    return this.event.confidence * (SEVERITY[this.event.label] ?? 0.5);
  }
  toJSON() { return { id: this.id, type: "event", label: this.event.label, score: +this.score().toFixed(3), level: this.level() }; }
}

const maxScore = (nodes) => nodes.reduce((m, n) => Math.max(m, n.score()), 0);

class SensorNode extends ThreatNode {
  constructor(profile) { super(profile.id, "sensor"); this.profile = profile; }
  add(child) { this.children.push(child); if (this.children.length > 20) this.children.shift(); return this; }
  score() { return maxScore(this.children); }
}
class ZoneNode extends ThreatNode { constructor(id) { super(id, "zone"); } score() { return maxScore(this.children); } }
class ReserveNode extends ThreatNode {
  constructor(id) { super(id, "reserve"); }
  score() { return maxScore(this.children); }
  summary() {
    return this.children.map((z) => ({ zone: z.id, score: +z.score().toFixed(3), level: z.level(), sensors: z.children.length }));
  }
}

// ---------- DECORATOR ----------
class AudioStream {
  constructor(features) { this.features = { ...features, applied: [] }; }
  read() { return { ...this.features, applied: [...this.features.applied] }; }
}
class AudioFilter {
  constructor(inner) { this.inner = inner; }
  read() { return this.inner.read(); }
}
class NoiseReduction extends AudioFilter {
  read() { const f = super.read(); f.rms = Math.max(0, f.rms - 0.02); f.applied.push("NoiseReduction"); return f; }
}
class WindFilter extends AudioFilter {
  read() { const f = super.read(); if (f.rms < 0.2) f.rms *= 0.5; f.applied.push("WindFilter"); return f; }
}
class RainFilter extends AudioFilter {
  read() { const f = super.read(); if (f.rms < 0.25) f.rms *= 0.6; f.applied.push("RainFilter"); return f; }
}
class EchoCancellation extends AudioFilter {
  read() { const f = super.read(); f.periodicity = Math.max(0, f.periodicity - 0.02); f.applied.push("EchoCancellation"); return f; }
}

/** Wraps a raw stream with exactly the filters a sensor profile asks for. */
function buildStream(rawFeatures, profile) {
  let stream = new AudioStream(rawFeatures);
  if (profile.noiseReduction) stream = new NoiseReduction(stream);
  if (profile.windFilter) stream = new WindFilter(stream);
  if (profile.rainFilter) stream = new RainFilter(stream);
  if (profile.echoFilter) stream = new EchoCancellation(stream);
  return stream;
}

module.exports = {
  signatures, SIGNATURE_DEFS, SEVERITY, levelOf,
  ThreatNode, AudioEventNode, SensorNode, ZoneNode, ReserveNode,
  AudioStream, NoiseReduction, WindFilter, RainFilter, EchoCancellation, buildStream,
};
