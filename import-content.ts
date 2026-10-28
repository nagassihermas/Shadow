/**
 * Script d'importation des blocs JSON générés dans /output/content vers le jeu de données local.
 *
 * Usage :
 *   npx tsx import-content.ts
 */

import * as fs from 'fs';
import * as path from 'path';

const CONTENT_DIR = path.join(__dirname, 'output', 'content');
const MOCK_DATA_FILE = path.join(__dirname, 'lib', 'mock-data.ts');

interface RawPhraseItem {
  text_target: string;
  phonetic?: string;
  text_native: string;
  language: 'EN' | 'ZH';
  category: string;
  level: string;
}

function main() {
  if (!fs.existsSync(CONTENT_DIR)) {
    console.log(`Le dossier ${CONTENT_DIR} n'existe pas encore. Lancez d'abord : npm run generate`);
    return;
  }

  const files = fs.readdirSync(CONTENT_DIR).filter((f) => f.endsWith('.json'));
  console.log(`Trouvé ${files.length} fichiers JSON dans /output/content.`);

  if (files.length === 0) {
    console.log('Aucun fichier à importer.');
    return;
  }

  let totalPhrases = 0;
  for (const file of files) {
    const filePath = path.join(CONTENT_DIR, file);
    try {
      const content = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as RawPhraseItem[];
      console.log(`  ✓ ${file} : ${content.length} phrases`);
      totalPhrases += content.length;
    } catch (err) {
      console.error(`  ✗ Erreur de lecture sur ${file}:`, err);
    }
  }

  console.log(`Total : ${totalPhrases} phrases prêtes à être exploitées.`);
}

main();
