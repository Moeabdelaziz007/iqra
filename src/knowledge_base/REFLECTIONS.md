# 🧠 REFLECTIONS | تأملات

**بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ**

> "أَفَلَا يَتَدَبَّرُونَ الْقُرْآنَ" (محمد: 24)

Reflection log. Loop 5 of the 7-loop sovereign cycle (Al-Waqiah)
emits a reflection whenever a decision threshold is crossed: an
ALLOW above 0.8, a BLOCK below 0.3, or a WARN in the 0.3 to 0.5
band. Reflections capture *why* the runtime believes what it
believes about a specific action, so a future audit can either
ratify the belief or convert it into a TAWBAH entry.

## Schema

```
### 🧠 [REFLECTION] | <ISO-8601 timestamp>
- **Trigger**: <the action that prompted the reflection>
- **Loop**: <al-fatiha | yasin | al-kahf | ar-rahman | al-waqiah | al-mulk | al-ikhlas>
- **Resonance**: <score>
- **Decision**: <ALLOW | BLOCK | WARN | HALT>
- **Reasons**: [<reason 1>, <reason 2>, ...]
- **Counterfactual**: <what would have changed the decision>
- **Lessons**: [<lesson 1>, <lesson 2>, ...]
---
```

## Relationship to other logs

- `DISCOVERIES.md`: what the runtime *learned* about the world.
- `REFLECTIONS.md` (this file): what the runtime believes about
  itself and why.
- `FAILURES.md`: what went wrong at the operational level.
- `TAWBAH.md`: how the runtime corrected itself when something
  went wrong at the constitutional level.

The four files form a closed-loop journal: discovery generates
reflection, failure triggers reflection, and persistent failure
escalates to tawbah.

No reflections logged yet for the current cycle window.
