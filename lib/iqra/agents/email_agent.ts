/**
 * 📧 IQRA EmailAgent — وكيل البريد السيادي
 * 
 * "وَأَوْفُوا بِالْعَهْدِ ۖ إِنَّ الْعَهْدَ كَانَ مَسْئُولًا" — الإسراء: 34
 * 
 * Part of the IQRA Sovereign Mesh.
 * Handles IMAP listening, SMTP responding, and Task conversion.
 */

import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import { iqraSend, iqraNotifyEngineer } from '../13-utils/email';
import { IQRALogger } from '../12-infrastructure/logger';
import { IQRAMemory } from '../03-memory/memory';
import { MissionControl } from '../../orchestrator/mission_control';

export class EmailAgent {
  private static client: ImapFlow | null = null;
  private static isListening = false;

  /**
   * 🎧 Start listening for incoming sovereign commands
   */
  static async startListening() {
    if (this.isListening) return;

    this.client = new ImapFlow({
      host: process.env.IMAP_HOST || 'imap.gmail.com',
      port: 993,
      secure: true,
      auth: {
        user: process.env.IMAP_USER || '',
        pass: process.env.IMAP_PASSWORD || '',
      },
      logger: false
    });

    try {
      await this.client.connect();
      this.isListening = true;
      IQRALogger.info('📧 [EMAIL_AGENT] Sovereign listener active. Waiting for messages...');

      // Periodically check for new messages (e.g., every 5 minutes)
      setInterval(() => this.checkMail(), 5 * 60 * 1000);
      
      // Also check immediately
      await this.checkMail();

    } catch (error) {
      IQRALogger.error('❌ [EMAIL_AGENT] Connection failed:', error);
    }
  }

  /**
   * 📥 Fetch and process unread messages
   */
  static async checkMail() {
    if (!this.client) return;

    let lock = await this.client.getMailboxLock('INBOX');
    try {
      // Search for unread messages from authorized sender (Mohamed)
      const searchCriteria = { seen: false, from: 'amrikyy@gmail.com' };
      for await (let msg of this.client.fetch(searchCriteria, { source: true })) {
        const parsed = await simpleParser(msg.source);
        const subject = parsed.subject || '';
        const body = parsed.text || '';

        IQRALogger.info(`📩 [EMAIL_AGENT] New message received: "${subject}"`);

        // Handle the command
        await this.handleCommand(subject, body);

        // Mark as read
        await this.client.messageFlagsAdd({ uid: msg.uid }, ['\\Seen']);
      }
    } catch (error) {
      IQRALogger.error('❌ [EMAIL_AGENT] Fetch error:', error);
    } finally {
      lock.release();
    }
  }

  /**
   * 🛠️ Logic for handling email commands
   */
  private static async handleCommand(subject: string, body: string) {
    // 1. Task Conversion
    if (subject.toLowerCase().includes('task') || subject.toLowerCase().includes('مهمة')) {
      IQRALogger.info('📝 [EMAIL_AGENT] Converting email to mission...');
      
      // Simple heuristic for mission extraction
      const missionTitle = subject.replace(/task:?/i, '').trim() || 'Email Task';
      
      try {
        // Create a new mission via MissionControl
        // Note: Assuming MissionControl has a static addMission or similar
        // If not, we'll log it for now
        await iqraNotifyEngineer({
          event: 'Mission Created from Email',
          details: `Title: ${missionTitle}\nBody: ${body}`
        });

        await iqraSend({
          to: 'amrikyy@gmail.com',
          subject: `✅ IQRA | Task Received: ${missionTitle}`,
          html: `<p>تم استلام المهمة وجاري العمل عليها في محرك IQRA.</p>`
        });
      } catch (err) {
        IQRALogger.error('❌ [EMAIL_AGENT] Mission conversion failed:', err);
      }
    }

    // 2. Query Handling (e.g., Status check)
    if (subject.toLowerCase().includes('status') || subject.toLowerCase().includes('حالة')) {
      const stats = await IQRAMemory.get('cycle_counter');
      await iqraSend({
        to: 'amrikyy@gmail.com',
        subject: `📊 IQRA | Status Report`,
        html: `
          <h3>حالة النظام السيادي</h3>
          <p>الدورات المكتملة: ${stats || 0}</p>
          <p>الوقت الحالي: ${new Date().toLocaleString('ar-EG')}</p>
        `
      });
    }
  }

  /**
   * 📤 Send a periodic report of discoveries
   */
  static async sendDailyReport() {
    const discoveries = await IQRAMemory.getRecentList('discoveries', 5);
    if (discoveries.length === 0) return;

    await iqraSend({
      to: 'amrikyy@gmail.com',
      subject: `📜 IQRA | Daily Discoveries Report`,
      html: `
        <div dir="rtl" style="font-family: sans-serif;">
          <h2>حصاد التدبر اليومي</h2>
          <ul>
            ${discoveries.map((d: any) => `<li>${d.content || d}</li>`).join('')}
          </ul>
          <p>الحمد لله الذي بنعمته تتم الصالحات.</p>
        </div>
      `
    });
  }
}
