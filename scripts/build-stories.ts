/**
 * Builds the static story content served from public/data/stories/.
 * Source: output/stories/*.json. Run with `npm run build:stories`.
 * The id is the file name, identical to the audio folder: progress is keyed on
 * it, so it must stay stable.
 */
import fs from 'fs';
import path from 'path';

const SOURCE_DIR = path.join('output', 'stories');
const MANIFEST_PATH = path.join('output', 'audio-manifest.json');
const TARGET_DIR = path.join('public', 'data', 'stories');

const LEVELS = ['A0', 'A1', 'A2', 'B1', 'B2'];

// Same grouping as THEMES in generate-stories.ts and generate-audio.py.
const THEMES_BY_CATEGORY: Record<string, string[]> = {
  quotidien: [
    'maison-et-vie-quotidienne',
    'courses-et-supermarche',
    'transport-et-deplacements',
    'meteo-et-saisons',
    'famille-et-relations',
  ],
  voyage: ['au-restaurant', 'a-l-hotel', 'urgences-et-securite', 'demander-son-chemin'],
  travail: [
    'reunion-professionnelle',
    'email-professionnel',
    'presentation-orale',
    'vocabulaire-data-et-informatique',
  ],
  sante: [
    'le-corps-humain',
    'affections-courantes',
    'a-la-pharmacie',
    'chez-le-medecin',
    'medicaments-et-posologie',
  ],
};

const CATEGORY_BY_THEME = new Map(
  Object.entries(THEMES_BY_CATEGORY).flatMap(([category, themes]) =>
    themes.map((theme): [string, string] => [theme, category])
  )
);

interface SourceSentence {
  sequence_order: number;
  text_target: string;
  phonetic?: string;
  text_native: string;
}

const manifest: Record<string, string> = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
const audioCountByStory = new Map<string, number>();
for (const key of Object.keys(manifest)) {
  const [kind, slug] = key.split('::');
  if (kind === 'story') audioCountByStory.set(slug, (audioCountByStory.get(slug) ?? 0) + 1);
}

fs.rmSync(TARGET_DIR, { recursive: true, force: true });
fs.mkdirSync(TARGET_DIR, { recursive: true });

const anomalies: string[] = [];
const index = [];
const sentenceCounts: Record<number, number> = {};
let totalSentences = 0;
let totalBytes = 0;

const write = (file: string, data: unknown) => {
  const json = JSON.stringify(data);
  fs.writeFileSync(path.join(TARGET_DIR, file), json);
  totalBytes += Buffer.byteLength(json);
};

for (const file of fs.readdirSync(SOURCE_DIR).filter((name) => name.endsWith('.json')).sort()) {
  const id = path.basename(file, '.json');
  const [languageCode, levelCode, ...themeParts] = id.split('-');
  const theme = themeParts.join('-');
  const language = languageCode.toUpperCase();
  const level = levelCode.toUpperCase();
  const category = CATEGORY_BY_THEME.get(theme);
  const source = JSON.parse(fs.readFileSync(path.join(SOURCE_DIR, file), 'utf8'));
  const sentences: SourceSentence[] = [...(source.sentences ?? [])].sort(
    (a, b) => a.sequence_order - b.sequence_order
  );

  if (!category) anomalies.push(`${id}: unknown theme "${theme}"`);
  if (!LEVELS.includes(level)) anomalies.push(`${id}: level ${level} outside StoryLevel`);
  if (language !== 'EN' && language !== 'ZH') anomalies.push(`${id}: unknown language ${language}`);
  if (sentences.length === 0) anomalies.push(`${id}: no sentences`);
  if (sentences.some((sentence, position) => sentence.sequence_order !== position + 1)) {
    anomalies.push(`${id}: sequence_order not contiguous`);
  }
  const audioCount = audioCountByStory.get(id) ?? 0;
  if (audioCount !== sentences.length) {
    anomalies.push(`${id}: ${sentences.length} sentences, ${audioCount} audio entries`);
  }

  const meta = {
    id,
    title: source.title,
    category: category ?? 'quotidien',
    level,
    language,
    sentence_count: sentences.length,
  };
  index.push(meta);
  totalSentences += sentences.length;
  sentenceCounts[sentences.length] = (sentenceCounts[sentences.length] ?? 0) + 1;

  write(`${id}.json`, {
    ...meta,
    sentences: sentences.map(({ sequence_order, text_target, phonetic, text_native }) => ({
      sequence_order,
      text_target,
      phonetic: phonetic ?? null,
      text_native,
    })),
  });
}

write('index.json', index);

console.log(`${index.length} stories, ${totalSentences} sentences, ${(totalBytes / 1024).toFixed(0)} KiB written`);
console.log('Stories by sentence count:', sentenceCounts);
console.log(anomalies.length ? `Anomalies:\n${anomalies.join('\n')}` : 'No anomalies.');
