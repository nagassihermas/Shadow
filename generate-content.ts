/**
 * Script de génération de contenu bilingue (EN/ZH) via Gemini API.
 *
 * Prérequis :
 *   npm install @google/generative-ai
 *   export GEMINI_API_KEY="ta_clé" (ou configuré dans .env.local)
 *
 * Usage :
 *   npx tsx generate-content.ts
 *
 * Le script :
 *  1. Itère sur une liste de blocs thématiques (langue x thème x niveau)
 *  2. Appelle Gemini (Flash-Lite par défaut) pour générer ~20 phrases par bloc
 *  3. Optionnel : lance une deuxième passe de vérification linguistique
 *     (désactivable via VERIFY_PASS=false pour économiser le quota gratuit)
 *  4. Écrit le résultat dans /output/content/*.json (un fichier par bloc)
 *
 * IMPORTANT : ce script ne fait AUCUN appel réseau autre que vers l'API Gemini
 * officielle (generativelanguage.googleapis.com). Vérifie ton quota avant un
 * run complet : https://ai.google.dev/gemini-api/docs/rate-limits
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

// ─── Configuration ──────────────────────────────────────────────

const API_KEY = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
if (!API_KEY) {
  throw new Error("GEMINI_API_KEY manquante. Fais `export GEMINI_API_KEY=...` ou ajoute la clé dans `.env.local`");
}

// Modèle par défaut (compatible quota gratuit)
const MODEL_NAME = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite"; 
const VERIFY_PASS = process.env.VERIFY_PASS !== "false"; // true par défaut
const PHRASES_PER_BLOCK = 20;
const OUTPUT_DIR = path.join(__dirname, "output", "content");
const DELAY_BETWEEN_CALLS_MS = 4500; // marge de sécurité sous ~15 RPM

const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({ model: MODEL_NAME });

// ─── Définition des blocs à générer ─────────────────────────────

type Language = "EN" | "ZH";
type Level = "A1" | "A2" | "B1" | "B2";

interface BlockSpec {
  theme: string;
  category: string;
  level: Level;
  language: Language;
}

const THEMES: { title: string; category: string; level: Level }[] = [
  { title: "Maison et vie quotidienne", category: "quotidien", level: "A1" },
  { title: "Courses et supermarché", category: "quotidien", level: "A1" },
  { title: "Transport et déplacements", category: "quotidien", level: "A2" },
  { title: "Météo et saisons", category: "quotidien", level: "A1" },
  { title: "Famille et relations", category: "quotidien", level: "A2" },
  { title: "Au restaurant", category: "voyage", level: "A2" },
  { title: "À l'hôtel", category: "voyage", level: "A2" },
  { title: "Urgences et sécurité", category: "voyage", level: "B1" },
  { title: "Demander son chemin", category: "voyage", level: "A1" },
  { title: "Réunion professionnelle", category: "travail", level: "B1" },
  { title: "Email professionnel", category: "travail", level: "B1" },
  { title: "Présentation orale", category: "travail", level: "B2" },
  { title: "Vocabulaire data et informatique", category: "travail", level: "B1" },
  { title: "Le corps humain", category: "santé", level: "A2" },
  { title: "Affections courantes", category: "santé", level: "B1" },
  { title: "À la pharmacie", category: "santé", level: "A2" },
  { title: "Chez le médecin", category: "santé", level: "B1" },
  { title: "Médicaments et posologie", category: "santé", level: "B2" },
];

const LANGUAGES: Language[] = ["EN", "ZH"];

// ─── Prompts ─────────────────────────────────────────────────────

function buildGenerationPrompt(spec: BlockSpec): string {
  const langLabel = spec.language === "EN" ? "anglais" : "chinois mandarin";
  const phoneticInstruction =
    spec.language === "EN"
      ? "Fournis la transcription API (International Phonetic Alphabet) pour chaque phrase."
      : "Fournis le pinyin avec tons (marques diacritiques, pas de chiffres) pour chaque phrase.";

  return `Génère un bloc thématique de ${PHRASES_PER_BLOCK} phrases utiles en ${langLabel}, 
niveau CECRL ${spec.level}, sur le thème : "${spec.theme}".

Contraintes strictes :
- Phrases naturelles, orales, registre courant (pas littéraire, pas de manuel scolaire daté)
- Progression de difficulté légère à l'intérieur du bloc (les premières phrases plus simples)
- Aucune phrase ne doit être copiée ou reconnaissable d'un manuel, d'une méthode ou d'une app existante — formule chaque phrase de façon originale à partir du contexte communicatif
- ${phoneticInstruction}
- Traduction française naturelle, pas mot-à-mot

Réponds UNIQUEMENT avec un JSON valide (aucun texte avant/après, pas de balises markdown), 
sous cette forme exacte :

[
  {
    "text_target": "...",
    "phonetic": "...",
    "text_native": "...",
    "language": "${spec.language}",
    "category": "${spec.category}",
    "level": "${spec.level}"
  }
]`;
}

function buildVerificationPrompt(spec: BlockSpec, rawJson: string): string {
  const langLabel = spec.language === "EN" ? "anglais" : "chinois mandarin";
  return `Tu es correcteur linguistique expert en ${langLabel} et en français.

Voici un bloc de phrases générées automatiquement (JSON ci-dessous). Vérifie et corrige :
1. L'exactitude de la phonétique (IPA ou pinyin avec tons)
2. L'idiomaticité et le naturel de la phrase cible
3. La justesse de la traduction française
4. Qu'aucune phrase ne soit identifiable comme copiée d'une source existante (manuel, app)

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
  // Sécurité : au cas où le modèle ajoute des balises markdown malgré la consigne
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

// ─── Génération d'un bloc ────────────────────────────────────────

async function generateBlock(spec: BlockSpec): Promise<void> {
  const label = `[${spec.language}] ${spec.theme} (${spec.level})`;
  console.log(`→ Génération : ${label}`);

  let result;
  try {
    result = await model.generateContent(buildGenerationPrompt(spec));
  } catch (err) {
    console.error(`  ✗ Échec génération pour ${label} :`, err);
    return;
  }

  let jsonText = extractJson(result.response.text());

  // Validation basique avant d'aller plus loin
  try {
    JSON.parse(jsonText);
  } catch {
    console.error(`  ✗ JSON invalide reçu pour ${label}, bloc ignoré. Réponse brute :`);
    console.error(jsonText.slice(0, 300));
    return;
  }

  if (VERIFY_PASS) {
    await sleep(DELAY_BETWEEN_CALLS_MS);
    console.log(`  … vérification linguistique`);
    try {
      const verifyResult = await model.generateContent(
        buildVerificationPrompt(spec, jsonText)
      );
      const verifiedJson = extractJson(verifyResult.response.text());
      JSON.parse(verifiedJson); // re-valide avant d'écraser
      jsonText = verifiedJson;
    } catch (err) {
      console.warn(
        `  ⚠ Vérification échouée pour ${label}, conservation de la version non vérifiée.`
      );
    }
  }

  const fileName = `${spec.language.toLowerCase()}-${slugify(spec.theme)}.json`;
  const filePath = path.join(OUTPUT_DIR, fileName);
  fs.writeFileSync(filePath, jsonText, "utf-8");
  console.log(`  ✓ Écrit : ${filePath}`);
}

// ─── Point d'entrée ──────────────────────────────────────────────

async function main() {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const specs: BlockSpec[] = [];
  for (const lang of LANGUAGES) {
    for (const theme of THEMES) {
      specs.push({
        theme: theme.title,
        category: theme.category,
        level: theme.level,
        language: lang,
      });
    }
  }

  console.log(
    `Plan : ${specs.length} blocs à générer (${VERIFY_PASS ? "avec" : "sans"} double passe).`
  );
  console.log(
    `Estimation d'appels API : ${specs.length * (VERIFY_PASS ? 2 : 1)}.`
  );

  for (const spec of specs) {
    await generateBlock(spec);
    await sleep(DELAY_BETWEEN_CALLS_MS);
  }

  console.log("Terminé. Vérifie manuellement /output/content/ avant intégration en base.");
}

main().catch((err) => {
  console.error("Erreur fatale :", err);
  process.exit(1);
});
