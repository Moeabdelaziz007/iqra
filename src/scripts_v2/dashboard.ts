/**
 * 🕋 IQRA Sovereign Dashboard | لوحة التحكم السيادية
 * 
 * عرض حي لنبضات "الرنين الطوبولوجي" وحالة المراقبة عبر قراءة الذاكرة السيادية.
 * E2E Working Code - No Mocks.
 * 
 * Usage: npx tsx scripts/dashboard.ts
 */

// `blessed` is loaded lazily so this script can be type-checked in slim
// environments where the TUI dependency is intentionally absent.
const blessed: any = await import('blessed' as any).then((m: any) => m.default ?? m).catch(() => {
  console.warn('⚠️ [DASHBOARD] `blessed` not installed; dashboard will not render.');
  process.exit(0);
});
import * as fs from 'fs';
import * as path from 'path';

const screen = blessed.screen({
    smartCSR: true,
    title: 'IQRA Sovereign Identity Core'
});

const header = blessed.box({
    top: 0, left: 'center', width: '100%', height: 3,
    content: '{center}{bold}🕋 IQRA | "اقْرَأْ بِاسْمِ رَبِّكَ الَّذِي خَلَقَ"{/bold}{/center}',
    tags: true,
    style: { fg: 'white', bg: 'blue' }
});

const muraqabahLog = blessed.log({
    top: 3, left: 0, width: '50%', height: '80%',
    label: ' 🛡️ MURĀQABAH (TrustChain) ',
    border: { type: 'line' },
    style: { border: { fg: 'cyan' }, fg: 'green' }
});

const resonanceLog = blessed.log({
    top: 3, left: '50%', width: '50%', height: '80%',
    label: ' 🌀 Topological Resonance Pulses ',
    border: { type: 'line' },
    style: { border: { fg: 'magenta' }, fg: 'yellow' }
});

const statusBox = blessed.box({
    top: '83%', left: 0, width: '100%', height: 'shrink',
    label: ' System Evolution Status ',
    content: 'Loading Sovereign State...',
    border: { type: 'line' },
    style: { border: { fg: 'gray' }, fg: 'white' }
});

screen.append(header);
screen.append(muraqabahLog);
screen.append(resonanceLog);
screen.append(statusBox);

const memoryPath = path.join(process.cwd(), '.iqra', 'memory.json');
let lastReadEntryId = '';

function pulseSovereignState() {
    try {
        if (fs.existsSync(memoryPath)) {
            const mem = JSON.parse(fs.readFileSync(memoryPath, 'utf8'));
            const curiosity = (mem.curiosity_score || 0).toFixed(4);
            statusBox.setContent(` Curiosity Score: ${curiosity} | Connection: Stable (Reading Local Node)`);

            if (mem.quantum_entries) {
                const keys = Object.keys(mem.quantum_entries);
                if (keys.length > 0) {
                    const latestKey = keys[keys.length - 1];
                    if (latestKey !== lastReadEntryId) {
                        const entry = mem.quantum_entries[latestKey];
                        resonanceLog.log(`{bold}💎 RESONANCE ENTANGLED{/bold} -> Concept: ${entry.coordinates?.concept || 'Unknown'}`);
                        lastReadEntryId = latestKey;
                    }
                }
            }
        }
    } catch (e) { }
    screen.render();
}

setInterval(pulseSovereignState, 2000);
screen.key(['escape', 'q', 'C-c'], () => process.exit(0));
pulseSovereignState();