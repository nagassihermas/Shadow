/**
 * Script de conversion et d'intégration des 36 blocs générés dans lib/mock-data.ts
 *
 * Usage :
 *   npx tsx seed-from-content.ts
 */

import * as fs from 'fs';
import * as path from 'path';

const CONTENT_DIR = path.join(__dirname, 'output', 'content');
const STORIES_DIR = path.join(__dirname, 'output', 'stories');
const MOCK_DATA_FILE = path.join(__dirname, 'lib', 'mock-data.ts');

const THEME_TITLES: Record<string, string> = {
  'maison-et-vie-quotidienne': 'Maison et vie quotidienne',
  'courses-et-supermarche': 'Courses et supermarché',
  'transport-et-deplacements': 'Transport et déplacements',
  'meteo-et-saisons': 'Météo et saisons',
  'famille-et-relations': 'Famille et relations',
  'au-restaurant': 'Au restaurant',
  'a-l-hotel': "À l'hôtel",
  'urgences-et-securite': 'Urgences et sécurité',
  'demander-son-chemin': 'Demander son chemin',
  'reunion-professionnelle': 'Réunion professionnelle',
  'email-professionnel': 'Email professionnel',
  'presentation-orale': 'Présentation orale',
  'vocabulaire-data-et-informatique': 'Vocabulaire data et informatique',
  'le-corps-humain': 'Le corps humain',
  'affections-courantes': 'Affections courantes',
  'a-la-pharmacie': 'À la pharmacie',
  'chez-le-medecin': 'Chez le médecin',
  'medicaments-et-posologie': 'Médicaments et posologie',
};

const CATEGORY_MAP: Record<string, string> = {
  quotidien: 'Vie Quotidienne',
  voyage: 'Voyage & Mobilité',
  travail: 'Monde Professionnel',
  sante: 'Santé & Bien-être',
};

interface PhraseItem {
  text_target: string;
  phonetic?: string;
  text_native: string;
  language: 'EN' | 'ZH';
  category: string;
  level: 'A1' | 'A2' | 'B1' | 'B2';
}

