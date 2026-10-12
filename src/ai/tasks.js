/**
 * STRATEGY PATTERN - one strategy per detection task. Each owns how it builds its
 * model input and how it interprets the raw score, independent of WHICH provider runs.
 */
class AITaskStrategy {
  constructor(task) { this.task = task; }
  buildInput(features) {
    const { impulsiveness, centroid, durationMs, periodicity, rms } = features;
    return { impulsiveness, centroid, durationMs, periodicity, rms };
  }
  interpret(raw) {
    // map similarity 0.6..1.0 -> confidence 0..1
    const confidence = Math.max(0, Math.min(1, (raw.similarity - 0.6) / 0.4));
    return { label: this.task, confidence };
  }
  run(provider, features) {
    return this.interpret(provider.score(this.task, this.buildInput(features)));
  }
}

class GunshotDetection extends AITaskStrategy { constructor() { super("gunshot"); } }
class EngineDetection extends AITaskStrategy { constructor() { super("engine"); } }
class VehicleDetection extends AITaskStrategy { constructor() { super("vehicle"); } }
class SpeciesCallDetection extends AITaskStrategy {
  constructor() { super("species"); }
  // species calls care less about raw loudness: damp rms so quiet animals are still caught
  buildInput(features) { return { ...super.buildInput(features), rms: Math.min(1, features.rms * 1.1) }; }
}

module.exports = { AITaskStrategy, GunshotDetection, EngineDetection, VehicleDetection, SpeciesCallDetection };
