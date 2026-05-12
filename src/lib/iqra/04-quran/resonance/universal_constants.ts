import { Qalbin_VM } from '#quran/qalbin/qalbin_vm'
import { Modality, type QalbinKind } from '#quran/qalbin/qalbin_node'

/**
 * ⚛️ IQRA | Universal Resonance Registry
 * 
 * Mapping Physical and Mathematical constants to Qalbin Topologies.
 * This represents the "Signs in the Horizons" (آيات الآفاق).
 */

export interface ResonanceSeed {
  key: string;
  name: string;
  category: 'Physics' | 'Math' | 'Geometry';
  value: number;
  teslaNumber: number; 
  topology: (vm: Qalbin_VM) => number;
}

export const UNIVERSAL_SEEDS: Record<string, ResonanceSeed> = {
  "PHI": {
    key: "PHI",
    name: "The Golden Ratio",
    category: "Math",
    value: 1.6180339887,
    teslaNumber: 6,
    topology: (vm: Qalbin_VM) => {
      // Mapping Growth to ALIF (The One/Growth) and Modality HIKMA (Wisdom)
      const root = vm.spawn('ALIF' as QalbinKind, Modality.HIKMA, { value: 1.618 });
      const node1 = vm.spawn('LAM' as QalbinKind, Modality.MIZAN, { value: 1 });
      const node2 = vm.spawn('MIM' as QalbinKind, Modality.MIZAN, { value: 0.618 });
      vm.link(root, 1, node1, 1);
      vm.link(node1, 1, node2, 1);
      return root;
    }
  },
  "PI": {
    key: "PI",
    name: "Archimedes' Constant",
    category: "Math",
    value: 3.1415926535,
    teslaNumber: 3,
    topology: (vm: Qalbin_VM) => {
      const root = vm.spawn('SIN' as QalbinKind, Modality.HIKMA, { value: 3.1415 });
      const circle = vm.spawn('SIN' as QalbinKind, Modality.MIZAN, { value: 1 });
      vm.link(root, 0, circle, 0); 
      return root;
    }
  },
  "PLANCK": {
    key: "PLANCK",
    name: "Planck Constant",
    category: "Physics",
    value: 6.62607015e-34,
    teslaNumber: 9,
    topology: (vm: Qalbin_VM) => {
      const root = vm.spawn('QAF' as QalbinKind, Modality.HIDAYA, { value: 6.626 });
      const quant = vm.spawn('KAF' as QalbinKind, Modality.ADL, { value: 1 });
      vm.link(root, 1, quant, 1);
      return root;
    }
  },
  "C": {
    key: "C",
    name: "Speed of Light",
    category: "Physics",
    value: 299792458,
    teslaNumber: 9,
    topology: (vm: Qalbin_VM) => {
      const root = vm.spawn('YA' as QalbinKind, Modality.HIDAYA, { value: 2.997 });
      const limit = vm.spawn('SIN' as QalbinKind, Modality.ADL, { value: 1 });
      vm.link(root, 1, limit, 1);
      return root;
    }
  }
};
