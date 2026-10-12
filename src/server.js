const express = require("express");
const path = require("path");
const { createSystem } = require("./bootstrap");
const { sample, KINDS } = require("./simulator");

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "..", "public")));

// ---- SSE: every dashboard subscribes here; Observer pushes threats to it ----
const clients = new Set();
const broadcast = (msg) => { const data = `data: ${JSON.stringify(msg)}\n\n`; clients.forEach((res) => res.write(data)); };
app.get("/api/stream", (req, res) => {
  res.set({ "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive" });
  res.flushHeaders();
  res.write(": connected\n\n");
  clients.add(res);
  req.on("close", () => clients.delete(res));
});

const { facade, ai, ranger, drone } = createSystem({ broadcast });
const wrap = (fn) => (req, res) => { try { res.json(fn(req)); } catch (e) { res.status(400).json({ error: e.message }); } };

app.get("/api/tree", wrap(() => facade.getTree()));
app.get("/api/events", wrap(() => facade.getEvents().slice(0, 30)));
app.get("/api/incidents", wrap(() => facade.getIncidentHistory()));
app.get("/api/alerts", wrap(() => ranger.alerts));
app.get("/api/drones", wrap(() => drone.dispatches));
app.get("/api/ai/status", wrap(() => ai.status()));
app.get("/api/summary", wrap(() => ({ zones: facade.reserve.summary(), totalEvents: facade.events.length, confirmed: facade.getIncidentHistory().length })));
app.get("/api/sensors", wrap(() => [...facade.sensors.values()].map((s) => s.profile)));

// raw ingest: body = { sensorId, features:{impulsiveness,centroid,durationMs,periodicity,rms} }
app.post("/api/ingest", wrap((req) => facade.ingestEvent(req.body.sensorId, req.body.features)));

// simulate: body = { sensorId? }
app.post("/api/simulate/:kind", wrap((req) => {
  if (!KINDS.includes(req.params.kind)) throw new Error("kind must be one of " + KINDS.join(", "));
  const ids = [...facade.sensors.keys()];
  const sensorId = req.body?.sensorId || ids[Math.floor(Math.random() * ids.length)];
  return facade.ingestEvent(sensorId, sample(req.params.kind));
}));

app.post("/api/events/:id/dismiss", wrap((req) => facade.dismissFalsePositive(req.params.id)));
app.post("/api/events/:id/undo", wrap((req) => facade.undoDismiss(req.params.id)));
app.post("/api/ai/provider", wrap((req) => { ai.setPreferred(req.body.name); return ai.status(); }));
app.post("/api/ai/cloud", wrap((req) => { ai.setCloudOnline(req.body.online); return ai.status(); }));

const PORT = process.env.PORT || 3000;
if (require.main === module) app.listen(PORT, () => console.log(`EchoWarden running -> http://localhost:${PORT}`));
module.exports = app;
