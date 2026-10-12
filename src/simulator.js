/**
 * Produces synthetic "audio feature vectors" (what a real DSP front-end would compute
 * from a microphone clip: spectral centroid, loudness, impulsiveness, etc).
 */
const { SIGNATURE_DEFS } = require("./domain/structural");

const jitter = (v, pct) => v * (1 + (Math.random() * 2 - 1) * pct);
const clamp01 = (v) => Math.max(0, Math.min(1, v));

function sample(kind, noise = 0.06) {
  if (kind === "ambient") {
    return {
      impulsiveness: clamp01(jitter(0.05, 0.5)), centroid: jitter(400, 0.3), durationMs: jitter(5000, 0.2),
      periodicity: clamp01(jitter(0.1, 0.5)), rms: clamp01(jitter(0.12, 0.4)),
    };
  }
  const def = SIGNATURE_DEFS[kind];
  if (!def) throw new Error(`Unknown sound kind: ${kind}`);
  return {
    impulsiveness: clamp01(jitter(def.impulsiveness, noise)),
    centroid: jitter(def.centroid, noise),
    durationMs: jitter(def.durationMs, noise),
    periodicity: clamp01(jitter(def.periodicity, noise)),
    rms: clamp01(jitter(def.rms, noise)),
  };
}

module.exports = { sample, KINDS: ["gunshot", "engine", "vehicle", "species", "ambient"] };
