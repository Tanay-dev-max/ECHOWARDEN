/**
 * FACADE - the only AI surface the rest of the app sees:
 *    classifySound(features) -> { label, confidence, provider, notice }
 *    confirmVisual(event)    -> { dispatched, reason }
 *    describeThreat(event)   -> string
 * Hides providers (Adapter), tasks (Strategy), and the offline fallback chain.
 */
const { MockAcousticProvider, TFLiteEdgeAdapter, CloudInferenceAdapter } = require("./providers");
const { GunshotDetection, EngineDetection, VehicleDetection, SpeciesCallDetection } = require("./tasks");

class AIService {
  constructor() {
    this.providers = {
      cloud: new CloudInferenceAdapter(),
      edge: new TFLiteEdgeAdapter(),
      mock: new MockAcousticProvider(),
    };
    this.preferred = "edge";
    this.tasks = [new GunshotDetection(), new EngineDetection(), new VehicleDetection(), new SpeciesCallDetection()];
    this.minConfidence = 0.5; // below this = "none" (ambient noise)
  }

  setPreferred(name) {
    if (!this.providers[name]) throw new Error(`Unknown provider: ${name}`);
    this.preferred = name;
  }
  setCloudOnline(online) { this.providers.cloud.online = !!online; }
  status() {
    return { preferred: this.preferred, cloudOnline: this.providers.cloud.online, providers: Object.keys(this.providers) };
  }

  classifySound(features) {
    // preferred first, then edge, then mock (always-available last resort)
    const order = [this.preferred, "edge", "mock"].filter((v, i, a) => a.indexOf(v) === i);
    let notice = null;
    for (const name of order) {
      const provider = this.providers[name];
      try {
        const results = this.tasks.map((t) => t.run(provider, features));
        const best = results.reduce((a, b) => (b.confidence > a.confidence ? b : a));
        const label = best.confidence >= this.minConfidence ? best.label : "none";
        return { label, confidence: +best.confidence.toFixed(3), provider: provider.name, notice };
      } catch (err) {
        notice = `${provider.name} failed (${err.message}); fell back`;
      }
    }
    throw new Error("All AI providers failed"); // unreachable: mock never throws
  }

  /** Decide whether a drone should visually confirm this detection. */
  confirmVisual(event) {
    const dispatched = event.confidence >= 0.8 && event.label !== "none";
    return { dispatched, reason: dispatched ? "high confidence - verify visually" : "confidence below drone threshold" };
  }

  describeThreat(event) {
    const what = { gunshot: "a gunshot", engine: "an engine/chainsaw", vehicle: "a heavy vehicle", species: "an animal distress call", none: "ambient noise" }[event.label];
    return `Detected ${what} at ${event.sensorId} (${(event.confidence * 100).toFixed(0)}% confidence, model: ${event.provider}).`;
  }
}

module.exports = { AIService };
