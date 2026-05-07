import type { WorkerReport } from './contracts';

export const validateReport = (report: WorkerReport): boolean => {
  return !!(
    report.mission_id &&
    report.worker_id &&
    Array.isArray(report.implemented) &&
    Array.isArray(report.commands_run)
  );
};
