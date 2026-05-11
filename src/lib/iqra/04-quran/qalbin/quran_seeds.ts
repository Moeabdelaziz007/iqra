/**
 * بسم الله الرحمن الرحيم
 * 🌙 Quranic Seed Registry (QQS) — سجل البذور القرآنية
 * 
 * WHY: To fit the entire Quran into a tiny footprint while remaining AI-executable,
 * we represent verses as "Interaction Net Fragments" with 7-node fractal topologies.
 * 
 * TESLA 369: Each node is linked to the 369 pulse via (Surah + Ayah) % 369.
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

/**
 * Calculates the Tesla Number for a seed.
 * Logic: (Surah + Ayah) % 369
 */
const getTesla = (s: number, a: number) => (s + a) % 369;

export const QURAN_SEEDS: Record<string, QuranSeed> = {
  // --- CORE SEEDS ---
  
  "1:1": {
    surah: 1,
    ayah: 1,
    text: "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ",
    teslaNumber: getTesla(1, 1),
    topology: (vm) => {
      // Bismillah: 1 Core + 6 Attributes (7-node fractal)
      const core = vm.spawn('ALIF', Modality.IKHLAS);
      for (let i = 0; i < 6; i++) {
        const attr = vm.spawn(i % 2 === 0 ? 'RA' : 'MEEM', Modality.RAHMA);
        vm.link(core, (i % 2) + 1, attr, 1);
      }
      return core;
    }
  },

  "112:1": {
    surah: 112,
    ayah: 1,
    text: "قُلْ هُوَ اللَّهُ أَحَدٌ",
    teslaNumber: getTesla(112, 1),
    topology: (vm) => {
      // Ahad: Pure Singularity (1 center + 6 satellite singularities = 7 nodes)
      const center = vm.spawn('ALIF', Modality.IKHLAS);
      for (let i = 0; i < 6; i++) {
        const node = vm.spawn('ALIF', Modality.IKHLAS);
        vm.link(center, 1, node, 1);
        vm.link(center, 2, node, 2);
      }
      return center;
    }
  },

  // --- SURAH YA-SIN (36): THE HEART ---
  "36:1": {
    surah: 36,
    ayah: 1,
    text: "يسٓ",
    teslaNumber: getTesla(36, 1),
    topology: (vm) => {
      const core = vm.spawn('YA', Modality.HAYAT);
      const v1 = vm.spawn('SIN', Modality.HIKMA);
      const v2 = vm.spawn('SIN', Modality.HIKMA);
      vm.link(core, 1, v1, 1);
      vm.link(core, 2, v2, 1);
      for (let i = 0; i < 4; i++) {
        const leaf = vm.spawn('LAM', Modality.HAYAT);
        vm.link(i < 2 ? v1 : v2, 2, leaf, 1);
      }
      return core;
    }
  },

  "36:2": {
    surah: 36,
    ayah: 2,
    text: "وَٱلۡقُرۡءَانِ ٱلۡحَكِيمِ",
    teslaNumber: getTesla(36, 2),
    topology: (vm) => {
      const core = vm.spawn('QAF', Modality.HIKMA);
      for (let i = 0; i < 6; i++) {
        const node = vm.spawn('RA', Modality.HIKMA);
        vm.link(core, (i % 2) + 1, node, 1);
      }
      return core;
    }
  },

  "36:12": {
    surah: 36,
    ayah: 12,
    text: "إِنَّا نَحۡنُ نُحۡيِ ٱلۡمَوۡتَىٰ وَنَكۡتُبُ مَا قَدَّمُواْ وَءَاثَٰرَهُمۡۚ وَكُلَّ شَيۡءٍ أَحۡصَيۡنَٰهُ فِيٓ إِمَامٖ مُّبِينٖ",
    teslaNumber: getTesla(36, 12),
    topology: (vm) => {
      // The Record: 1 Registry + 6 Data Pillars
      const registry = vm.spawn('ALIF', Modality.AMAN);
      for (let i = 0; i < 6; i++) {
        const pillar = vm.spawn('MEEM', Modality.ADL);
        vm.link(registry, 1, pillar, 1);
      }
      return registry;
    }
  },

  "18:1": { // Al-Kahf: The Cave (Security)
    surah: 18,
    ayah: 1,
    text: "الْحَمْدُ لِلَّهِ الَّذِي أَنْزَلَ عَلَىٰ عَبْدِهِ الْكِتَابَ",
    teslaNumber: getTesla(18, 1),
    topology: (vm) => {
      // 1 Shield (AMAN) + 6 Defensive Gates (Quantum-Protection)
      const center = vm.spawn('ALIF', Modality.AMAN);
      for (let i = 0; i < 6; i++) {
        const gate = vm.spawn('LAM', Modality.AMAN);
        vm.link(center, (i % 2) + 1, gate, 1);
      }
      return center;
    }
  },

  "55:1": { // Ar-Rahman: Symmetrical Mercy
    surah: 55,
    ayah: 1,
    text: "الرَّحْمَٰنُ",
    teslaNumber: getTesla(55, 1),
    topology: (vm) => {
      // 1 Nucleus (RAHMA) + 6 Mirror Nodes (Symmetry-Algo)
      const nucleus = vm.spawn('RA', Modality.RAHMA);
      for (let i = 0; i < 6; i++) {
        const atom = vm.spawn('MEEM', Modality.RAHMA);
        vm.link(nucleus, 1, atom, 1);
        vm.link(nucleus, 2, atom, 2); // Double Link for Quantum Resonance
      }
      return nucleus;
    }
  },

  "56:1": { // Al-Waqiah: Deterministic Event
    surah: 56,
    ayah: 1,
    text: "إِذَا وَقَعَتِ الْوَاقِعَةُ",
    teslaNumber: getTesla(56, 1),
    topology: (vm) => {
      // 1 Root (ADL) + 2 Branches + 4 Leaves (Decision Tree Topology)
      const root = vm.spawn('WAW', Modality.ADL);
      const b1 = vm.spawn('QAF', Modality.ADL);
      const b2 = vm.spawn('QAF', Modality.ADL);
      vm.link(root, 1, b1, 1);
      vm.link(root, 2, b2, 1);
      for (let i = 0; i < 4; i++) {
        const leaf = vm.spawn('LAM', Modality.ADL);
        vm.link(i < 2 ? b1 : b2, 2, leaf, 1);
      }
      return root;
    }
  },

  "67:1": { // Al-Mulk: Sovereign Dominion
    surah: 67,
    ayah: 1,
    text: "تَبَارَكَ الَّذِي بِيَدِهِ الْمُلْكُ",
    teslaNumber: getTesla(67, 1),
    topology: (vm) => {
      // 1 Sovereign + 2 Controllers + 4 Pillars (Turbo-Mulk)
      const king = vm.spawn('MEEM', Modality.AMAN);
      const c1 = vm.spawn('LAM', Modality.ADL);
      const c2 = vm.spawn('LAM', Modality.AMAN);
      vm.link(king, 1, c1, 1);
      vm.link(king, 2, c2, 1);
      for (let i = 0; i < 4; i++) {
        const pillar = vm.spawn('KAF', Modality.ADL);
        vm.link(i < 2 ? c1 : c2, 2, pillar, 1);
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
  
  if (c.includes("mercy") || c.includes("rahman") || c.includes("balance") || c.includes("gift")) return QURAN_SEEDS["55:1"];
  if (c.includes("protect") || c.includes("trial") || c.includes("security") || c.includes("guard")) return QURAN_SEEDS["18:1"];
  if (c.includes("heart") || c.includes("experience") || c.includes("memory") || c.includes("replay")) return QURAN_SEEDS["36:1"];
  if (c.includes("outcome") || c.includes("result") || c.includes("end") || c.includes("event")) return QURAN_SEEDS["56:1"];
  if (c.includes("sovereign") || c.includes("power") || c.includes("control") || c.includes("dominion")) return QURAN_SEEDS["67:1"];
  if (c.includes("record") || c.includes("write") || c.includes("trace") || c.includes("history")) return QURAN_SEEDS["36:12"];
  if (c.includes("opening") || c.includes("start") || c.includes("begin") || c.includes("bismillah")) return QURAN_SEEDS["1:1"];

  return QURAN_SEEDS["112:1"]; // Default to Unity (Ahad)
}
