/**
 * FACADE - single entry point for controllers:
 *   ingestEvent / getZoneThreatLevel / dismissFalsePositive / undoDismiss /
 *   getIncidentHistory / getTree / getAlerts
 * Wires together Composite, Decorator, AI Facade, Observer and Memento.
 */
const { ReserveNode, ZoneNode, SensorNode, AudioEventNode, buildStream, levelOf } = require("../domain/structural");
const { ThreatEventSubject, Incident, IncidentCaretaker } = require("../domain/behavioral");

class DetectionFacade {
  constructor({ ai, observers = [] }) {
    this.ai = ai;
    this.reserve = new ReserveNode("reserve-1");
    this.zones = new Map();
    this.sensors = new Map();
    this.subject = new ThreatEventSubject();
    observers.forEach((o) => this.subject.subscribe(o));
    this.caretaker = new IncidentCaretaker();
    this.events = [];           // full history, newest first
    this.seq = 0;
  }

  addSensor(profile) {
    let zone = this.zones.get(profile.zoneId);
    if (!zone) { zone = new ZoneNode(profile.zoneId); this.zones.set(profile.zoneId, zone); this.reserve.add(zone); }
    const sensor = new SensorNode(profile);
    zone.add(sensor);
    this.sensors.set(profile.id, sensor);
    return sensor;
  }

  /** alert threshold derived from the sensor's sensitivity (higher sensitivity = lower bar) */
  alertThreshold(profile) { return 0.75 - profile.sensitivity * 0.3; }

  ingestEvent(sensorId, rawFeatures) {
    const sensor = this.sensors.get(sensorId);
    if (!sensor) throw new Error(`Unknown sensor: ${sensorId}`);
    const profile = sensor.profile;

    const features = buildStream(rawFeatures, profile).read();     // Decorator
    const result = this.ai.classifySound(features);                // AI Facade -> Strategy -> Adapter

    const event = {
      id: ++this.seq, sensorId, zoneId: profile.zoneId, ts: Date.now(),
      label: result.label, confidence: result.confidence, provider: result.provider, notice: result.notice,
      filters: features.applied, dismissed: false, confirmed: false,
    };
    event.description = this.ai.describeThreat(event);
    this.events.unshift(event);
    this.events = this.events.slice(0, 200);

    if (event.label !== "none") {
      sensor.add(new AudioEventNode(event));                       // Composite
      if (event.confidence >= this.alertThreshold(profile)) {
        event.confirmed = true;
        const incident = new Incident(event);                      // Memento: snapshot at confirmation
        this.caretaker.push(event.id, incident.save());
        event.drone = this.ai.confirmVisual(event);
        this.subject.publish({                                     // Observer
          event, zoneId: profile.zoneId,
          zoneLevel: this.getZoneThreatLevel(profile.zoneId).level,
          reserveLevel: this.reserve.level(),
        });
      }
    }
    return event;
  }

  getZoneThreatLevel(zoneId) {
    const z = this.zones.get(zoneId);
    if (!z) throw new Error(`Unknown zone: ${zoneId}`);
    return { zoneId, score: +z.score().toFixed(3), level: z.level() };
  }

  _find(eventId) {
    const e = this.events.find((x) => x.id === Number(eventId));
    if (!e) throw new Error(`Unknown event: ${eventId}`);
    return e;
  }

  dismissFalsePositive(eventId) {
    const e = this._find(eventId);
    const incident = new Incident(e);
    this.caretaker.push(e.id, incident.save());   // save state BEFORE changing it
    e.dismissed = true;
    return { event: e, zone: this.getZoneThreatLevel(e.zoneId) };
  }

  undoDismiss(eventId) {
    const e = this._find(eventId);
    const m = this.caretaker.pop(e.id);
    if (!m) throw new Error("Nothing to undo");
    new Incident(e).restore(m);
    return { event: e, zone: this.getZoneThreatLevel(e.zoneId) };
  }

  getIncidentHistory() { return this.events.filter((e) => e.confirmed); }
  getEvents() { return this.events; }
  getTree() { return this.reserve.toJSON(); }
  levelOf(score) { return levelOf(score); }
}

module.exports = { DetectionFacade };
