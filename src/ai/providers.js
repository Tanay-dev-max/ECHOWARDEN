/**
 * ADAPTER PATTERN - every model provider is wrapped behind ONE interface:
 *      provider.score(taskName, inputSpec) -> { similarity: 0..1 }
 * so the rest of the app never knows whether the model is a local rule engine,
 * an on-device TFLite model, or a cloud API.
 *
 * NOTE for the report/demo: the "audio" is a feature vector produced by the simulator.
 * To go real, only these adapters change (see PLAN.md, stretch goal).
 */
const { signatures } = require("../domain/structural");

const SCALE = { impulsiveness: 1, centroid: 3000, durationMs: 4000, periodicity: 1, rms: 1 };

/** Shared scoring core: closeness of a feature vector to a flyweight signature. */
function similarityTo(label, spec) {
  const sig = signatures.get(label);
  const keys = Object.keys(SCALE);
  let total = 0;
  for (const k of keys) total += Math.min(1, Math.abs((spec[k] ?? 0) - sig[k]) / SCALE[k]);
  return 1 - total / keys.length;
}

class AcousticModelProvider {
  get name() { throw new Error("not implemented"); }
  score(/* task, spec */) { throw new Error("not implemented"); }
}

/** Deterministic, offline, always available. Default + final fallback. */
class MockAcousticProvider extends AcousticModelProvider {
  get name() { return "mock"; }
  score(task, spec) { return { similarity: similarityTo(task, spec) }; }
}

/** Simulates a quantised on-device (TFLite) model: works offline, slightly less accurate. */
class TFLiteEdgeAdapter extends AcousticModelProvider {
  get name() { return "edge-tflite"; }
  score(task, spec) { return { similarity: similarityTo(task, spec) * 0.97 }; }
}

/** Simulates a cloud model: most accurate, but throws when connectivity is down. */
class CloudInferenceAdapter extends AcousticModelProvider {
  constructor() { super(); this.online = true; }
  get name() { return "cloud"; }
  score(task, spec) {
    if (!this.online) throw new Error("cloud unreachable");
    return { similarity: Math.min(1, similarityTo(task, spec) * 1.01) };
  }
}

module.exports = { AcousticModelProvider, MockAcousticProvider, TFLiteEdgeAdapter, CloudInferenceAdapter };
