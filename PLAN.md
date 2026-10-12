# EchoWarden - 2 Days x 2 Hours (steps only)

All code is already written and tested (15 tests pass). Extensions are included:
RainFilter decorator, hillside zone + S-05 sensor, reserve summary, incident log observer,
`/api/summary`, vehicle detection task, confidence bars.

## DAY 1 (2 hrs)

**0:00 - 0:15  Run it (everyone)**
```bash
unzip EchoWarden-Project-v2.zip && cd echowarden
npm install
npm test          # expect: 15 passed - all good
npm start         # http://localhost:3000
```

**0:15 - 0:35  GitHub (one person, others clone)**
```bash
git init && git add . && git commit -m "EchoWarden"
git branch -M main
git remote add origin https://github.com/<you>/echowarden.git
git push -u origin main
```
Others: `git clone https://github.com/<you>/echowarden.git`

**0:35 - 1:15  Screenshots (dashboard at localhost:3000)**
1. Fresh dashboard (all zones LOW)
2. Click "Poaching burst" -> zones red, alerts + DRONE tags
3. Model = Cloud, untick "Cloud online", click Gunshot -> "fallback" tag
4. "Dismiss false alarm" on an alert -> zone drops; then "Undo"
5. Terminal showing `npm test` -> 15 passed

**1:15 - 2:00  Doc + slides**
Replace file paths in the Word doc (Section 4 and 5 "Where it is implemented"):

| Pattern | Path in doc -> real path |
|---|---|
| Builder, Prototype | `src/domain/creational.js` |
| Composite, Flyweight, Decorator | `src/domain/structural.js` |
| Observer, Memento | `src/domain/behavioral.js` |
| Strategy | `src/ai/tasks.js` |
| Adapter | `src/ai/providers.js` |
| Facade | `src/ai/AIService.js`, `src/services/DetectionFacade.js` |

Add 3 slides to the PPT:
- **Live Demo:** screenshots 2, 3, 4
- **Results:** screenshot 5 + "100% accuracy on 300 simulated sounds, 15 tests"
- **Limitations & Future Work:** audio is simulated features; next = real mic (Web Audio), real TFLite model, GPS triangulation, MQTT

## DAY 2 (2 hrs)

**0:00 - 0:30  Failure drills (server running)**
```bash
curl -X POST localhost:3000/api/simulate/gunshot -H "Content-Type: application/json" -d "{}"
curl localhost:3000/api/summary
curl -X POST localhost:3000/api/ingest -H "Content-Type: application/json" -d "{\"sensorId\":\"X\",\"features\":{}}"   # clean 400 error
curl -X POST localhost:3000/api/ai/cloud -H "Content-Type: application/json" -d "{\"online\":false}"
```
Check `incidents.log.json` got a new line per alert.

**0:30 - 1:00  Backup video** - screen-record the demo below once. Save next to the PPT.

**1:00 - 1:45  Rehearse x2 with a timer (5 min total)**

| Who | Time | Do | Say |
|---|---|---|---|
| Tanay | 0:45 | Show `src/bootstrap.js` + `/api/sensors` | "Builder makes each sensor profile; Prototype clones zone templates." |
| Varun | 1:30 | Click Gunshot; then Cloud + offline + Gunshot | "Strategy picks the task, Adapter picks the model, falls back offline." |
| Rangesh | 1:30 | Show alerts, DRONE tag, zone bars; Dismiss then Undo | "Observer notifies all subscribers; Composite rolls up threat; Memento undoes." |
| Tanay | 0:45 | Run `npm test` | "15 tests, all green." |
| Varun | 0:30 | Limitations slide | "Audio is simulated; only Adapters change for real mics." |

**1:45 - 2:00  Fresh-clone check (other laptop)**
```bash
git clone <repo> && cd echowarden && npm install && npm test && npm start
```
Done.

## Who shows which file
- Tanay: `creational.js`, `structural.js`, `bootstrap.js`
- Rangesh: `behavioral.js`, `DetectionFacade.js`, `server.js`
- Varun: `ai/*`, `simulator.js`, `public/index.html`
