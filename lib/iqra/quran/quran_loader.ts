/**
 * Load Quran data from free API
 * No copyright issues — eternal text
 */

export async function fetchAyah(surah: number, ayah: number) {
  // Arabic text
  const arabic = await fetch(
    `https://api.alquran.cloud/v1/ayah/${surah}:${ayah}/ar.asem`
  );
  
  // English translation
  const english = await fetch(
    `https://api.alquran.cloud/v1/ayah/${surah}:${ayah}/en.asad`
  );
  
  const arData = await arabic.json();
  const enData = await english.json();

  return {
    reference: `${surah}:${ayah}`,
    arabic: arData.data.text,
    english: enData.data.text,
  };
}

export async function fetchSurah(surahNumber: number) {
  const res = await fetch(
    `https://api.alquran.cloud/v1/surah/${surahNumber}/editions/ar.asem,en.asad`
  );
  const json = await res.json();
  return json.data; // This returns an array: [arabicSurah, englishSurah]
}
