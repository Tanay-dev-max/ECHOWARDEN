/**
 * Composition root: builds the whole system (used by server.js AND the tests).
 * Shows Builder + Prototype together: zone templates are cloned, then fed to the Builder.
 */
const { SensorProfileBuilder, ThreatProfileRegistry } = require("./domain/creational");
const { RangerAlertObserver, DashboardObserver, DroneDispatchObserver, IncidentLogObserver } = require("./domain/behavioral");
const { AIService } = require("./ai/AIService");
const { DetectionFacade } = require("./services/DetectionFacade");

function createSystem({ broadcast = () => {} } = {}) {
  const registry = new ThreatProfileRegistry()
    .register("canopy",  { sensitivity: 0.7, windFilter: true,  echoFilter: true,  noiseReduction: true })
    .register("savanna", { sensitivity: 0.5, windFilter: true,  echoFilter: false, noiseReduction: true })
    .register("riverbank", { sensitivity: 0.6, windFilter: false, echoFilter: true, noiseReduction: true })
    .register("hillside", { sensitivity: 0.65, windFilter: true, echoFilter: true, rainFilter: true, noiseReduction: true });

  const ranger = new RangerAlertObserver();
  const drone = new DroneDispatchObserver(0.8);
  const dashboard = new DashboardObserver(broadcast);
  const ai = new AIService();
  const facade = new DetectionFacade({ ai, observers: [ranger, drone, dashboard, new IncidentLogObserver(process.env.INCIDENT_LOG || "incidents.log.json")] });

  const layout = [
    { id: "S-01", zone: "Zone-North", template: "canopy",    lat: 11.62, lng: 76.55 },
    { id: "S-02", zone: "Zone-North", template: "canopy",    lat: 11.63, lng: 76.56 },
    { id: "S-03", zone: "Zone-East",  template: "savanna",   lat: 11.60, lng: 76.60 },
    { id: "S-04", zone: "Zone-South", template: "riverbank", lat: 11.58, lng: 76.52 },
    { id: "S-05", zone: "Zone-Hills",  template: "hillside",  lat: 11.66, lng: 76.58 },
  ];
  for (const s of layout) {
    const t = registry.clone(s.template);                       // Prototype
    const profile = new SensorProfileBuilder(s.id)              // Builder
      .zone(s.zone).location(s.lat, s.lng).sensitivity(t.sensitivity)
      .band(200, 1200).band(1500, 4000).watch("elephant").watch("tiger")
      .windFilter(t.windFilter).rainFilter(!!t.rainFilter).echoFilter(t.echoFilter).noiseReduction(t.noiseReduction)
      .build();
    facade.addSensor(profile);
  }
  return { facade, ai, ranger, drone, registry };
}

module.exports = { createSystem };
