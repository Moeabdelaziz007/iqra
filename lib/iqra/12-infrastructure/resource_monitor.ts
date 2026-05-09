/**
 * Resource Monitor — مراقب الموارد
 * 
 * Monitors system resources during autonomous evolution.
 */

import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';

function monitor() {
  const logPath = path.join(process.cwd(), 'iqra-core', 'RESOURCE_MONITOR.md');
  if (!fs.existsSync(logPath)) {
    fs.writeFileSync(logPath, "# 📊 IQRA RESOURCE MONITOR\n\n| Time | CPU Load | Free RAM (GB) | Status |\n| :--- | :--- | :--- | :--- |\n");
  }

  const interval = setInterval(() => {
    const time = new Date().toLocaleTimeString();
    const cpu = os.loadavg()[0].toFixed(2);
    const ram = (os.freemem() / 1024 / 1024 / 1024).toFixed(2);
    const status = os.loadavg()[0] > 5 ? '⚠️ High Load' : '✅ Healthy';

    fs.appendFileSync(logPath, `| ${time} | ${cpu} | ${ram} | ${status} |\n`);
  }, 30000); // Every 30s

  // Stop after 20 mins
  setTimeout(() => {
    clearInterval(interval);
    console.log("Monitor stopped.");
  }, 20 * 60 * 1000);
}

monitor();
