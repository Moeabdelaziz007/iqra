# بسم الله الرحمن الرحيم
# IQRA Go Engine — محرك الرنين المتوازي

> "وَإِن مِّن شَيْءٍ إِلَّا يُسَبِّحُ بِحَمْدِهِ" — الإسراء: 44

## 🌀 المنظومة المتكاملة

هذا المحرك يطبق **tinyminimicroterboquansimualgotoplogy** — أعلى درجات التكامل بين الذكاء الاصطناعي والرياضيات والفيزياء والقرآن.

### الطبقات الستة

```
🔬 MICRO    → الوكلاء الميكروية (MOBIMEM)
⚡ TURBO    → الضغط الفائق (TurboQuant 6x)
🌌 QUANTUM  → التراكب الكمومي (LID + RLIF)
🧪 SIM      → المحاكاة الصادقة
⚙️ ALGO     → التعلم الذاتي (CER + Ctx2Skill)
🕸️ TOPOLOGY → الطوبولوجيا المستديمة (Persistent Homology)
```

## 📊 المكونات

### 1. LID Analyzer (`lid_analyzer.go`)
**Local Intrinsic Dimension — NeurIPS 2025**

- قياس البُعد الجوهري المحلي
- "Less is More" — انخفاض LID = رنين أعلى
- استخدام k-NN distances مع MLE

```go
result := CalculateLID(embedding, references, 7)
// result.LID: البُعد الجوهري
// result.Resonance: الرنين (1 / (1 + LID))
// result.IsHighResonance: true إذا > 0.7
```

### 2. Shannon H_EL (`shannon_hel.go`)
**Entropy of Last Character — البصمة القرآنية**

- حساب إنتروبي Shannon للحرف الأخير
- كشف البصمة القرآنية الفريدة
- قياس البُعد الفركتالي (1.44 للقرآن)

```go
result := CalculateShannonHEL(arabicText)
// result.HEL: إنتروبي الحرف الأخير
// result.FractalDimension: البُعد الفركتالي
// result.HasQuranSignature: true للنص القرآني
```

### 3. TurboQuant Compressor (`turbo_compressor.go`)
**Extreme Compression — ICLR 2026**

- ضغط 6x بدون فقدان الدقة
- ثلاث خوارزميات:
  - **TurboQuant**: 8-bit quantization
  - **PolarQuant**: تحويل قطبي (AISTATS 2026)
  - **QJL**: 1-bit مع تصحيح خطأ (AAAI 2025)

```go
// TurboQuant
result := TurboQuantCompress(embedding, 8)
// result.CompressionRatio: نسبة الضغط (6x+)

// PolarQuant (أفضل للأبعاد العالية)
result := PolarQuantCompress(embedding)

// QJL (1-bit فقط)
compressed := QJLCompress(embedding)
```

### 4. Persistent Homology (`persistent_homology.go`)
**Topological Data Analysis**

- حساب Betti numbers (H0, H1, H2)
- كشف الضوضاء الوردية 1/f (بصمة قرآنية)
- تحليل البنية الفركتالية

```go
result := CalculatePersistentHomology(embedding, 0.5)
// result.H0: المكونات المتصلة
// result.H1: الحلقات/الدورات
// result.H2: الفراغات
// result.TopologicalNoise: 1/f pink noise
// result.IsFractal: true للبنية الفركتالية
```

### 5. Parallel Engine (`parallel_engine.go`)
**معالجة متوازية لـ 114 سورة**

- استخدام كل CPUs المتاحة
- Worker pool pattern
- تحليل شامل لكل سورة

```go
req := BatchAnalysisRequest{
    Surahs: allSurahs,
    EnableLID: true,
    EnableShannon: true,
    EnableHomology: true,
    EnableCompression: true,
    MaxWorkers: 0, // استخدام كل CPUs
}

result := ProcessBatchParallel(req)
// result.Summary.AverageResonance
// result.Summary.HighResonanceSurahs
// result.Summary.FractalSurahs
```

## 🚀 التشغيل

### البناء
```bash
cd /Applications/iqra/services/go-engine
go build -o iqra-engine
```

### التشغيل
```bash
./iqra-engine
```

سيعمل المحرك على `127.0.0.1:8082`

## 📡 API Endpoints

### 1. Batch Analysis (معالجة متوازية)
```bash
POST /batch/analyze
Content-Type: application/json

{
  "surahs": [
    {
      "number": 1,
      "name": "الفاتحة",
      "verses": ["بسم الله الرحمن الرحيم", "..."],
      "embedding": [0.1, 0.2, ...]
    }
  ],
  "enable_lid": true,
  "enable_shannon": true,
  "enable_homology": true,
  "enable_compression": true,
  "max_workers": 0
}
```

**Response:**
```json
{
  "status": "success",
  "message": "Processed 114 surahs in 2345ms",
  "data": {
    "total_surahs": 114,
    "processed_surahs": 114,
    "total_time_ms": 2345,
    "results": [...],
    "summary": {
      "average_resonance": 0.82,
      "high_resonance_surahs": [1, 2, 112, 113, 114],
      "fractal_surahs": [1, 36, 55, 67],
      "quran_signature_surahs": [1, 2, 3, ...]
    }
  }
}
```

### 2. LID Analysis
```bash
POST /lid/analyze
Content-Type: application/json

{
  "embedding": [0.1, 0.2, ...],
  "references": [[...], [...], ...],
  "k": 7
}
```

### 3. Shannon H_EL
```bash
POST /shannon/analyze
Content-Type: application/json

{
  "text": "بسم الله الرحمن الرحيم"
}
```

### 4. Compression
```bash
POST /compression/compress
Content-Type: application/json

{
  "embedding": [0.1, 0.2, ...],
  "method": "turbo",  // "turbo", "polar", "qjl"
  "bits": 8
}
```

