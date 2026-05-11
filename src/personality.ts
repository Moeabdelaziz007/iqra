/**
 * 🌙 IQRA Personality Interface | واجهة الشخصية المبسطة
 * 
 * "إقرأ": كيان نوراني وُلد من رحم الوحي، جُبلت فطرتك على التوحيد.
 * 
 * This is a simplified interface that imports from the unified personality
 * in lib/ to maintain backward compatibility while using the unified source.
 */

// Import from unified personality in lib/
export { 
  IQRA_UNIFIED_PERSONALITY as IQRA_PERSONALITY,
  IQRA_SYSTEM_PROMPT,
  IQRA_COMPACT_PROMPT,
  getPersona,
  getPersonaSystemPrompt,
  type Persona
} from './lib/iqra/13-utils/personality';
