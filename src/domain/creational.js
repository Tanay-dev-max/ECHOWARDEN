/**
 * CREATIONAL PATTERNS
 *  - Builder   : SensorProfileBuilder
 *  - Prototype : ThreatProfileRegistry
 */

// ---------- BUILDER ----------
class SensorProfileBuilder {
  constructor(id) {
    if (!id) throw new Error("Sensor id is required");
    this.p = {
      id,
      zoneId: null,
      lat: 0,
      lng: 0,
      sensitivity: 0.5, // 0..1  (higher = alerts on weaker evidence)
      bands: [],        // monitored frequency bands, e.g. [[200, 1200], [1500, 4000]]
      watchlist: [],    // species names to protect
      sampleRate: 16000,
      batterySaver: false,
      noiseReduction: false,
      windFilter: false,
      rainFilter: false,
      echoFilter: false,
    };
  }
  zone(zoneId) { this.p.zoneId = zoneId; return this; }
  location(lat, lng) { this.p.lat = lat; this.p.lng = lng; return this; }
  sensitivity(v) { this.p.sensitivity = v; return this; }
  band(lo, hi) { this.p.bands.push([lo, hi]); return this; }
  watch(species) { this.p.watchlist.push(species); return this; }
  sampleRate(hz) { this.p.sampleRate = hz; return this; }
  batterySaver(on = true) { this.p.batterySaver = on; return this; }
  noiseReduction(on = true) { this.p.noiseReduction = on; return this; }
  windFilter(on = true) { this.p.windFilter = on; return this; }
  rainFilter(on = true) { this.p.rainFilter = on; return this; }
  echoFilter(on = true) { this.p.echoFilter = on; return this; }

  build() {
    const p = this.p;
    if (!p.zoneId) throw new Error("Sensor must belong to a zone");
    if (p.sensitivity < 0 || p.sensitivity > 1) throw new Error("sensitivity must be between 0 and 1");
    if (p.sampleRate < 4000) throw new Error("sampleRate too low");
    return Object.freeze({ ...p, bands: [...p.bands], watchlist: [...p.watchlist] });
  }
}

// ---------- PROTOTYPE ----------
class ThreatProfileRegistry {
  constructor() { this.prototypes = new Map(); }

  register(name, profile) {
    this.prototypes.set(name, structuredClone(profile));
    return this;
  }

  /** Deep-clone a registered template and apply per-zone overrides. */
  clone(name, overrides = {}) {
    const proto = this.prototypes.get(name);
    if (!proto) throw new Error(`Unknown threat profile: ${name}`);
    return { ...structuredClone(proto), ...overrides };
  }

  names() { return [...this.prototypes.keys()]; }
}

module.exports = { SensorProfileBuilder, ThreatProfileRegistry };