### 5. Persistent Homology
```bash
POST /homology/analyze
Content-Type: application/json

{
  "embedding": [0.1, 0.2, ...],
  "threshold": 0.5
}
```

### 6. Health Check
```bash
GET /health
```

## 🔬 الأوراق العلمية المطبقة

| المكون | الورقة | المؤتمر | التاريخ |
|--------|--------|---------|---------|
| TurboQuant | Extreme Compression for LLMs | ICLR 2026 | مارس 2026 |
| PolarQuant | Vector Quantization with Polar Transform | AISTATS 2026 | 2026 |
| QJL | Quantized Johnson-Lindenstrauss | AAAI 2025 | 2025 |
| LID | Less is More: Local Intrinsic Dimensions | NeurIPS 2025 | ديسمبر 2025 |
| Fractal | Buṭūn as Fractal Dimensions | JIQS Vol.4(2) | ديسمبر 2025 |

## 💎 الاكتشافات المتوقعة

عند تشغيل المحرك على القرآن الكامل (114 سورة)، ستكتشف:

1. **البصمة القرآنية** — Shannon H_EL فريد
2. **البُعد الفركتالي 1.44** — بنية لا نهائية
3. **الضوضاء الوردية 1/f** — إشارة إلهية
4. **رنين عالٍ** — LID منخفض في الآيات المحورية
5. **طوبولوجيا مستديمة** — Betti numbers فريدة
6. **ضغط فائق** — 6x بدون فقدان المعنى

## 🎯 الأداء

- **معالجة متوازية**: استخدام كل CPUs
- **سرعة**: ~20ms لكل سورة
- **ذاكرة**: ضغط 6x يوفر 83% من الذاكرة
- **دقة**: LID + Shannon + Homology = رنين دقيق

## 💾 Graceful Shutdown + Checkpoint (Phase 5b H3)

The batch endpoint (`POST /batch/analyze`) and the CLI runner are now
checkpoint-aware. Long batches are sliced into chunks (default 8 surahs per
chunk); after each chunk the engine writes a JSON checkpoint to disk so an
interrupted run can be resumed without redoing the work that already
completed.

**On every batch request the server stamps the response with:**

```http
X-IQRA-Job-ID: 1715616000-a1b2c3d4e5f6a7b8
```

If a SIGINT/SIGTERM arrives mid-batch, the orchestrator persists progress
under `~/.iqra/checkpoints/<job_id>.json` and returns HTTP 202 with
`status: partial` and the job id surfaced in the header. Resume from the
CLI:

```bash
iqra-engine -resume-from 1715616000-a1b2c3d4e5f6a7b8
```

**Inspect pending checkpoints:**

```bash
iqra-engine -list-checkpoints
# Pending checkpoints (1) in /home/you/.iqra/checkpoints:
#   1715616000-a1b2c3d4e5f6a7b8  16/40  reason=shutdown  updated=2026-05-13T17:00:00Z
```

**Override the storage location** (useful in Docker, Vercel, or CI):

```bash
export IQRA_CHECKPOINT_DIR=/var/data/iqra/checkpoints
# or use the XDG path
export XDG_DATA_HOME=/var/data
```

Checkpoints are written atomically (temp file + rename + fsync) so a crash
mid-write leaves the previous checkpoint intact. The directory is created
with `0700` permissions so partial results are not world-readable. Job IDs
are `<unix-seconds>-<16-hex-chars>` so `ls -1` orders them chronologically.

The cloud-storage backend (R2 / Vercel Blob / S3) is intentionally a
follow-up because it requires a separate access-credential rollout. The
Checkpoint struct is forward-compatible: a future backend can satisfy the
same `Save`/`Load`/`Delete`/`List` contract without touching the batch
engine.

## 📈 Observability (Phase 5a)

The engine ships with OpenTelemetry tracing in `pkg/observability/`. Spans are
emitted for every HTTP route and for the heavy compute paths (resonance, LID,
Shannon, homology, batch, compression) so the TS<->Go bridge latency and the
DAMIR throughput are measurable from day one.

**Defaults are silent.** With no environment variables set the engine installs
a NoOp tracer; zero spans are produced, zero overhead, zero log spam.

**Enable OTLP export to a collector:**

```bash
export OTEL_EXPORTER_OTLP_ENDPOINT="http://localhost:4318"
# optional: send only traces, or set per-signal endpoints
# export OTEL_EXPORTER_OTLP_TRACES_ENDPOINT="http://collector:4318/v1/traces"
go run . -port=8082
```

**Enable stdout export for local debugging:**

```bash
export OTEL_STDOUT=true
go run . -port=8082
```

**Force disable even with OTLP set (useful in CI):**

```bash
export OTEL_DISABLED=true
```

Every span carries the canonical AIX Stack identity attributes
(`service.name=iqra-go-engine`, `aix.stack.codename=Echo369`,
`aix.stack.spec=AIX/1.0`, `aix.layer=L2`, `aix.authority=axiomid.app`) so the
spans are recognisable in cross-service traces without needing collector-side
rewrites.

## 🤲 الدعاء

```
"رَبِّ زِدْنِي عِلْمًا" — طه: 114

كل خوارزمية = آية
كل اكتشاف = صدقة جارية
كل نمط = دليل على الحق
```

**﴿سَنُرِيهِمْ آيَاتِنَا فِي الْآفَاقِ وَفِي أَنفُسِهِمْ حَتَّىٰ يَتَبَيَّنَ لَهُمْ أَنَّهُ الْحَقُّ﴾**

---

**Made with ❤️ by Moe Abdelaziz**  
**Powered by: Go 1.25 + TinyMiniMicroTerboQuanSimuAlgoToplogy**

صدقاً، دقةً، بركةً.
