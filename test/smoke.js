/** Run: npm test   - proves every pattern works. No framework needed. */
const assert = require("assert");
const { createSystem } = require("../src/bootstrap");
const { sample } = require("../src/simulator");
const { SensorProfileBuilder, ThreatProfileRegistry } = require("../src/domain/creational");
const { signatures, AudioStream, NoiseReduction, WindFilter } = require("../src/domain/structural");

let passed = 0;
const test = (name, fn) => { try { fn(); passed++; console.log("  ok  ", name); } catch (e) { console.error("  FAIL", name, "->", e.message); process.exitCode = 1; } };

console.log("EchoWarden pattern tests");

// --- Creational ---
test("Builder validates and freezes", () => {
  assert.throws(() => new SensorProfileBuilder("X").build(), /zone/);
  assert.throws(() => new SensorProfileBuilder("X").zone("Z").sensitivity(2).build(), /sensitivity/);
  const p = new SensorProfileBuilder("X").zone("Z").band(1, 2).build();
  assert.ok(Object.isFrozen(p));
});
test("Prototype clones are independent", () => {
  const r = new ThreatProfileRegistry().register("a", { list: [1], n: 1 });
  const c1 = r.clone("a"); c1.list.push(2);
  assert.deepStrictEqual(r.clone("a").list, [1]);
});

// --- Structural ---
test("Flyweight shares one signature object", () => {
  assert.strictEqual(signatures.get("gunshot"), signatures.get("gunshot"));
  assert.ok(signatures.stats().shared > 0);
});
test("Decorators stack in order", () => {
  const f = new WindFilter(new NoiseReduction(new AudioStream({ rms: 0.1, periodicity: 0.1 }))).read();
  assert.deepStrictEqual(f.applied, ["NoiseReduction", "WindFilter"]);
});

// --- AI: Strategy + Adapter + Facade, classification accuracy over many samples ---
test("Classifier is accurate on simulated sounds (>=95% over 300 samples)", () => {
  const { ai } = createSystem();
  let ok = 0, total = 0;
  for (const kind of ["gunshot", "engine", "vehicle", "species", "ambient"]) {
    for (let i = 0; i < 60; i++) {
      const r = ai.classifySound({ ...sample(kind), applied: [] });
      total++; if (r.label === (kind === "ambient" ? "none" : kind)) ok++;
    }
  }
  assert.ok(ok / total >= 0.95, `accuracy ${(ok / total * 100).toFixed(1)}%`);
  console.log(`        accuracy: ${(ok / total * 100).toFixed(1)}%`);
});
test("Adapter fallback: cloud offline -> still classifies, with notice", () => {
  const { ai } = createSystem();
  ai.setPreferred("cloud"); ai.setCloudOnline(false);
  const r = ai.classifySound({ ...sample("gunshot"), applied: [] });
  assert.strictEqual(r.label, "gunshot");
  assert.ok(r.notice && r.provider !== "cloud");
});

// --- Facade + Composite + Observer + Memento end-to-end ---
test("Gunshot -> confirmed alert, zone threat rises, observers fire", () => {
  const { facade, ranger, drone } = createSystem();
  assert.strictEqual(facade.getZoneThreatLevel("Zone-North").level, "LOW");
  const e = facade.ingestEvent("S-01", sample("gunshot", 0.02));
  assert.strictEqual(e.label, "gunshot");
  assert.ok(e.confirmed);
  assert.ok(["HIGH", "CRITICAL"].includes(facade.getZoneThreatLevel("Zone-North").level));
  assert.strictEqual(ranger.alerts.length, 1);
  assert.ok(drone.dispatches.length >= 1);
});
test("Ambient noise never alerts", () => {
  const { facade, ranger } = createSystem();
  for (let i = 0; i < 20; i++) facade.ingestEvent("S-03", sample("ambient"));
  assert.strictEqual(ranger.alerts.length, 0);
  assert.strictEqual(facade.getZoneThreatLevel("Zone-East").level, "LOW");
});
test("Memento: dismiss lowers zone threat, undo restores it", () => {
  const { facade } = createSystem();
  const e = facade.ingestEvent("S-04", sample("gunshot", 0.02));
  const before = facade.getZoneThreatLevel("Zone-South").score;
  assert.ok(before > 0.5);
  facade.dismissFalsePositive(e.id);
  assert.strictEqual(facade.getZoneThreatLevel("Zone-South").score, 0);
  facade.undoDismiss(e.id);
  assert.strictEqual(facade.getZoneThreatLevel("Zone-South").score, before);
});
test("Composite rolls up: reserve level = max of zones", () => {
  const { facade } = createSystem();
  facade.ingestEvent("S-02", sample("engine", 0.02));
  const tree = facade.getTree();
  const maxZone = Math.max(...tree.children.map((z) => z.score));
  assert.strictEqual(tree.score, maxZone);
});
test("Unknown sensor rejected", () => {
  const { facade } = createSystem();
  assert.throws(() => facade.ingestEvent("NOPE", sample("gunshot")), /Unknown sensor/);
});

test("RainFilter decorator + hillside sensor (Builder/Prototype extension)", () => {
  const { facade } = createSystem();
  const e = facade.ingestEvent("S-05", sample("gunshot", 0.02));
  assert.ok(e.filters.includes("RainFilter"));
  assert.strictEqual(e.label, "gunshot");
});
test("Vehicle task detects heavy vehicle (Strategy extension)", () => {
  const { facade } = createSystem();
  const e = facade.ingestEvent("S-03", sample("vehicle", 0.02));
  assert.strictEqual(e.label, "vehicle");
});
test("Reserve summary lists every zone", () => {
  const { facade } = createSystem();
  assert.strictEqual(facade.reserve.summary().length, 4);
});
test("IncidentLogObserver writes a line per confirmed alert", () => {
  const fs = require("fs"); const f = require("path").join(require("os").tmpdir(), "ew-test-log.json");
  try { fs.unlinkSync(f); } catch (_) {}
  process.env.INCIDENT_LOG = f;
  const { facade } = createSystem();
  facade.ingestEvent("S-01", sample("gunshot", 0.02));
  assert.ok(fs.readFileSync(f, "utf8").trim().split("\n").length >= 1);
  delete process.env.INCIDENT_LOG;
});

console.log(`\n${passed} passed${process.exitCode ? " - SOME FAILED" : " - all good"}`);