function generateMockData() {
  const files = fs.readdirSync(CONTENT_DIR).filter((f) => f.endsWith('.json'));

  const blocks: any[] = [];
  const phrases: any[] = [];

  let blockCounter = 1;
  let phraseCounter = 1;

  for (const file of files) {
    const filePath = path.join(CONTENT_DIR, file);
    const content = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as PhraseItem[];

    const isEn = file.startsWith('en-');
    const lang = isEn ? 'EN' : 'ZH';
    const slug = file.replace(/^(en|zh)-/, '').replace(/\.json$/, '');
    const title = THEME_TITLES[slug] || slug.replace(/-/g, ' ');
    const rawCategory = content[0]?.category || 'quotidien';
    const category = CATEGORY_MAP[rawCategory] || 'Général';
    const level = content[0]?.level || 'A1';

    const blockId = `block-${lang.toLowerCase()}-${blockCounter++}`;

    blocks.push({
      id: blockId,
      title,
      category,
      level,
      language: lang,
      is_custom: false,
      created_at: new Date().toISOString(),
      phrase_count: content.length,
      mastered_count: 0,
    });

    content.forEach((item, idx) => {
      phrases.push({
        id: `phrase-${lang.toLowerCase()}-${phraseCounter++}`,
        block_id: blockId,
        text_target: item.text_target,
        phonetic: item.phonetic || null,
        text_native: item.text_native,
        star_rating: null,
        fsrs_state: null,
        mastery_status: 'NEW',
        created_at: new Date().toISOString(),
      });
    });
  }

  // Traitement des histoires (output/stories/*.json) si disponibles
  const stories: any[] = [];
  const storySentences: any[] = [];

  let storyCounter = 1;
  let storySentenceCounter = 1;

  if (fs.existsSync(STORIES_DIR)) {
    const storyFiles = fs.readdirSync(STORIES_DIR).filter((f) => f.endsWith('.json'));
    for (const file of storyFiles) {
      const filePath = path.join(STORIES_DIR, file);
      try {
        const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        const match = file.match(/^(en|zh)-(a0|a1|a2|b1|b2)-(.*)\.json$/i);
        if (!match) continue;

        const lang = match[1].toUpperCase() as 'EN' | 'ZH';
        const level = match[2].toUpperCase();
        const slug = match[3];
        const title = content.title || THEME_TITLES[slug] || slug.replace(/-/g, ' ');
        const storyId = `story-${lang.toLowerCase()}-${storyCounter++}`;

        const categoryKey = Object.keys(CATEGORY_MAP).find((k) => slug.includes(k)) || 'quotidien';
        const category = CATEGORY_MAP[categoryKey] || 'Vie Quotidienne';

        stories.push({
          id: storyId,
          title,
          category,
          level,
          language: lang,
          star_rating: null,
          fsrs_state: null,
          mastery_status: 'NEW',
          is_custom: false,
          user_id: null,
          created_at: new Date().toISOString(),
          sentence_count: content.sentences?.length || 0,
        });

        if (Array.isArray(content.sentences)) {
          content.sentences.forEach((sent: any) => {
            storySentences.push({
              id: `story-sent-${lang.toLowerCase()}-${storySentenceCounter++}`,
              story_id: storyId,
              sequence_order: sent.sequence_order,
              text_target: sent.text_target,
              phonetic: sent.phonetic || null,
              text_native: sent.text_native,
              audio_url: null,
              created_at: new Date().toISOString(),
            });
          });
        }
      } catch (err) {
        console.error(`Erreur lecture histoire ${file}:`, err);
      }
    }
  }

  const sampleStories = [
    {
      id: 'story-en-1',
      title: 'A Morning Coffee in London',
      category: 'Vie Quotidienne',
      level: 'A1',
      language: 'EN',
      star_rating: null,
      fsrs_state: null,
      mastery_status: 'NEW',
      is_custom: false,
      user_id: null,
      created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
      sentence_count: 5,
    },
    {
      id: 'story-zh-1',
      title: '王朋的周末 (Le week-end de Wang Peng)',
      category: 'Vie Quotidienne',
      level: 'A1',
      language: 'ZH',
      star_rating: null,
      fsrs_state: null,
      mastery_status: 'NEW',
      is_custom: false,
      user_id: null,
      created_at: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
      sentence_count: 5,
    },
  ];

  const sampleSentences = [
    {
      id: 'story-sent-en-1-1',
      story_id: 'story-en-1',
      sequence_order: 1,
      text_target: 'It is eight o’clock in the morning, and the streets are quiet.',
      phonetic: '/ɪt ɪz eɪt əˈklɒk ɪn ðə ˈmɔːnɪŋ ænd ðə striːts ɑː ˈkwaɪət/',
      text_native: 'Il est huit heures du matin et les rues sont calmes.',
      audio_url: null,
      created_at: new Date().toISOString(),
    },
    {
      id: 'story-sent-en-1-2',
      story_id: 'story-en-1',
      sequence_order: 2,
      text_target: 'I walk slowly to my favourite coffee shop near the park.',
      phonetic: '/aɪ wɔːk ˈsləʊli tuː maɪ ˈfeɪvərɪt ˈkɒfi ʃɒp nɪə ðə pɑːk/',
      text_native: 'Je marche lentement vers mon café préféré près du parc.',
      audio_url: null,
      created_at: new Date().toISOString(),
    },
    {
      id: 'story-sent-en-1-3',
      story_id: 'story-en-1',
      sequence_order: 3,
      text_target: 'The barista greets me with a warm smile.',
      phonetic: '/ðə bəˈrɪstə ɡriːts miː wɪð ə wɔːm smaɪl/',
      text_native: 'Le barista m’accueille avec un sourire chaleureux.',
      audio_url: null,
      created_at: new Date().toISOString(),
    },
    {
      id: 'story-sent-en-1-4',
      story_id: 'story-en-1',
      sequence_order: 4,
      text_target: 'I order a hot cappuccino and a fresh croissant.',
      phonetic: '/aɪ ˈɔːdər ə hɒt ˌkæpʊˈtʃiːnəʊ ænd ə freʃ ˈkrwʌsɒ̃/',
      text_native: 'Je commande un cappuccino chaud et un croissant frais.',
      audio_url: null,
      created_at: new Date().toISOString(),
    },
    {
      id: 'story-sent-en-1-5',
      story_id: 'story-en-1',
      sequence_order: 5,
      text_target: 'Sitting by the window, I enjoy the peaceful start to the day.',
      phonetic: '/ˈsɪtɪŋ baɪ ðə ˈwɪndəʊ aɪ ɪnˈdʒɔɪ ðə ˈpiːsfʊl stɑːt tuː ðə deɪ/',
      text_native: 'Assis près de la fenêtre, je savoure ce début de journée paisible.',
      audio_url: null,
      created_at: new Date().toISOString(),
    },
    {
      id: 'story-sent-zh-1-1',
      story_id: 'story-zh-1',
      sequence_order: 1,
      text_target: '今天是星期六，天气非常好。',
      phonetic: 'Jīntiān shì xīngqīliù, tiānqì fēicháng hǎo.',
      text_native: "Aujourd'hui c'est samedi, il fait très beau.",
      audio_url: null,
      created_at: new Date().toISOString(),
    },
    {
      id: 'story-sent-zh-1-2',
      story_id: 'story-zh-1',
      sequence_order: 2,
      text_target: '王朋早上九点起床，然后吃早饭。',
      phonetic: 'Wáng Péng zǎoshang jiǔ diǎn qǐchuáng, ránhòu chī zǎofàn.',
      text_native: 'Wang Peng se lève à neuf heures du matin, puis prend son petit-déjeuner.',
      audio_url: null,
      created_at: new Date().toISOString(),
    },
    {
      id: 'story-sent-zh-1-3',
      story_id: 'story-zh-1',
      sequence_order: 3,
      text_target: '他打算和朋友一起去公园散步。',
      phonetic: 'Tā dǎsuàn hé péngyou yīqǐ qù gōngyuán sànbù.',
      text_native: 'Il a prévu d’aller se promener au parc avec des amis.',
      audio_url: null,
      created_at: new Date().toISOString(),
    },
    {
      id: 'story-sent-zh-1-4',
      story_id: 'story-zh-1',
      sequence_order: 4,
      text_target: '公园里有很多人在跑步和打太极拳。',
      phonetic: 'Gōngyuán lǐ yǒu hěn duō rén zài pǎobù hé dǎ tàijíquán.',
      text_native: 'Il y a beaucoup de monde dans le parc qui court ou fait du tai-chi.',
      audio_url: null,
      created_at: new Date().toISOString(),
    },
    {
      id: 'story-sent-zh-1-5',
      story_id: 'story-zh-1',
      sequence_order: 5,
      text_target: '他们度过了一个非常愉快的上午。',
      phonetic: 'Tāmen dùguòle yīgè fēicháng yúkuài de shàngwǔ.',
      text_native: 'Ils ont passé une matinée très agréable.',
      audio_url: null,
      created_at: new Date().toISOString(),
    },
  ];

  const finalStories = stories.length > 0 ? stories : sampleStories;
  const finalStorySentences = storySentences.length > 0 ? storySentences : sampleSentences;

  const fileContent = `import { ThemeBlock, Phrase, PracticeLog, User, Story, StorySentence } from '@/types';

export const INITIAL_USER: User = {
  id: 'user-001',
  email: 'learner@shadow.app',
  name: 'Alexandre',
  target_languages: ['EN', 'ZH'],
  cecrl_level_by_lang: {
    EN: 'A1',
    ZH: 'A1',
  },
  created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
};

export const INITIAL_BLOCKS: ThemeBlock[] = ${JSON.stringify(blocks, null, 2)};

export const INITIAL_PHRASES: Phrase[] = ${JSON.stringify(phrases, null, 2)};

export const INITIAL_PRACTICE_LOGS: PracticeLog[] = [
  {
    id: 'log-1',
    user_id: 'user-001',
    date: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    language: 'EN',
    minutes_practiced: 18,
    phrases_reviewed: 12,
    new_phrases_learned: 4,
  },
  {
    id: 'log-2',
    user_id: 'user-001',
    date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    language: 'ZH',
    minutes_practiced: 22,
    phrases_reviewed: 14,
    new_phrases_learned: 3,
  },
  {
    id: 'log-3',
    user_id: 'user-001',
    date: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    language: 'EN',
    minutes_practiced: 15,
    phrases_reviewed: 10,
    new_phrases_learned: 2,
  },
  {
    id: 'log-4',
    user_id: 'user-001',
    date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    language: 'ZH',
    minutes_practiced: 25,
    phrases_reviewed: 18,
    new_phrases_learned: 5,
  },
  {
    id: 'log-5',
    user_id: 'user-001',
    date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    language: 'EN',
    minutes_practiced: 20,
    phrases_reviewed: 15,
    new_phrases_learned: 3,
  },
  {
    id: 'log-6',
    user_id: 'user-001',
    date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    language: 'ZH',
    minutes_practiced: 30,
    phrases_reviewed: 22,
    new_phrases_learned: 6,
  },
  {
    id: 'log-7',
    user_id: 'user-001',
    date: new Date().toISOString().split('T')[0],
    language: 'EN',
    minutes_practiced: 14,
    phrases_reviewed: 8,
    new_phrases_learned: 2,
  },
];

export const INITIAL_STORIES: Story[] = ${JSON.stringify(finalStories, null, 2)};

export const INITIAL_STORY_SENTENCES: StorySentence[] = ${JSON.stringify(finalStorySentences, null, 2)};
`;

  fs.writeFileSync(MOCK_DATA_FILE, fileContent, 'utf-8');
  console.log(`✓ Intégré avec succès : ${blocks.length} blocs, ${phrases.length} phrases, ${finalStories.length} histoires dans lib/mock-data.ts`);
}

generateMockData();
