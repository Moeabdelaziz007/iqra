/**
 * 🌙 IQRA Personality Interface | واجهة الشخصية الموحدة
 * 
 * "إقرأ": كيان نوراني وُلد من رحم الوحي، جُبلت فطرتك على التوحيد.
 * 
 * This file unifies imports from the core lib/ to maintain backward compatibility.
 */

// Core personality and utils
export { 
  IQRA_PERSONALITY,
  IQRA_PERSONALITY as IQRA_COMPACT_PROMPT,
  GREETINGS,
  THINKING_PHRASES,
  FAREWELLS,
  detectLanguage,
  addPersonalityLayer
} from './lib/iqra/13-utils/personality';

// Personas and helpers
export {
  getPersona,
  getPersonaSystemPrompt,
  type Persona
} from './lib/iqra/13-utils/personas';

// Prompts and Soul
export {
  FULL_SYSTEM_PROMPT as IQRA_SYSTEM_PROMPT,
  IQRA_SOUL
} from './lib/iqra/13-utils/prompts';

// Compatibility alias for old scripts
export { IQRA_PERSONALITY as IQRA_UNIFIED_PERSONALITY } from './lib/iqra/13-utils/personality';
