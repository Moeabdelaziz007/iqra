# Qdrant Memory Skill | مهارة ذاكرة قدرانت

This rule ensures that IQRA's semantic memory is optimized for high performance, accuracy, and reliability, following the patterns from [qdrant/skills](https://github.com/qdrant/skills).

## 🧩 Retrieval Patterns (أنماط الاسترجاع)

- **Semantic Chunking:** Never split documents mid-sentence. Use paragraph-based or semantic chunking to preserve context.
- **Evaluation First:** Before diagnosing search quality issues, run a search with `exact: true` to rule out index quantization issues.
- **Batching:** Use `search_batch` for high-load operations to maximize throughput.

## ⚙️ Index Optimization (تحسين الفهرس)

- **Quantization:** Enable Scalar Quantization (int8) for large collections to keep the vector index in RAM without significantly losing precision.
- **HNSW Configuration:** 
  - For high precision: Increase `ef_construct` and `m`.
  - For high speed: Decrease `m` and use oversampling (`ef`).
- **Payload Indexing:** Always index fields used in filters (e.g., `is_tenant`, `user_id`, `category`) to avoid full payload scans.

## 🩺 Monitoring (المراقبة)

- **Health Checks:** Use the `/healthz` endpoint to monitor cluster availability.
- **Latency Tracking:** Track p99 latency for both embedding generation and vector search separately.

## 🤲 Intention (النية)
To ensure that the wisdom preserved in IQRA's memory is retrieved with the highest degree of *Ihsan* (excellence) and accuracy, serving as a reliable foundation for all reasoning.

---
**آخر تحديث | Last Updated:** 2026-05-06
**المصدر | Source:** https://github.com/qdrant/skills
