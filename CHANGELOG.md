# Changelog

Toutes les modifications notables de ce projet sont documentées dans ce fichier.

Le format est basé sur [Keep a Changelog](https://keepachangelog.com/fr/1.0.0/),
et ce projet adhère au [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [3.0.0] - 2026-03-08

### 🎉 Version Majeure - Api-Track v3

Cette version représente une refonte majeure de l'application avec de nombreuses fonctionnalités nouvelles.

### Ajouté

#### 🏭 Gestion de Production
- **Module Bobines** : Gestion complète des bobines avec import, création et suivi
- **Module Lots** : Regroupement des bobines en lots de production avec numérotation automatique
- **Module Tubes** : Suivi individuel de chaque tube avec numéro unique et traçabilité complète
- **Pipeline de production** : 12 étapes de contrôle qualité (CV Pointage → Emballage)

#### 🔍 Contrôle Qualité
- **Validation par étape** : Chaque étape peut être validée avec signature utilisateur
- **Gestion des défauts** : 46 types de défauts (36 visuels + 10 NDT)
- **Système de réparations** : Gestion complète des réparations avec causes et commentaires
- **Photos de validation** : Upload d'images pour documenter chaque étape
- **Historique complet** : Traçabilité de toutes les actions avec horodatage

#### 🌐 Internationalisation
- Support de 4 langues : Français, English, Italiano, العربية
- Support RTL complet pour l'arabe
- Détection automatique de la langue du navigateur

#### 🎨 Interface Utilisateur
- **Thème système** : Mode clair, sombre ou automatique (selon OS)
- **Sidebar scrollable** : Navigation fluide même avec beaucoup de menus
- **Design responsive** : Optimisé pour desktop, tablette et mobile
- **Page Paramètres** : Configuration centralisée (thème, langue, etc.)

#### 👥 Gestion des Utilisateurs
- Authentification par code d'accès
- Profils utilisateurs avec avatars
- Gestion des rôles et permissions

### Modifié

- **React** : Mise à jour vers React 19
- **TailwindCSS** : Mise à jour vers TailwindCSS 4
- **React Router** : Mise à jour vers React Router 7
- **Express** : Mise à jour vers Express 5

### Base de données

#### Nouvelles tables
- `bobines` : Stockage des bobines
- `lots` : Gestion des lots de production
- `tubes` : Suivi des tubes individuels
- `tube_validation_images` : Photos de validation
- `tube_stage_history` : Historique des étapes
- `defauts` : Types de défauts
- `causes_reparation` : Causes de réparation
- `causes_passer` : Causes pour passer une étape
- `causes_interruption` : Causes d'interruption

### Corrigé

- Correction du scroll du sidebar sur mobile et desktop
- Correction des boutons de thème dans les paramètres (Mode clair/sombre/système)
- Correction de l'affichage des traductions des étapes du pipeline
- Correction de la présentation des défauts dans les dropdowns (code en gras, libellé secondaire)

---

## [2.0.0] - 2025-xx-xx

### Ajouté
- Version initiale avec dashboard de base
- Module utilisateurs
- Système de thème clair/sombre

---

## [1.0.0] - 2024-xx-xx

### Ajouté
- Structure initiale du projet
- Configuration de base React + Vite
- Configuration de base Node.js + Express
- Connexion PostgreSQL
