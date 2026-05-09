/**
 * IQRA R2 Storage Layer — مخزن إقرأ الرقمي
 * 
 * Uses Cloudflare R2 for zero-cost egress storage.
 * Stores Quranic patterns, Voice notes, and LTM (Long Term Memory).
 */

export interface R2Env {
  IQRA_BUCKET: R2Bucket;
}

export class IQRAStorage {
  /**
   * Upload discoveries or files to R2
   */
  static async upload(env: R2Env, path: string, data: any, contentType: string = 'application/json') {
    const body = typeof data === 'string' ? data : JSON.stringify(data);
    
    await env.IQRA_BUCKET.put(path, body, {
      httpMetadata: { contentType }
    });
    
    console.log(`📦 File uploaded to R2: ${path}`);
  }

  /**
   * Retrieve files from R2
   */
  static async get(env: R2Env, path: string) {
    const object = await env.IQRA_BUCKET.get(path);
    if (!object) return null;
    
    if (path.endsWith('.json')) {
      return await object.json();
    }
    return await object.arrayBuffer();
  }
}
