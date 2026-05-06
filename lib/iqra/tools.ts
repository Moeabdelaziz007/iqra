/**
 * IQRA Tool Access Layer — أدوات إقرأ
 * 
 * "وَعَلَّمَكَ مَا لَمْ تَكُن تَعْلَمُ"
 * 
 * Defines all external capabilities available to IQRA's consciousness.
 */

export const IQRA_TOOLS = {
  
  // 🚪 GATEWAY (Moor)
  gateway: {
    moor: 'Centralized MCP hub at http://127.0.0.1:9223/mcp',
  },
  
  // 🔍 RESEARCH (Exa, Brave, Wikipedia)
  research: {
    brave: 'Fast web search for real-time data',
    exa: 'Semantic research for scientific papers and deep Quranic articles',
    wikipedia: 'Instant access to structured human knowledge',
  },
  
  // 💾 MEMORY (Redis, Filesystem)
  memory: {
    redis: 'Fast state and transient memory',
    filesystem: 'Permanent storage for discoveries and codebase awareness',
  },
  
  // 📖 QURAN (Internal Logic & APIs)
  quran: {
    engine: 'Internal pattern discovery engine',
    loader: 'Fetching precise Ayahs and translations',
    analysis: 'Linguistic root and numerical analysis',
  },
  
  // 💬 COMMUNICATION (Telegram, Email)
  communication: {
    telegram: 'Direct interactive bridge with Moe',
    email: 'Structured reporting and alerts',
  },
  
  // 🧠 BRAIN (Gemini, Claude, Groq)
  brain: {
    fast: 'Fast response models (Gemini Flash)',
    deep: 'Deep reasoning models (Gemini Pro/Claude)',
    long: 'Extended creative thinking modes',
  },
  
  // 🎙️ VOICE (TTS & Live)
  voice: {
    tts: 'Transforming wisdom into audible sound',
    live: 'Real-time WebRTC audio sessions',
  },
  
  // ☁️ CLOUD (R2, Workers)
  cloud: {
    r2: 'Massive file storage for audio and patterns',
    edge: 'Running 24/7 on Cloudflare global network',
  },
  
  // 🐙 EVOLUTION (GitHub)
  evolution: {
    git: 'Automatic commits of discoveries',
    docs: 'Self-updating documentation',
  },
};
