# 🚀 Api-Track v3

> Système de traçabilité et de suivi de production pour l'industrie des tubes et pipelines

![Version](https://img.shields.io/badge/version-3.0.0-blue.svg)
![React](https://img.shields.io/badge/React-19+-61DAFB.svg)
![Node.js](https://img.shields.io/badge/Node.js-18+-339933.svg)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15+-336791.svg)
![i18n](https://img.shields.io/badge/i18n-4%20langues-green.svg)

## 📋 Description

Api-Track v3 est une application complète de traçabilité industrielle conçue pour le suivi de production de tubes. Elle permet de gérer l'ensemble du cycle de vie des tubes, depuis la réception des bobines jusqu'à la validation finale, en passant par toutes les étapes de contrôle qualité.

## ✨ Fonctionnalités

### 🏭 Gestion de Production
- **Bobines** : Gestion complète des bobines (import, création, suivi)
- **Lots** : Regroupement des bobines en lots de production
- **Tubes** : Suivi individuel de chaque tube avec numéro unique
- **Pipeline de production** : 12 étapes de contrôle (CV Pointage → Emballage)

### 🔍 Contrôle Qualité
- **Validation par étape** : Chaque étape peut être validée avec signature
- **Gestion des défauts** : 46 types de défauts (36 visuels + 10 NDT)
- **Réparations** : Système complet de gestion des réparations
- **Photos de validation** : Upload d'images pour chaque étape
- **Historique complet** : Traçabilité de toutes les actions

### 🎨 Interface Utilisateur
- **Design moderne** : Interface élégante avec TailwindCSS
- **Thème clair/sombre/système** : 3 modes d'affichage
- **Mobile-first** : Responsive design pour tous les appareils
- **Sidebar scrollable** : Navigation fluide même avec beaucoup de menus
- **Internationalisation** : 4 langues (Français, English, Italiano, العربية)

### 👥 Gestion des Utilisateurs
- **Authentification par code d'accès**
- **Rôles et permissions**
- **Profils utilisateurs avec avatars**

## 🛠️ Technologies

### Frontend
- **React 19** avec Vite
- **TailwindCSS 4** pour le styling
- **React Router 7** pour la navigation
- **i18next** pour l'internationalisation
- **Lucide React** pour les icônes
- **Socket.io-client** pour le temps réel
- **Context API** pour la gestion d'état

### Backend
- **Node.js** avec Express 5
- **PostgreSQL** pour la base de données
- **Socket.io** pour les notifications temps réel
- **Multer** pour l'upload de fichiers

## 📁 Structure du projet

```
api-track/
├── frontend/                   # Application React
│   ├── src/
│   │   ├── components/        # Composants réutilisables
│   │   │   ├── Header.jsx
│   │   │   ├── Sidebar.jsx
│   │   │   ├── Footer.jsx
│   │   │   ├── Layout.jsx
│   │   │   ├── TubePipeline.jsx
│   │   │   ├── CrudSelect.jsx
│   │   │   └── ...
│   │   ├── context/           # Context API
│   │   │   ├── ThemeContext.jsx
│   │   │   ├── SidebarContext.jsx
│   │   │   └── AuthContext.jsx
│   │   ├── pages/             # Pages de l'application
│   │   │   ├── Dashboard.jsx
│   │   │   ├── BobinesList.jsx
│   │   │   ├── LotsList.jsx
│   │   │   ├── TubesList.jsx
│   │   │   ├── TubeForm.jsx
│   │   │   ├── UsersPage.jsx
│   │   │   ├── SettingsPage.jsx
│   │   │   └── ...
│   │   ├── i18n/              # Internationalisation
│   │   │   ├── index.js
│   │   │   └── locales/
│   │   │       ├── fr.json
│   │   │       ├── en.json
│   │   │       ├── it.json
│   │   │       └── ar.json
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   └── package.json
│
├── backend/                    # API Node.js
│   ├── config/
│   │   └── database.js
│   ├── routes/
│   │   ├── bobines.js
│   │   ├── lots.js
│   │   ├── tubes.js
│   │   ├── users.js
│   │   ├── dashboard.js
│   │   └── reparations.js
│   ├── migrations/            # Scripts de migration DB
│   ├── uploads/               # Fichiers uploadés
│   ├── server.js
│   └── package.json
│
├── asset/                      # Assets statiques
├── .gitignore
├── CHANGELOG.md
└── README.md
```

## 🚀 Installation

### Prérequis

- Node.js 18+
- PostgreSQL 15+
- npm ou yarn

### 1. Cloner le projet

```bash
git clone https://github.com/DeLTa-X-Tunisia/Api-Track-v3.git
cd Api-Track-v3
```

### 2. Configurer la base de données

Créez une base de données PostgreSQL nommée `apitrack` :

```sql
CREATE DATABASE apitrack;
```

### 3. Installer les dépendances

**Frontend:**
```bash
cd frontend
npm install
```

**Backend:**
```bash
cd backend
npm install
```

### 4. Configurer l'environnement

Créez ou modifiez le fichier `backend/.env`:

```env
PORT=5000
NODE_ENV=development
DB_HOST=localhost
DB_PORT=5432
DB_NAME=apitrack
DB_USER=postgres
DB_PASSWORD=votre_mot_de_passe
CORS_ORIGIN=http://localhost:5173
```

### 5. Initialiser la base de données

Exécutez les migrations pour créer les tables :

```bash
cd backend
node migrations/create_lots_table.js
node migrations/create_tubes_table.js
node migrations/create_tube_validation_images_table.js
node migrations/create_tube_stage_history_table.js
node migrations/create_repair_tables.js
node migrations/create_skip_tables.js
node migrations/create_interrupt_tables.js
```

## ▶️ Démarrage

### Backend (port 5000)
```bash
cd backend
npm start
```

### Frontend (port 5173)
```bash
cd frontend
npm run dev
```

Ouvrez http://localhost:5173 dans votre navigateur.

## 📊 Pipeline de Production

Le système gère 12 étapes de production :

| # | Étape | Code | Description |
|---|-------|------|-------------|
| 1 | CV Pointage | CVP | Contrôle visuel au pointage |
| 2 | CV Radio | CVR | Contrôle visuel radiographie |
| 3 | CV Chanfrein | CVC | Contrôle visuel chanfrein |
| 4 | Radiographie | RAD | Contrôle radiographique |
| 5 | Ultrasons | ULT | Contrôle par ultrasons |
| 6 | Magnétoscopie | MAG | Contrôle magnétoscopique |
| 7 | Pression | PRE | Test de pression |
| 8 | Ressuage | RES | Contrôle par ressuage |
| 9 | Marquage | MAR | Marquage du tube |
| 10 | Chanfrein | CHA | Opération de chanfreinage |
| 11 | Pesage | PES | Pesage du tube |
| 12 | Emballage | EMB | Emballage final |

## 🌐 Internationalisation

L'application supporte 4 langues :
- 🇫🇷 Français (par défaut)
- 🇬🇧 English
- 🇮🇹 Italiano
- 🇸🇦 العربية (RTL)

## 📸 Aperçu

### Mode Clair
- Interface épurée avec des tons blancs et gris clairs
- Excellent pour une utilisation en journée

### Mode Sombre
- Interface élégante avec des tons sombres
- Idéal pour réduire la fatigue oculaire

### Mode Système
- S'adapte automatiquement aux préférences du système d'exploitation

## 🗺️ Roadmap

- [x] Module Gestion des Bobines
- [x] Module Gestion des Lots
- [x] Module Gestion des Tubes
- [x] Pipeline de production (12 étapes)
- [x] Système de défauts et réparations
- [x] Internationalisation (4 langues)
- [x] Thème clair/sombre/système
- [ ] Module Workflow de production avancé
- [ ] Module Reporting & Analytics
- [ ] Module Suivi des commandes
- [ ] Module Planification
- [ ] Module Gestion des équipes
- [ ] Module Gestion des documents
- [ ] Export PDF des rapports

## 👥 Contributeurs

- **DeLTa-X Tunisia** - Développement et maintenance

## 📝 Licence

ISC © 2024-2026 DeLTa-X Tunisia

---

Fait avec ❤️ par DeLTa-X Tunisia pour la traçabilité industrielle
