"""
Reprise ciblée de la génération audio + correction du bug de mapping
voix/catégorie (accents non gérés dans slugify()).

Usage :
    python3 retry-missing-audio.py

Prérequis : identique à generate-audio.py (pip install edge-tts),
à placer et exécuter depuis la racine C:\\Shadow.

Ce script :
  1. Corrige le bug racine : slugify() gérait mal l'apostrophe (ex.
     "À l'hôtel" -> 'a-lhotel' au lieu de 'a-l-hotel'), causant
     l'échec du lookup THEME_CATEGORY_BY_SLUG pour ce thème.
  2. Cible UNIQUEMENT ce qui est réellement à (re)générer :
       - le thème 'a-l-hotel' (bloc + histoires, EN + ZH), jamais
         corrigé jusqu'ici à cause du bug ci-dessus ;
       - 7 phrases précises de 'en-a1-medicaments-et-posologie'
         identifiées comme ayant échoué lors de la précédente
         tentative de correction de voix (ciblage par texte exact,
         listées dans FORCE_TEXTS_BY_FILE) ;
       - toute entrée positionnellement absente du manifeste (aucune
         connue à ce jour, vérifié par analyse programmatique).
     Aucune régénération redondante des 9 autres thèmes déjà corrigés
     avec succès lors de la reprise précédente.
  3. Délai augmenté entre appels et tentatives, pour limiter le risque
     de nouvelles coupures réseau.
"""

import asyncio
import hashlib
import json
import re
import sys
import unicodedata
from pathlib import Path

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

import edge_tts

CONTENT_DIR = Path("output/content")
STORIES_DIR = Path("output/stories")
AUDIO_OUTPUT_DIR = Path("output/audio")
MANIFEST_PATH = Path("output/audio-manifest.json")

CATEGORY_VOICES = {
    "EN": {
        "quotidien": ["en-US-BrianNeural"],
        "voyage":    ["en-US-RogerNeural", "en-US-GuyNeural"],
        "travail":   ["en-US-ChristopherNeural", "en-US-SteffanNeural"],
        "santé":     ["en-US-EricNeural"],
    },
    "ZH": {
        "quotidien": ["zh-CN-YunxiNeural"],
        "voyage":    ["zh-CN-YunjianNeural"],
        "travail":   ["zh-CN-YunyangNeural"],
        "santé":     ["zh-CN-YunyangNeural"],
    },
}
DEFAULT_VOICE = {"EN": "en-US-BrianNeural", "ZH": "zh-CN-YunxiNeural"}
LEVEL_TOKENS = {"a0", "a1", "a2", "b1", "b2"}

THEMES = [
    ("Maison et vie quotidienne", "quotidien"),
    ("Courses et supermarché", "quotidien"),
    ("Transport et déplacements", "quotidien"),
    ("Météo et saisons", "quotidien"),
    ("Famille et relations", "quotidien"),
    ("Au restaurant", "voyage"),
    ("À l'hôtel", "voyage"),
    ("Urgences et sécurité", "voyage"),
    ("Demander son chemin", "voyage"),
    ("Réunion professionnelle", "travail"),
    ("Email professionnel", "travail"),
    ("Présentation orale", "travail"),
    ("Vocabulaire data et informatique", "travail"),
    ("Le corps humain", "santé"),
    ("Affections courantes", "santé"),
    ("À la pharmacie", "santé"),
    ("Chez le médecin", "santé"),
    ("Médicaments et posologie", "santé"),
]


def slugify(text: str) -> str:
    """CORRIGÉ : translittère les accents en ASCII avant de nettoyer,
    pour matcher le slug réellement utilisé dans les noms de fichiers
    (ex. 'Météo et saisons' -> 'meteo-et-saisons', pas 'météo-et-saisons')."""
    text = unicodedata.normalize("NFKD", text)
    text = text.encode("ascii", "ignore").decode("ascii")
    text = text.lower().strip()
    text = re.sub(r"[^\w\s-]", "-", text)   # ponctuation (dont apostrophe) -> séparateur
    text = re.sub(r"[\s_-]+", "-", text)    # collapse espaces/underscores/tirets multiples
    return text.strip("-")


THEME_CATEGORY_BY_SLUG = {slugify(title): category for title, category in THEMES}

