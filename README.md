# Roomify

> AI-powered architectural visualization — transform flat 2D floor plans into photorealistic 3D renders in seconds.

![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)
![Puter](https://img.shields.io/badge/Puter-A855F7?style=for-the-badge&logoColor=white)

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Project Structure](#project-structure)
- [Acknowledgements](#acknowledgements)

## Overview

Roomify is a web app that uses generative AI to turn 2D architectural floor plans into photorealistic 3D visualizations. Upload a sketch, and the app renders a 3D interpretation you can view, compare against the original, save to a personal gallery, and optionally share to a public community feed.

The project is built on [Puter](https://puter.com) as its cloud backend, which handles serverless functions, permanent file hosting, key-value storage, and access to hosted AI models — all callable directly from the frontend, so there's no separate server to run.

## Features

- **2D-to-3D rendering** — converts flat floor plans into photorealistic 3D renders using AI image models.
- **Side-by-side comparison** — view the source sketch and its AI-generated render together.
- **Personal gallery** — every render is saved with its metadata, so your history is always one click away.
- **Persistent hosting** — uploads and outputs get permanent public URLs via Puter file storage.
- **Community feed** — share projects publicly and browse renders from other users.
- **Privacy controls** — toggle each project between public and private.
- **Export** — download finished renders for use in presentations and other workflows.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | [React](https://react.dev/) + [React Router](https://reactrouter.com/) |
| Language | [TypeScript](https://www.typescriptlang.org/) |
| Build tool | [Vite](https://vitejs.dev/) |
| Styling | [Tailwind CSS](https://tailwindcss.com/) |
| Cloud / backend | [Puter](https://puter.com) + [Puter.js SDK](https://docs.puter.com/) |
| Image comparison | [react-compare-slider](https://github.com/nerdyman/stuff/tree/main/packages/react-compare-slider) |
| Icons | [Lucide](https://lucide.dev/) |
| AI model | Gemini 2.5 Flash Image Preview (Google), served through Puter's `ai.txt2img` |

## Getting Started

### Prerequisites

Make sure you have the following installed:

- [Git](https://git-scm.com/)
- [Node.js](https://nodejs.org/en) (LTS recommended)
- npm (bundled with Node.js)

### Installation

```bash
# Clone the repository
git clone https://github.com/BhudiaMukund/roomify.git
cd roomify

# Install dependencies
npm install
```

### Running Locally

```bash
npm run dev
```

Then open [http://localhost:5173](http://localhost:5173) in your browser.

Sign-in is handled entirely by Puter — click sign in and authenticate through the Puter popup, no local account system is involved.

## Environment Variables

Create a `.env.local` file in the project root:

```env
VITE_PUTER_WORKER_URL=https://your-worker-subdomain.puter.work/
```

`VITE_PUTER_WORKER_URL` points to the [Puter Worker](https://docs.puter.com/) ([lib/puter.worker.js](lib/puter.worker.js)) that exposes the `/api/projects/save`, `/api/projects/list`, and `/api/projects/get` endpoints backing the gallery and sharing features. Deploy that worker to your own Puter account and use the URL it gives you.

## Project Structure

```
roomify/
├── app/                    # React Router routes and root layout
│   ├── root.tsx            # App shell, Puter auth state
│   └── routes/
│       ├── home.tsx        # Landing page, upload, project grid
│       └── visualizer.$id.tsx  # Compare, share, export a single render
├── components/
│   ├── Navbar.tsx
│   ├── Upload.tsx
│   └── ui/Button.tsx
├── lib/
│   ├── ai.action.ts         # Gemini image generation via Puter
│   ├── puter.action.ts      # Auth, project CRUD
│   ├── puter.hosting.ts     # Permanent file hosting on Puter
│   ├── puter.worker.js      # Puter Worker: project save/list/get API
│   ├── share.ts             # Public share page generation
│   ├── constants.ts
│   └── utils.ts
├── public/                  # Static assets
├── Dockerfile
├── vite.config.ts
└── package.json
```

## Acknowledgements

This project was built following the [Roomify tutorial](https://www.youtube.com/@javascriptmastery/videos) by JavaScript Mastery. Credit to the original walkthrough for the concept and architecture.
