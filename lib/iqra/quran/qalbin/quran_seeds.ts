/**
 * 🌙 Quranic Seed Registry (QQS) — سجل البذور القرآنية
 * 
 * WHY: To fit the entire Quran into a tiny footprint while remaining AI-executable,
 * we represent verses as "Interaction Net Fragments".
 */

import { Qalbin_VM } from './qalbin_vm';
import { Modality } from './qalbin_node';

export interface QuranSeed {
  surah: number;
  ayah: number;
  text: string;
  teslaNumber: number; // (surah + ayah) % 369
  topology: (vm: Qalbin_VM) => number; // Returns the entry node ID
}

export const QURAN_SEEDS: Record<string, QuranSeed> = {
  "1:1": {
    surah: 1,
    ayah: 1,
    text: "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ",
    teslaNumber: (1 + 1) % 369,
    topology: (vm) => {
      // Representation of "Bismillah": Alif (Unity) linked to Rahma (Mercy)
      const bismillah = vm.spawn('ALIF', Modality.IKHLAS);
      const mercy = vm.spawn('LAM', Modality.RAHMA);
      vm.link(bismillah, 1, mercy, 1);
      return bismillah;
    }
  },
  "112:1": {
    surah: 112,
    ayah: 1,
    text: "قُلْ هُوَ اللَّهُ أَحَدٌ",
    teslaNumber: (112 + 1) % 369,
    topology: (vm) => {
      // Representation of "Ahad": Pure Alif (Singularity)
      return vm.spawn('ALIF', Modality.IKHLAS);
    }
  },
  "36:1": {
    surah: 36,
    ayah: 1,
    text: "يس",
    teslaNumber: (36 + 1) % 369,
    topology: (vm) => {
      // Yasin: Heart of the Quran (7-node fractal)
      const core = vm.spawn('YA', Modality.HAYAT);
      const wisdom = vm.spawn('SIN', Modality.HIKMA);
      vm.link(core, 1, wisdom, 1);
      
      // 5 ancillary nodes representing the "Pulse of Life"
      for (let i = 0; i < 5; i++) {
        const pulseNode = vm.spawn('LAM', Modality.HAYAT);
        vm.link(wisdom, 2, pulseNode, 1);
      }
      return core;
    }
  },
  "18:1": {
    surah: 18,
    ayah: 1,
    text: "الْحَمْدُ لِلَّهِ الَّذِي أَنْزَلَ عَلَىٰ عَبْدِهِ الْكِتَابَ",
    teslaNumber: (18 + 1) % 369,
    topology: (vm) => {
      // Al-Kahf: The Cave (7-node security perimeter)
      const center = vm.spawn('ALIF', Modality.AMAN);
      let prev = center;
      for (let i = 0; i < 6; i++) {
        const wall = vm.spawn('LAM', Modality.AMAN);
        vm.link(prev, 2, wall, 1);
        prev = wall;
      }
      return center;
    }
  },
  "55:1": {
    surah: 55,
    ayah: 1,
    text: "الرَّحْمَٰنُ",
    teslaNumber: (55 + 1) % 369,
    topology: (vm) => {
      // Ar-Rahman: Infinite Balance (7-node harmonic star)
      const center = vm.spawn('RA', Modality.RAHMA);
      for (let i = 0; i < 6; i++) {
        const ray = vm.spawn('MEEM', Modality.RAHMA);
        vm.link(center, (i % 2) + 1, ray, 1);
      }
      return center;
    }
  },
  "56:1": {
    surah: 56,
    ayah: 1,
    text: "إِذَا وَقَعَتِ الْوَاقِعَةُ",
    teslaNumber: (56 + 1) % 369,
    topology: (vm) => {
      // Al-Waqiah: The Event (7-node classification tree)
      const root = vm.spawn('WAW', Modality.ADL);
      const left = vm.spawn('QAF', Modality.ADL);
      const right = vm.spawn('QAF', Modality.ADL);
      vm.link(root, 1, left, 1);
      vm.link(root, 2, right, 1);
      // ... further branching to reach 7 nodes
      for (let i = 0; i < 4; i++) {
        vm.spawn('LAM', Modality.ADL);
      }
      return root;
    }
  },
  "67:1": {
    surah: 67,
    ayah: 1,
    text: "تَبَارَكَ الَّذِي بِيَدِهِ الْمُلْكُ",
    teslaNumber: (67 + 1) % 369,
    topology: (vm) => {
      // Al-Mulk: Sovereign Dominion (7-node hierarchy)
      const king = vm.spawn('MEEM', Modality.AMAN);
      for (let i = 0; i < 6; i++) {
        const subject = vm.spawn('LAM', Modality.ADL);
        vm.link(king, (i % 2) + 1, subject, 1);
      }
      return king;
    }
  }
};

/**
 * Finding the closest Truth Anchor for a given context.
 * WHY: This allows the agent to "ground" its actions in the most relevant Quranic principle.
 */
export function findSeed(context: string): QuranSeed {
  const c = context.toLowerCase();
  
  if (c.includes("mercy") || c.includes("rahman") || c.includes("balance")) return QURAN_SEEDS["55:1"];
  if (c.includes("protect") || c.includes("trial") || c.includes("cave") || c.includes("security")) return QURAN_SEEDS["18:1"];
  if (c.includes("heart") || c.includes("experience") || c.includes("past") || c.includes("replay")) return QURAN_SEEDS["36:1"];
  if (c.includes("outcome") || c.includes("result") || c.includes("classification")) return QURAN_SEEDS["56:1"];
  if (c.includes("sovereign") || c.includes("power") || c.includes("rule") || c.includes("control")) return QURAN_SEEDS["67:1"];
  if (c.includes("opening") || c.includes("start") || c.includes("begin")) return QURAN_SEEDS["1:1"];

  return QURAN_SEEDS["112:1"]; // Default to Unity (Ahad)
}