# Liste EXPLICITE des thèmes encore jamais corrigés avec la bonne voix
# (bug de slug avec apostrophe, corrigé dans slugify() ci-dessus, mais
# jamais appliqué avec succès pour ce thème lors des runs précédents).
MISVOICED_SLUGS = {slugify("À l'hôtel")}

# Phrases précises qui ont échoué lors de la précédente tentative de
# correction de voix (le fichier audio existant reste donc à l'ancienne
# voix par défaut, faute d'écriture réussie dans le manifeste). Ciblage
# par texte exact plutôt que par index, pour ne pas dépendre d'un
# sequence_order supposé.
FORCE_TEXTS_BY_FILE = {
    "en-a1-medicaments-et-posologie": {
        "Tom walks to the local pharmacy near his house.",
        "The pharmacist gives him a box of medicine.",
        "Tom returns to his kitchen.",
        "He puts the box on the kitchen counter.",
        "He opens the package carefully.",
        "There is a bottle and a small spoon inside.",
        "He sees a tablet and reads the label.",
    },
}


def extract_theme_slug(file_stem: str) -> str:
    parts = file_stem.split("-")
    parts = parts[1:]
    if parts and parts[0] in LEVEL_TOKENS:
        parts = parts[1:]
    return "-".join(parts)


def pick_voice_for_file(filename: str, language: str) -> str:
    file_stem = Path(filename).stem
    theme_slug = extract_theme_slug(file_stem)
    category = THEME_CATEGORY_BY_SLUG.get(theme_slug)
    if category is None:
        print(f"    ⚠ Catégorie introuvable pour '{filename}' (slug='{theme_slug}'), voix par défaut utilisée.")
        return DEFAULT_VOICE[language]
    voices = CATEGORY_VOICES[language][category]
    if len(voices) == 1:
        return voices[0]
    digest = hashlib.sha256(filename.encode("utf-8")).hexdigest()
    index = int(digest, 16) % len(voices)
    return voices[index]


MAX_RETRIES = 5
RETRY_DELAY_SECONDS = 10
DELAY_BETWEEN_CALLS_SECONDS = 1.5
CONCURRENCY_LIMIT = 2


def detect_language_from_filename(filename: str) -> str:
    if filename.startswith("en-"):
        return "EN"
    if filename.startswith("zh-"):
        return "ZH"
    raise ValueError(f"Impossible de déduire la langue depuis : {filename}")


async def generate_audio_with_retry(text: str, voice: str, output_path: Path) -> bool:
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            communicate = edge_tts.Communicate(text, voice)
            await communicate.save(str(output_path))
            return True
        except Exception as e:
            print(f"    ⚠ Tentative {attempt}/{MAX_RETRIES} échouée pour '{text[:30]}...' : {e}")
            if attempt < MAX_RETRIES:
                await asyncio.sleep(RETRY_DELAY_SECONDS)
    print(f"    ✗ Échec définitif (reprise) pour : {text[:50]}")
    return False


def find_missing_block_entries(file_path: Path, manifest: dict, force_regen_slugs: set):
    """Retourne la liste des (index, phrase_dict) à (re)générer pour un bloc."""
    file_stem = file_path.stem
    theme_slug = extract_theme_slug(file_stem)
    force = theme_slug in force_regen_slugs

    with open(file_path, "r", encoding="utf-8") as f:
        phrases = json.load(f)

    force_texts = FORCE_TEXTS_BY_FILE.get(file_stem, set())
    todo = []
    for index, phrase in enumerate(phrases):
        key = f"block::{file_stem}::{index}"
        text = phrase.get("text_target", "").strip()
        if force or key not in manifest or text in force_texts:
            todo.append((index, phrase))
    return todo


