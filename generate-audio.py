"""
Génération audio batch via edge-tts pour les blocs thématiques et les histoires.

Usage :
    python3 generate-audio.py

Prérequis :
    pip install edge-tts
"""

import asyncio
import hashlib
import json
import os
import re
from pathlib import Path

import edge_tts

# ─── Configuration ──────────────────────────────────────────────

CONTENT_DIR = Path("output/content")
STORIES_DIR = Path("output/stories")
AUDIO_OUTPUT_DIR = Path("output/audio")
MANIFEST_PATH = Path("output/audio-manifest.json")

# Voix MASCULINES confirmées via `edge-tts --list-voices`, mappées par
# registre/catégorie thématique plutôt que choisies au hasard.
CATEGORY_VOICES = {
    "EN": {
        "quotidien": ["en-US-BrianNeural"],                       # Approachable, Casual, Sincere
        "voyage":    ["en-US-RogerNeural", "en-US-GuyNeural"],    # Lively / Passion
        "travail":   ["en-US-ChristopherNeural", "en-US-SteffanNeural"],  # Authority / Rational
        "santé":     ["en-US-EricNeural"],                        # Rational
    },
    "ZH": {
        "quotidien": ["zh-CN-YunxiNeural"],     # Lively, Sunshine
        "voyage":    ["zh-CN-YunjianNeural"],   # Passion, Sports
        "travail":   ["zh-CN-YunyangNeural"],   # Professional, Reliable
        # Pool masculin ZH limité à 3 voix non-cartoon : Travail et Santé
        # partagent donc la même voix (YunyangNeural), faute d'alternative
        # "sérieuse" disponible. À revoir si Microsoft ajoute des voix ZH.
        "santé":     ["zh-CN-YunyangNeural"],
    },
}

DEFAULT_VOICE = {"EN": "en-US-BrianNeural", "ZH": "zh-CN-YunxiNeural"}

LEVEL_TOKENS = {"a0", "a1", "a2", "b1", "b2"}

# Doit rester synchronisé avec la liste THEMES des scripts de génération
# de contenu (generate-content.ts / generate-stories.ts) — mêmes titres,
# mêmes catégories, pour que le slug retrouve la bonne catégorie ici.
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
    text = text.lower().strip()
    text = re.sub(r"[^\w\s-]", "", text)
    text = re.sub(r"[\s_]+", "-", text)
    return text.strip("-")


THEME_CATEGORY_BY_SLUG = {slugify(title): category for title, category in THEMES}


def extract_theme_slug(file_stem: str) -> str:
    """Retire le préfixe langue (et niveau, pour les histoires) du nom de
    fichier pour retrouver le slug du thème. Ex :
    'en-au-restaurant' -> 'au-restaurant'
    'zh-a1-au-restaurant' -> 'au-restaurant'"""
    parts = file_stem.split("-")
    parts = parts[1:]  # retire le code langue
    if parts and parts[0] in LEVEL_TOKENS:
        parts = parts[1:]  # retire le code niveau (histoires uniquement)
    return "-".join(parts)


def pick_voice_for_file(filename: str, language: str) -> str:
    """Sélectionne une voix masculine adaptée à la catégorie du thème,
    avec rotation déterministe (par hash du nom de fichier) parmi les
    voix disponibles pour cette catégorie, afin de varier les locuteurs
    tout en gardant un registre cohérent."""
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


MAX_RETRIES = 3
RETRY_DELAY_SECONDS = 5
DELAY_BETWEEN_CALLS_SECONDS = 0.5
CONCURRENCY_LIMIT = 3


def slugify(text: str) -> str:
    text = text.lower().strip()
    text = re.sub(r"[^\w\s-]", "", text)
    text = re.sub(r"[\s_]+", "-", text)
    return text.strip("-")


async def generate_audio_with_retry(text: str, voice: str, output_path: Path) -> bool:
    """Génère un fichier audio pour un texte donné, avec tentatives en cas d'échec."""
    for attempt in range(1, MAX_RETRIES + 1):
        try:
            communicate = edge_tts.Communicate(text, voice)
            await communicate.save(str(output_path))
            return True
        except Exception as e:
            print(f"    ⚠ Tentative {attempt}/{MAX_RETRIES} échouée pour '{text[:30]}...' : {e}")
            if attempt < MAX_RETRIES:
                await asyncio.sleep(RETRY_DELAY_SECONDS)
    print(f"    ✗ Échec définitif pour : {text[:50]}")
    return False


