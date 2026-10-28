# Shadow — PWA d'Apprentissage des Langues (Anglais & Chinois)

Application PWA moderne construite avec **Next.js 14 (App Router)**, **TypeScript**, **Tailwind CSS**, **ts-fsrs** pour la répétition espacée, et **Web Audio API** pour la pratique du Shadowing.

---

## 🎨 Palette de couleurs (Épurée & Désaturée)

- **Primary** : `#6B8F71` (Vert sauge)
- **Secondary** : `#B8A088` (Beige argile)
- **Background** : `#1C1B1A` (Gris pierre très sombre)
- **Surface** : `#282625` (Gris chaud)
- **Text** : `#E8E4DD` (Blanc cassé)
- **Text Muted** : `#8A8580` (Gris moyen)
- **Success** : `#5A7A5F` (Vert sauge foncé)
- **Danger** : `#A6624F` (Terracotta mat)

---

## 📐 Architecture des Routes (App Router)

- `/` → **Accueil** : Résumé du jour, accès rapide, aperçu du niveau CECRL estimé, blocs récents
- `/blocks` → **Liste des Blocs Thématiques** : Filtres par langue (`EN`/`ZH`), niveau (`A1`-`C2`), catégorie et recherche textuelle
- `/blocks/[id]` → **Détail d'un Bloc** : Liste des phrases avec texte cible, phonétique (IPA/Pinyin), traduction native, statut de maîtrise FSRS et lecteur audio
- `/practice` → **Centre de Pratique** : Sélection du mode et choix des blocs
- `/practice/shadowing/[blockId]` → **Mode Shadowing** : Écoute audio native, enregistrement micro (MediaRecorder / Web Audio API), relecture comparée
- `/practice/recall/[blockId]` → **Mode Rappel Actif (SRS)** : Affichage de la traduction native, révélation, notation par étoiles (1-5), calcul FSRS automatique
- `/stats` → **Statistiques & Progression** : Dashboard quotidien, graphique hebdomadaire (7 jours), calcul du niveau CECRL estimé par langue avec avertissement

---

## 🧠 Algorithme de Répétition Espacée (FSRS)

L'application utilise l'algorithme moderne **FSRS** (`ts-fsrs`) :
- **Notation utilisateur (1 à 5 étoiles)** :
  - `1 étoile` : Échec (augmente la difficulté perçue, révision rapprochée)
  - `2 étoiles` : Difficile (intervalle court)
  - `3 étoiles` : Correct (intervalle standard)
  - `4-5 étoiles` : Facile / Parfait (diminue la difficulté, intervalle allongé)
- **Statut de maîtrise dérivé** :
  - `NEW` : Phrase jamais révisée (`reps === 0`)
  - `LEARNING` : En cours d'apprentissage (`stability < 21 jours`)
  - `MASTERED` : Phrase maîtrisée (`stability >= 21 jours` et `reps >= 2`)

---

## 📊 Estimation du Niveau CECRL

Le niveau affiché (`A1`, `A2`, `B1`, `B2`, `C1`, `C2`) est calculé dynamiquement d'après le nombre de phrases `MASTERED` par langue, avec des seuils différenciés pour l'Anglais et le Chinois (calibrés en cohérence avec les paliers HSK 1-6) configurés dans la table SQL / structure TypeScript.

---

## 🔊 Intégration Audio TTS

- **Structure prête pour Google Cloud Text-to-Speech** (`lib/tts.ts`) avec support des voix Neural2 / Wavenet pour l'Anglais (`en-US`, `en-GB`) et le Chinois (`cmn-CN`).
- **Fallback Web Speech API** : Fonctionnel immédiatement dans le navigateur sans nécessiter de clé API.

---

## 🚀 Démarrage

```bash
# Installation des dépendances
npm install

# Démarrer en mode développement
npm run dev

# Compiler pour la production
npm run build
npm start
```
