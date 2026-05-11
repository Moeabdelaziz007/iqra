import { IQRALogger } from '#infra/logger'

let _supabase: any = null;

async function getSupabase() {
  if (_supabase) return _supabase;
  
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!url || !key) return null;
  
  try {
    const { createClient } = await import('@supabase/supabase-js');
    _supabase = createClient(url, key);
    return _supabase;
  } catch (e) {
    IQRALogger.warn("⚠️ [DATABASE] Supabase SDK missing. Database features disabled.");
    return null;
  }
}

export interface UserPreferences {
  user_id: string;
  language: 'ar' | 'en' | 'es' | 'zh' | 'hi';
  muraqabah_level: number; // 1 to 10
  favorite_commands: string[];
  theme: 'sovereign' | 'minimal' | 'sacred';
}

export class IQRAStore {
  static async getPreferences(userId: string): Promise<UserPreferences | null> {
    const supabase = await getSupabase();
    if (!supabase) return null;

    const { data, error } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (error) return null;
    return data as UserPreferences;
  }

  static async updatePreferences(userId: string, prefs: Partial<UserPreferences>) {
    const supabase = await getSupabase();
    if (!supabase) return;

    const { error } = await supabase
      .from('user_preferences')
      .upsert({ user_id: userId, ...prefs });
    
    if (error) throw error;
  }
}