def detect_language_from_filename(filename: str) -> str:
    """Déduit la langue à partir du préfixe du fichier (en-... / zh-...)."""
    if filename.startswith("en-"):
        return "EN"
    if filename.startswith("zh-"):
        return "ZH"
    raise ValueError(f"Impossible de déduire la langue depuis : {filename}")


async def process_block_file(file_path: Path, manifest: dict, semaphore: asyncio.Semaphore):
    """Traite un fichier de bloc thématique (liste de phrases)."""
    language = detect_language_from_filename(file_path.name)
    voice = pick_voice_for_file(file_path.name, language)

    with open(file_path, "r", encoding="utf-8") as f:
        phrases = json.load(f)

    block_slug = slugify(file_path.stem)
    block_audio_dir = AUDIO_OUTPUT_DIR / "blocks" / block_slug
    block_audio_dir.mkdir(parents=True, exist_ok=True)

    print(f"→ Bloc : {file_path.name} ({len(phrases)} phrases) — voix : {voice}")

    async def process_one(index: int, phrase: dict):
        async with semaphore:
            text = phrase.get("text_target", "").strip()
            if not text:
                return
            output_path = block_audio_dir / f"{index}.mp3"
            success = await generate_audio_with_retry(text, voice, output_path)
            if success:
                manifest_key = f"block::{file_path.stem}::{index}"
                manifest[manifest_key] = str(output_path)
            await asyncio.sleep(DELAY_BETWEEN_CALLS_SECONDS)

    tasks = [process_one(i, phrase) for i, phrase in enumerate(phrases)]
    await asyncio.gather(*tasks)


async def process_story_file(file_path: Path, manifest: dict, semaphore: asyncio.Semaphore):
    """Traite un fichier d'histoire (sentences séquentielles)."""
    language = detect_language_from_filename(file_path.name)
    voice = pick_voice_for_file(file_path.name, language)

    with open(file_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    sentences = data.get("sentences", [])
    story_slug = slugify(file_path.stem)
    story_audio_dir = AUDIO_OUTPUT_DIR / "stories" / story_slug
    story_audio_dir.mkdir(parents=True, exist_ok=True)

    print(f"→ Histoire : {file_path.name} ({len(sentences)} phrases) — voix : {voice}")

    async def process_one(sentence: dict):
        async with semaphore:
            text = sentence.get("text_target", "").strip()
            order = sentence.get("sequence_order")
            if not text or order is None:
                return
            output_path = story_audio_dir / f"{order}.mp3"
            success = await generate_audio_with_retry(text, voice, output_path)
            if success:
                manifest_key = f"story::{file_path.stem}::{order}"
                manifest[manifest_key] = str(output_path)
            await asyncio.sleep(DELAY_BETWEEN_CALLS_SECONDS)

    tasks = [process_one(s) for s in sentences]
    await asyncio.gather(*tasks)


async def main():
    AUDIO_OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    manifest: dict = {}
    semaphore = asyncio.Semaphore(CONCURRENCY_LIMIT)

    # Reprise : si le manifeste existe déjà, on le charge pour ne pas
    # régénérer l'audio déjà produit lors d'un run précédent interrompu.
    if MANIFEST_PATH.exists():
        with open(MANIFEST_PATH, "r", encoding="utf-8") as f:
            manifest = json.load(f)
        print(f"Manifeste existant chargé : {len(manifest)} entrées déjà présentes.")

    if CONTENT_DIR.exists():
        block_files = sorted(CONTENT_DIR.glob("*.json"))
        print(f"\n{len(block_files)} fichiers de blocs thématiques trouvés.")
        for file_path in block_files:
            await process_block_file(file_path, manifest, semaphore)
            # Sauvegarde incrémentale du manifeste après chaque fichier
            with open(MANIFEST_PATH, "w", encoding="utf-8") as f:
                json.dump(manifest, f, ensure_ascii=False, indent=2)
    else:
        print(f"Dossier {CONTENT_DIR} introuvable, blocs ignorés.")

    if STORIES_DIR.exists():
        story_files = sorted(STORIES_DIR.glob("*.json"))
        print(f"\n{len(story_files)} fichiers d'histoires trouvés.")
        for file_path in story_files:
            await process_story_file(file_path, manifest, semaphore)
            with open(MANIFEST_PATH, "w", encoding="utf-8") as f:
                json.dump(manifest, f, ensure_ascii=False, indent=2)
    else:
        print(f"Dossier {STORIES_DIR} introuvable, histoires ignorées.")

    print(f"\n✓ Terminé. Manifeste final : {len(manifest)} fichiers audio référencés dans {MANIFEST_PATH}")


if __name__ == "__main__":
    asyncio.run(main())