/**
 * Génération des histoires (narrations contextuelles) via Gemini API.
 *
 * Une histoire par (thème x niveau x langue), ~30 phrases séquentielles,
 * cohérence narrative, progression de vocabulaire d'un niveau à l'autre
 * au sein d'un même thème (pas de simple répétition du niveau précédent).
 *
 * Contrainte spécifique : niveau A0 en chinois = vocabulaire ultra-basique,
 * phrases très courtes. Les autres niveaux (A1→B2, toutes langues) suivent
 * une progression de complexité normale, SANS cette contrainte durcie.
 *
 * Prérequis :
 *   npm install @google/generative-ai
 *   Clé API configurée dans .env.local (GEMINI_API_KEY)
 *
 * Usage basique :
 *   npm run generate:stories
 *
 * Options CLI / Variables d'environnement :
 *   --limit=1              (ou LIMIT=1)        : Génère seulement N histoires (idéal pour tester)
 *   --lang=EN|ZH           (ou LANG=EN)        : Filtre sur une langue
 *   --level=A0|A1|A2|B1|B2 (ou LEVEL=A0)       : Filtre sur un niveau
 *   --theme="maison"       (ou THEME="maison") : Filtre sur un thème spécifique
 *   --no-verify            (ou VERIFY_PASS=0)  : Désactive la 2e passe de vérification (2x plus rapide)
 *   --force                (ou FORCE=1)        : Écrase les histoires déjà générées
 *   --model="nom-modele"   (ou GEMINI_MODEL)   : Modèle Gemini personnalisé
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import * as fs from "fs";
import * as path from "path";

// ─── Chargement des variables d'environnement (.env.local / .env) ───

function loadEnvFile(filePath: string) {
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, "utf-8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const match = trimmed.match(/^([^=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        let val = match[2].trim();
        if (
          (val.startsWith('"') && val.endsWith('"')) ||
          (val.startsWith("'") && val.endsWith("'"))
        ) {
          val = val.slice(1, -1);
        }
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }
}

loadEnvFile(path.join(__dirname, ".env.local"));
loadEnvFile(path.join(__dirname, ".env"));

// ─── Analyse des arguments CLI / Variables d'environnement ──────────

const args = process.argv.slice(2);
function getArg(name: string, envVar?: string): string | undefined {
  const arg = args.find((a) => a.startsWith(`--${name}=`));
  if (arg) return arg.split("=")[1];
  const idx = args.indexOf(`--${name}`);
  if (idx !== -1 && args[idx + 1] && !args[idx + 1].startsWith("--")) {
    return args[idx + 1];
  }
  if (args.includes(`--${name}`)) return "true";
  if (envVar && process.env[envVar]) return process.env[envVar];
  return undefined;
}

const API_KEY = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
if (!API_KEY) {
  throw new Error("GEMINI_API_KEY manquante. Renseigne la clé dans `.env.local` ou `export GEMINI_API_KEY=...`");
}

const MODEL_NAME = getArg("model", "GEMINI_MODEL") || "gemini-3.5-flash-lite";
const NO_VERIFY = args.includes("--no-verify") || process.env.VERIFY_PASS === "false" || process.env.VERIFY_PASS === "0";
const VERIFY_PASS = !NO_VERIFY;
const FORCE_OVERWRITE = args.includes("--force") || process.env.FORCE === "true" || process.env.FORCE === "1";

const FILTER_LANG = (getArg("lang", "LANG") || "").toUpperCase();
const FILTER_LEVEL = (getArg("level", "LEVEL") || "").toUpperCase();
const FILTER_THEME = (getArg("theme", "THEME") || "").toLowerCase();
const LIMIT_COUNT = parseInt(getArg("limit", "LIMIT") || "0", 10);

const SENTENCES_PER_STORY = 30;
const OUTPUT_DIR = path.join(__dirname, "output", "stories");
const DELAY_BETWEEN_CALLS_MS = 4500;

const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({ model: MODEL_NAME });

// ─── Thèmes (repris du script de blocs thématiques) ─────────────

type Language = "EN" | "ZH";
type Level = "A0" | "A1" | "A2" | "B1" | "B2";

const ALL_LEVELS: Level[] = ["A0", "A1", "A2", "B1", "B2"];
const ALL_LANGUAGES: Language[] = ["EN", "ZH"];

const THEMES: { title: string; category: string }[] = [
  { title: "Maison et vie quotidienne", category: "quotidien" },
  { title: "Courses et supermarché", category: "quotidien" },
  { title: "Transport et déplacements", category: "quotidien" },
  { title: "Météo et saisons", category: "quotidien" },
  { title: "Famille et relations", category: "quotidien" },
  { title: "Au restaurant", category: "voyage" },
  { title: "À l'hôtel", category: "voyage" },
  { title: "Urgences et sécurité", category: "voyage" },
  { title: "Demander son chemin", category: "voyage" },
  { title: "Réunion professionnelle", category: "travail" },
  { title: "Email professionnel", category: "travail" },
  { title: "Présentation orale", category: "travail" },
  { title: "Vocabulaire data et informatique", category: "travail" },
  { title: "Le corps humain", category: "santé" },
  { title: "Affections courantes", category: "santé" },
  { title: "À la pharmacie", category: "santé" },
  { title: "Chez le médecin", category: "santé" },
  { title: "Médicaments et posologie", category: "santé" },
];

interface StorySpec {
  theme: string;
  category: string;
  level: Level;
  language: Language;
}

// ─── Prompts ─────────────────────────────────────────────────────

function buildGenerationPrompt(spec: StorySpec, priorVocabulary: string[]): string {
  const langLabel = spec.language === "EN" ? "anglais" : "chinois mandarin";
  const phoneticInstruction =
    spec.language === "EN"
      ? "Fournis la transcription API (IPA) pour chaque phrase."
      : "Fournis le pinyin avec tons (marques diacritiques) pour chaque phrase.";

  const isHardenedA0 = spec.language === "ZH" && spec.level === "A0";

  const levelConstraint = isHardenedA0
    ? `CONTRAINTE RENFORCÉE NIVEAU A0 CHINOIS (débutant absolu, zéro connaissance préalable) :
- Phrases très courtes : 4 à 8 caractères maximum
- Vocabulaire ultra-fréquent uniquement (salutations, chiffres 1-10, objets du quotidien, verbes de base : être, avoir, aller, vouloir)
- Une seule proposition grammaticale par phrase, aucune subordonnée
- Structures répétitives volontaires pour ancrer les patterns de base (sujet-verbe-objet simple)
- Pas de particules grammaticales avancées (pas de 了 aspectuel complexe, pas de 把, pas de comparatifs)`
    : `Niveau de complexité standard pour ${spec.level} : progression normale de grammaire et de vocabulaire pour ce niveau CECRL, sans simplification artificielle supplémentaire.`;

  const progressionConstraint =
    priorVocabulary.length > 0
      ? `\nPROGRESSION INTER-NIVEAUX (contrainte importante) :
Voici le vocabulaire déjà couvert dans les histoires de niveau inférieur pour ce même thème :
${priorVocabulary.join(", ")}

- Réutilise naturellement une partie de ce vocabulaire déjà connu pour ancrer la continuité (ne repars pas de zéro)
- Mais introduis un minimum de 40% de mots NOUVEAUX (non présents dans la liste ci-dessus), adaptés au niveau ${spec.level}, pour garantir une acquisition progressive de vocabulaire d'une histoire à l'autre
- N'introduis pas de mot déjà présent dans la liste comme s'il était nouveau`
      : "";

  return `Rédige une courte narration cohérente de ${SENTENCES_PER_STORY} phrases en ${langLabel}, 
niveau CECRL ${spec.level}, sur le thème : "${spec.theme}".

Contraintes de contenu :
- Les phrases doivent former une histoire suivie (un personnage, une action, un enchaînement logique dans le temps ou l'espace) — pas une liste de phrases indépendantes
- Le vocabulaire doit être directement réutilisable dans une conversation réelle du quotidien ou professionnelle sur ce thème
- Vocabulaire cohérent avec le niveau ${spec.level} : n'introduis pas de mots ou structures qui appartiendraient à un niveau nettement supérieur
- ${levelConstraint}${progressionConstraint}
- Aucune phrase ne doit être copiée ou reconnaissable d'un manuel, d'une méthode ou d'une app existante
- ${phoneticInstruction}
- Traduction française naturelle, pas mot-à-mot

Réponds UNIQUEMENT avec un JSON valide (aucun texte avant/après, pas de balises markdown) :

{
  "title": "titre court de l'histoire dans la langue cible",
  "new_vocabulary": ["liste des mots/expressions clés nouvellement introduits dans cette histoire, dans la langue cible"],
  "sentences": [
    {
      "sequence_order": 1,
      "text_target": "...",
      "phonetic": "...",
      "text_native": "..."
    }
  ]
}`;
}

function buildVerificationPrompt(spec: StorySpec, rawJson: string): string {
  const langLabel = spec.language === "EN" ? "anglais" : "chinois mandarin";
  const isHardenedA0 = spec.language === "ZH" && spec.level === "A0";

  const extraCheck = isHardenedA0
    ? "\n5. Vérifie STRICTEMENT que chaque phrase respecte la contrainte A0 débutant absolu (4-8 caractères, vocabulaire ultra-basique, aucune structure avancée). Simplifie toute phrase qui dépasserait ce niveau."
    : "";

  return `Tu es correcteur linguistique expert en ${langLabel} et en français.

Voici une histoire générée automatiquement (JSON ci-dessous). Vérifie et corrige :
1. L'exactitude de la phonétique (IPA ou pinyin avec tons)
2. L'idiomaticité et le naturel de chaque phrase
3. La justesse de la traduction française
4. La cohérence narrative globale (l'enchaînement des phrases doit rester logique)${extraCheck}

Corrige directement les erreurs trouvées. Ne change pas la structure du JSON.
Réponds UNIQUEMENT avec le JSON corrigé, aucun texte avant/après, pas de balises markdown.

JSON à corriger :
${rawJson}`;
}

// ─── Utilitaires ─────────────────────────────────────────────────

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function extractJson(rawText: string): string {
  const cleaned = rawText.trim().replace(/^```json\s*/i, "").replace(/```$/, "");
  return cleaned.trim();
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

async function callGeminiWithRetry(
  prompt: string,
  label: string,
  maxRetries = 3
): Promise<any> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await model.generateContent(prompt);
    } catch (err: any) {
      console.warn(`  ⚠ Tentative ${attempt}/${maxRetries} pour ${label} : ${err?.message || err}`);
      if (attempt < maxRetries) {
        const backoffMs = attempt * 4000;
        console.log(`  … reconnexion / nouvel essai dans ${backoffMs / 1000}s`);
        await sleep(backoffMs);
      } else {
        throw err;
      }
    }
  }
}

// ─── Génération d'une histoire ───────────────────────────────────

async function generateStory(
  spec: StorySpec,
  priorVocabulary: string[]
): Promise<{ vocabulary: string[]; generated: boolean }> {
  const label = `[${spec.language}] ${spec.theme} (${spec.level})`;
  const fileName = `${spec.language.toLowerCase()}-${spec.level.toLowerCase()}-${slugify(spec.theme)}.json`;
  const filePath = path.join(OUTPUT_DIR, fileName);

  // 1. Détection de reprise (reprise transparente en cas d'interruption)
  if (fs.existsSync(filePath) && !FORCE_OVERWRITE) {
    try {
      const existingContent = JSON.parse(fs.readFileSync(filePath, "utf-8"));
      const existingWords = Array.isArray(existingContent.new_vocabulary)
        ? existingContent.new_vocabulary
        : [];
      console.log(`  ↷ Déjà existant, ignoré : ${fileName} (+${existingWords.length} mots réutilisés)`);
      return { vocabulary: [...priorVocabulary, ...existingWords], generated: false };
    } catch {
      console.warn(`  ⚠ Fichier existant corrompu (${fileName}), regénération nécessaire.`);
    }
  }

  console.log(`\n→ Génération : ${label} (${priorVocabulary.length} mots acquis en amont)`);

  let result;
  try {
    result = await callGeminiWithRetry(buildGenerationPrompt(spec, priorVocabulary), label);
  } catch (err) {
    console.error(`  ✗ Échec génération pour ${label} :`, err);
    return { vocabulary: priorVocabulary, generated: false };
  }

  let jsonText = extractJson(result.response.text());
  let parsed: { new_vocabulary?: string[] };

  try {
    parsed = JSON.parse(jsonText);
  } catch {
    console.error(`  ✗ JSON invalide reçu pour ${label}, histoire ignorée.`);
    console.error(jsonText.slice(0, 300));
    return { vocabulary: priorVocabulary, generated: false };
  }

  if (VERIFY_PASS) {
    await sleep(DELAY_BETWEEN_CALLS_MS);
    console.log(`  … vérification linguistique`);
    try {
      const verifyResult = await callGeminiWithRetry(
        buildVerificationPrompt(spec, jsonText),
        `${label} (vérif)`
      );
      const verifiedJson = extractJson(verifyResult.response.text());
      const verifiedParsed = JSON.parse(verifiedJson);
      jsonText = verifiedJson;
      parsed = verifiedParsed;
    } catch {
      console.warn(
        `  ⚠ Vérification échouée pour ${label}, conservation de la version non vérifiée.`
      );
    }
  }

  fs.writeFileSync(filePath, jsonText, "utf-8");
  console.log(`  ✓ Écrit avec succès : ${fileName}`);

  const newWords = Array.isArray(parsed.new_vocabulary) ? parsed.new_vocabulary : [];
  return { vocabulary: [...priorVocabulary, ...newWords], generated: true };
}

// ─── Point d'entrée ──────────────────────────────────────────────

async function main() {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const languages = FILTER_LANG ? ALL_LANGUAGES.filter((l) => l === FILTER_LANG) : ALL_LANGUAGES;
  const levels = FILTER_LEVEL ? ALL_LEVELS.filter((lvl) => lvl === FILTER_LEVEL) : ALL_LEVELS;
  const themes = FILTER_THEME
    ? THEMES.filter((t) => slugify(t.title).includes(slugify(FILTER_THEME)))
    : THEMES;

  if (languages.length === 0 || levels.length === 0 || themes.length === 0) {
    console.error("✗ Aucun thème, langue ou niveau ne correspond aux filtres fournis.");
    process.exit(1);
  }

  const totalPossible = languages.length * themes.length * levels.length;
  const targetCount = LIMIT_COUNT > 0 ? Math.min(LIMIT_COUNT, totalPossible) : totalPossible;

  console.log("=================================================");
  console.log("  Générateur d'Histoires Contextuelles (Gemini)  ");
  console.log("=================================================");
  console.log(`Modèle             : ${MODEL_NAME}`);
  console.log(`Langue(s)          : ${languages.join(", ")}`);
  console.log(`Niveaux            : ${levels.join(", ")}`);
  console.log(`Thèmes cibles      : ${themes.length} thème(s)`);
  console.log(`Double passe vérif : ${VERIFY_PASS ? "OUI" : "NON (mode rapide)"}`);
  console.log(`Reprise auto       : OUI (fichiers existants ignorés automatiquement)`);
  console.log(`Nombre total visé  : ${targetCount} histoire(s)`);
  console.log("-------------------------------------------------");

  let generatedCount = 0;
  let totalProcessed = 0;

  for (const lang of languages) {
    for (const theme of themes) {
      let accumulatedVocabulary: string[] = [];

      for (const level of levels) {
        if (LIMIT_COUNT > 0 && generatedCount >= LIMIT_COUNT) {
          console.log(`\n✓ Limite atteinte (${LIMIT_COUNT} histoire(s) générée(s)). Fin du traitement.`);
          return;
        }

        totalProcessed++;
        const spec: StorySpec = {
          theme: theme.title,
          category: theme.category,
          level,
          language: lang,
        };

        const { vocabulary, generated } = await generateStory(spec, accumulatedVocabulary);
        accumulatedVocabulary = vocabulary;

        if (generated) {
          generatedCount++;
          await sleep(DELAY_BETWEEN_CALLS_MS);
        }
      }
    }
  }

  console.log("\n=================================================");
  console.log(`Session terminée !`);
  console.log(`- Nouvelles histoires générées : ${generatedCount}`);
  console.log(`- Total exploré / vérifié      : ${totalProcessed}`);
  console.log(`Dossier de sortie              : /output/stories/`);
  console.log("=================================================");
}

main().catch((err) => {
  console.error("Erreur fatale :", err);
  process.exit(1);
});
