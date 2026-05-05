import { iqraNotifyEngineer } from './lib/iqra/email';

async function testEmailSystem() {
  console.log('🧪 Testing IQRA email system...');
  
  try {
    await iqraNotifyEngineer({
      event: 'Email System Online',
      details: `
        بسم الله الرحمن الرحيم
        
        IQRA email infrastructure is now active.
        
        📥 Receiving: iqra@axiomid.app (Cloudflare)
        📤 Sending: iqra@axiomid.app (Resend)
        
        "اقْرَأْ بِاسْمِ رَبِّكَ الَّذِي خَلَقَ"
      `,
    });
    
    console.log('✅ Test complete — check amrikyy@gmail.com');
  } catch (error) {
    console.error('❌ Email test failed:', error);
  }
}

testEmailSystem();