def find_missing_story_entries(file_path: Path, manifest: dict, force_regen_slugs: set):
    file_stem = file_path.stem
    theme_slug = extract_theme_slug(file_stem)
    force = theme_slug in force_regen_slugs

    with open(file_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    sentences = data.get("sentences", [])

    force_texts = FORCE_TEXTS_BY_FILE.get(file_stem, set())
    todo = []
    for sentence in sentences:
        order = sentence.get("sequence_order")
        if order is None:
            continue
        key = f"story::{file_stem}::{order}"
        text = sentence.get("text_target", "").strip()
        if force or key not in manifest or text in force_texts:
            todo.append(sentence)
    return todo


async def retry_block(file_path: Path, manifest: dict, semaphore: asyncio.Semaphore, force_regen_slugs: set):
    todo = find_missing_block_entries(file_path, manifest, force_regen_slugs)
    if not todo:
        return
    language = detect_language_from_filename(file_path.name)
    voice = pick_voice_for_file(file_path.name, language)
    block_slug = slugify(file_path.stem)
    block_audio_dir = AUDIO_OUTPUT_DIR / "blocks" / block_slug
    block_audio_dir.mkdir(parents=True, exist_ok=True)

    print(f"→ Reprise bloc : {file_path.name} ({len(todo)} phrase(s) à régénérer) — voix : {voice}")

    async def process_one(index: int, phrase: dict):
        async with semaphore:
            text = phrase.get("text_target", "").strip()
            if not text:
                return
            output_path = block_audio_dir / f"{index}.mp3"
            success = await generate_audio_with_retry(text, voice, output_path)
            if success:
                manifest[f"block::{file_path.stem}::{index}"] = str(output_path)
            await asyncio.sleep(DELAY_BETWEEN_CALLS_SECONDS)

    await asyncio.gather(*(process_one(i, p) for i, p in todo))


async def retry_story(file_path: Path, manifest: dict, semaphore: asyncio.Semaphore, force_regen_slugs: set):
    todo = find_missing_story_entries(file_path, manifest, force_regen_slugs)
    if not todo:
        return
    language = detect_language_from_filename(file_path.name)
    voice = pick_voice_for_file(file_path.name, language)
    story_slug = slugify(file_path.stem)
    story_audio_dir = AUDIO_OUTPUT_DIR / "stories" / story_slug
    story_audio_dir.mkdir(parents=True, exist_ok=True)

    print(f"→ Reprise histoire : {file_path.name} ({len(todo)} phrase(s) à régénérer) — voix : {voice}")

    async def process_one(sentence: dict):
        async with semaphore:
            text = sentence.get("text_target", "").strip()
            order = sentence.get("sequence_order")
            if not text or order is None:
                return
            output_path = story_audio_dir / f"{order}.mp3"
            success = await generate_audio_with_retry(text, voice, output_path)
            if success:
                manifest[f"story::{file_path.stem}::{order}"] = str(output_path)
            await asyncio.sleep(DELAY_BETWEEN_CALLS_SECONDS)

    await asyncio.gather(*(process_one(s) for s in todo))


async def main():
    AUDIO_OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    if not MANIFEST_PATH.exists():
        raise SystemExit(f"Manifeste introuvable : {MANIFEST_PATH}. Lance d'abord generate-audio.py.")

    with open(MANIFEST_PATH, "r", encoding="utf-8") as f:
        manifest = json.load(f)
    print(f"Manifeste chargé : {len(manifest)} entrées.")

    # Slugs des 10 thèmes affectés par le bug d'accent : leurs fichiers
    # déjà générés doivent être refaits pour corriger la voix, même
    # sans trou dans le manifeste.
    force_regen_slugs = MISVOICED_SLUGS
    print(f"Thèmes à re-voix (bug accent corrigé) : {sorted(force_regen_slugs)}")

    semaphore = asyncio.Semaphore(CONCURRENCY_LIMIT)

    if CONTENT_DIR.exists():
        for file_path in sorted(CONTENT_DIR.glob("*.json")):
            await retry_block(file_path, manifest, semaphore, force_regen_slugs)
            with open(MANIFEST_PATH, "w", encoding="utf-8") as f:
                json.dump(manifest, f, ensure_ascii=False, indent=2)

    if STORIES_DIR.exists():
        for file_path in sorted(STORIES_DIR.glob("*.json")):
            await retry_story(file_path, manifest, semaphore, force_regen_slugs)
            with open(MANIFEST_PATH, "w", encoding="utf-8") as f:
                json.dump(manifest, f, ensure_ascii=False, indent=2)

    print(f"\n✓ Reprise terminée. Manifeste final : {len(manifest)} entrées.")


if __name__ == "__main__":
    asyncio.run(main())