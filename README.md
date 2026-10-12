# EchoWarden

Real-time bioacoustic poaching detection - a Design Patterns course project.

```bash
npm install
npm test     # 15 pattern tests
npm start    # http://localhost:3000
```

Read `PLAN.md` for the 2-day plan, ownership split and demo script.

| Pattern | File |
|---|---|
| Builder, Prototype | `src/domain/creational.js` |
| Composite, Flyweight, Decorator | `src/domain/structural.js` |
| Observer, Memento | `src/domain/behavioral.js` |
| Adapter | `src/ai/providers.js` |
| Strategy | `src/ai/tasks.js` |
| Facade | `src/ai/AIService.js`, `src/services/DetectionFacade.js` |

Note: audio is simulated as feature vectors; only the Adapters change for real microphones.
