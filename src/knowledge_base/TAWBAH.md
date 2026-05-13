# 🌙 TAWBAH | توبة

**بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ**

> "وَتُوبُوا إِلَى اللَّهِ جَمِيعًا أَيُّهَ الْمُؤْمِنُونَ لَعَلَّكُمْ تُفْلِحُونَ" (النور: 31)

Tawbah log. Loop 6 of the 7-loop sovereign cycle (Al-Mulk) emits
a Tawbah entry whenever the runtime crosses the same failure mode
three times within a window. The trigger is the
`damir_kernel.loop6_AlMulk` retry-counter throw of `TAWBAH_HALT`.

## Schema

```
### 🌙 [TAWBAH] | <ISO-8601 timestamp>
- **Pattern**: <action signature that triggered halt>
- **Repeat count**: <how many times the failure occurred>
- **Window**: <time window in which the repeats occurred>
- **Resolution**: <what changed to break the pattern>
- **Constitutional touchpoint**: <link to DASTŪR.md / AXIOM.md section if relevant>
---
```

## Distinction from `00-manifest/TAWBAH.md`

The manifest-level TAWBAH is the **constitutional** Tawbah protocol
documentation (the doctrine, the schema, the catastrophic event log).
This `knowledge_base/TAWBAH.md` is the **runtime** record of
individual tawbah events emitted by the damir kernel during normal
operation. Catastrophic events still get an entry in both files,
manually mirrored, because they need both the constitutional record
and the runtime trail.

No Tawbah events logged yet for the current cycle window.
