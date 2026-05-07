import { MissionHandoff } from './contracts';

export const validateHandoff = (handoff: MissionHandoff): boolean => {
  return !!(
    handoff.mission_id &&
    handoff.from_worker &&
    handoff.to_worker &&
    Array.isArray(handoff.artifacts)
  );
};
