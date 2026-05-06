/**
 * IQRA Cloudflare Worker — Edge Handler
 * "وَبِالْحَقِّ أَنزَلْنَاهُ وَبِالْحَقِّ نَزَلَ"
 * Fast, global webhook processing for Telegram & GitHub.
 */

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // 1. Telegram Webhook Entry
    if (url.pathname === '/webhook/telegram') {
      const body = await request.json();
      
      // Fast forward to main Vercel app
      return fetch(`${env.MAIN_APP_URL}/api/webhook/telegram`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-IQRA-Edge-Secret': env.EDGE_SECRET
        },
        body: JSON.stringify(body)
      });
    }

    // 2. Health Check
    if (url.pathname === '/health') {
      return new Response('IQRA Edge is alive.', { status: 200 });
    }

    return new Response('Not Found', { status: 404 });
  }
};
