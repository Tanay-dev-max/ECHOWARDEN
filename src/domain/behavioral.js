/**
 * BEHAVIORAL PATTERNS
 *  - Observer : ThreatEvent subject + Ranger / Dashboard / Drone observers
 *  - Memento  : Incident (originator) + IncidentMemento + IncidentCaretaker
 * (Strategy lives in ai/tasks.js - one strategy per detection task)
 */

// ---------- OBSERVER ----------
class ThreatEventSubject {
  constructor() { this.observers = []; }
  subscribe(o) { this.observers.push(o); return () => this.unsubscribe(o); }
  unsubscribe(o) { this.observers = this.observers.filter((x) => x !== o); }
  publish(payload) {
    for (const o of this.observers) {
      try { o.update(payload); } catch (e) { console.error(`[observer ${o.constructor.name}]`, e.message); }
    }
  }
}

class RangerAlertObserver {
  constructor() { this.alerts = []; }
  update({ event, zoneId, zoneLevel }) {
    this.alerts.unshift({
      alertId: this.alerts.length + 1,
      ts: event.ts,
      message: `${event.label.toUpperCase()} detected at ${event.sensorId} (zone ${zoneId}) - confidence ${(event.confidence * 100).toFixed(0)}% - zone level ${zoneLevel}`,
      eventId: event.id,
    });
    this.alerts = this.alerts.slice(0, 50);
  }
}

class DashboardObserver {
  /** @param {(msg:object)=>void} broadcast  pushes JSON to every connected dashboard (SSE) */
  constructor(broadcast = () => {}) { this.broadcast = broadcast; }
  update(payload) { this.broadcast({ type: "threat", ...payload }); }
}

class DroneDispatchObserver {
  constructor(minConfidence = 0.8) { this.min = minConfidence; this.dispatches = []; }
  update({ event }) {
    if (event.confidence >= this.min) {
      this.dispatches.unshift({ ts: event.ts, eventId: event.id, sensorId: event.sensorId, status: "DRONE LAUNCHED (simulated)" });
      this.dispatches = this.dispatches.slice(0, 20);
    }
  }
}

const fs = require("fs");
class IncidentLogObserver {
  constructor(file = "incidents.log.json") { this.file = file; }
  update({ event, zoneId, zoneLevel }) {
    const line = JSON.stringify({ ts: event.ts, id: event.id, label: event.label, sensor: event.sensorId, zoneId, zoneLevel }) + "\n";
    fs.appendFileSync(this.file, line);
  }
}

// ---------- MEMENTO ----------
class IncidentMemento {
  constructor(state) { this.state = Object.freeze(structuredClone(state)); this.takenAt = Date.now(); }
}

class Incident {
  /** Originator: wraps one event so its state can be saved/restored. */
  constructor(event) { this.event = event; }
  save() { return new IncidentMemento({ dismissed: this.event.dismissed, confirmed: this.event.confirmed }); }
  restore(m) { this.event.dismissed = m.state.dismissed; this.event.confirmed = m.state.confirmed; }
}

class IncidentCaretaker {
  constructor() { this.stacks = new Map(); }
  push(eventId, memento) {
    if (!this.stacks.has(eventId)) this.stacks.set(eventId, []);
    this.stacks.get(eventId).push(memento);
  }
  pop(eventId) { return (this.stacks.get(eventId) || []).pop(); }
  history(eventId) { return (this.stacks.get(eventId) || []).length; }
}

module.exports = {
  ThreatEventSubject, RangerAlertObserver, DashboardObserver, DroneDispatchObserver, IncidentLogObserver,
  Incident, IncidentMemento, IncidentCaretaker,
};
