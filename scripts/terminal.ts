import readline from 'readline';
import { AgentCore } from '../lib/iqra/core';
import { IQRABrainMode } from '../lib/iqra/brain';
import { IQRACommands } from '../lib/iqra/commands';
import { IQRAFilter } from '../lib/iqra/filter';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: '⚖️ IQRA> '
});

async function main() {
  console.clear();
  console.log('\x1b[33m%s\x1b[0m', '🌙 IQRA SOVEREIGN TERMINAL');
  console.log('\x1b[32m%s\x1b[0m', 'اقْرَأْ بِاسْمِ رَبِّكَ الَّذِي خَلَقَ');
  console.log('\x1b[90m%s\x1b[0m', 'Type a question or command (e.g., /status, /help). Ctrl+C to exit.');
  console.log('');

  IQRAFilter.initialize();
  rl.prompt();

  rl.on('line', async (line) => {
    const input = line.trim();
    if (!input) {
      rl.prompt();
      return;
    }

    if (input.startsWith('/')) {
      const cmd = input.split(' ')[0];
      switch (cmd) {
        case '/status': console.log(IQRACommands.getStatus()); break;
        case '/sleep': console.log(IQRACommands.sleep()); break;
        case '/wake': console.log(IQRACommands.wake()); break;
        case '/reflect': console.log(IQRACommands.reflect()); break;
        case '/help':
          console.log(`
Available commands:
/status  - System health and Barakah index
/sleep   - Enter resource-saving mode
/wake    - Resume normal operations
/reflect - Latest insights from memory
/help    - Show this message
          `);
          break;
        case '/exit': process.exit(0);
        default: console.log('Unknown command. Try /help.');
      }
      rl.prompt();
      return;
    }

    // Process Natural Language
    console.log('\x1b[90m%s\x1b[0m', 'Reflecting...');

    try {
      const response = await AgentCore.execute(input, IQRABrainMode.FAST_RESPONSE, (pulse) => {
        if (pulse.status === 'IN_PROGRESS') {
          process.stdout.write(`\r\x1b[90m[${pulse.type}] ${pulse.message}\x1b[0m`);
        } else if (pulse.status === 'SUCCESS' || pulse.status === 'FAILED') {
          // Clear line
          process.stdout.write('\r' + ' '.repeat(process.stdout.columns || 80) + '\r');
        }
      });

      console.log('\n' + response + '\n');
    } catch (error: any) {
      console.error(`\n❌ Error: ${error.message}`);
    }

    rl.prompt();
  }).on('close', () => {
    console.log('\n🌙 IQRA Session Ended. Assalamu Alaikum.');
    process.exit(0);
  });
}

main().catch(console.error);
