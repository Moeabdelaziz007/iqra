/**
 * scripts/ingest_quran_local.ts
 * 
 * تجهيز الجيش: بناء قاعدة بيانات القرآن المحلية
 * Prepare the Army: Build the local Quran database
 * 
 * Built with Moe Abdelaziz — Made with Soul
 */

import Database from 'better-sqlite3';
import * as fs from 'fs';
import * as path from 'path';

const DB_PATH = path.join(process.cwd(), 'iqra-core', 'data', 'quran_local.db');

async function main() {
    console.log('\n╔══════════════════════════════════════════╗');
    console.log('║   🛡️ IQRA Army Ingestion (Local SQL)    ║');
    console.log('║   "إِنَّا نَحْنُ نَزَّلْنَا الذِّكْرَ..."    ║');
    console.log('╚══════════════════════════════════════════╝\n');

    // Ensure directory exists
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) {
        console.log(`📁 Creating directory: ${dir}`);
        fs.mkdirSync(dir, { recursive: true });
    }

    const db = new Database(DB_PATH);
    console.log(`🗄️ Database connected at ${DB_PATH}`);

    // Create schema
    db.exec(`
        CREATE TABLE IF NOT EXISTS ayat (
            id          TEXT PRIMARY KEY,  -- "1:1"
            surah       INTEGER NOT NULL,
            ayah        INTEGER NOT NULL,
            arabic      TEXT NOT NULL,
            english     TEXT NOT NULL,
            juz         INTEGER,
            page        INTEGER,
            source      TEXT DEFAULT 'api.quran.com',
            verified    INTEGER DEFAULT 1,
            created_at  INTEGER DEFAULT (strftime('%s', 'now'))
        );

        CREATE INDEX IF NOT EXISTS idx_ayat_surah ON ayat(surah);
    `);

    console.log('📋 Schema validated.');

    const ayatToInsert: any[] = [];

    try {
        console.log('📥 Fetching foundational ayat from Quran.com...');
        // We'll fetch Surah 1 (Al-Fatiha) and Surah 112-114 (Protective surahs)
        const surahs = [1, 112, 113, 114]; 
        for (const surah of surahs) {
            process.stdout.write(`  Surah ${surah}... `);
            const arRes = await fetch(`https://api.quran.com/api/v4/quran/verses/uthmani?chapter_number=${surah}`);
            const arData = await arRes.json() as any;
            
            const enRes = await fetch(`https://api.quran.com/api/v4/verses/by_chapter/${surah}?translations=131&fields=juz_number,page_number`);
            const enData = await enRes.json() as any;

            for (let i = 0; i < arData.verses.length; i++) {
                const ar = arData.verses[i];
                const en = enData.verses[i];
                ayatToInsert.push({
                    id: `${surah}:${i+1}`,
                    surah,
                    ayah: i + 1,
                    arabic: ar.text_uthmani,
                    english: en?.translations?.[0]?.text ?? '',
                    juz: en?.juz_number ?? 0,
                    page: en?.page_number ?? 0
                });
            }
            console.log('Done.');
        }
    } catch (e) {
        console.log('\n⚠️ Network reachability issue. Using emergency seeds.');
        ayatToInsert.push({
            id: '1:1', surah: 1, ayah: 1, 
            arabic: 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ', 
            english: 'In the name of Allah, the Entirely Merciful, the Especially Merciful.',
            juz: 1, page: 1
        });
        ayatToInsert.push({
            id: '1:2', surah: 1, ayah: 2, 
            arabic: 'الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ', 
            english: ' [All] praise is [due] to Allah, Lord of the worlds -',
            juz: 1, page: 1
        });
    }

    const insert = db.prepare(`
        INSERT OR REPLACE INTO ayat (id, surah, ayah, arabic, english, juz, page)
        VALUES (@id, @surah, @ayah, @arabic, @english, @juz, @page)
    `);

    const insertMany = db.transaction((ayat) => {
        for (const a of ayat) insert.run(a);
    });

    insertMany(ayatToInsert);

    console.log(`\n⚔️ Army ready! ${ayatToInsert.length} ayat stationed in the local fortress.`);
    db.close();
}

main().catch(error => {
    console.error('❌ Critical Failure in Army Preparation:', error);
    process.exit(1);
});
