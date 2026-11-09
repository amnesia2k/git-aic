# AIC: High-Performance Generative Workflows for Git

This is the high-performance, modern landing page for **Git AIC**, a TypeScript CLI tool that automates [Conventional Commits](https://www.conventionalcommits.org/) and generates intelligent markdown diff reports using Google Gemini.

The website is designed with a premium, terminal-inspired aesthetic, featuring interactive workflow mockups, real-time GitHub stats, and a focus on developer experience.

## Overview

- **Mission**: Provide a clear, visual entry point for developers looking to automate their Git workflow with AI.
- **Visual Style**: Dark-themed "Obsidian" terminal look, glassmorphism, fluid typography, and professional motion animations.
- **Key Sections** (one page, top to bottom): Hero, Features, Commit Workflow, Diff Workflow, Tech Stack Carousel, Gemini API Key guide, OS-aware Installation steps, and the Commands reference.

## Features

- **Interactive Workflow Mockups**: Real-time terminal simulations for commit and diff flows.
- **Real-time GitHub Integration**: Dynamic star counts and release tags fetched client-side via TanStack Query and cached in localStorage for an hour (the GitHub API is called unauthenticated, 60 requests/hour per visitor).
- **OS Detection**: Tailors installation instructions based on whether the user is on macOS, Windows, or Linux.
- **Commands Reference**: Every git-aic option, command, environment variable and common recipe, with copy buttons. The data lives in `src/lib/cli-reference.ts`; keep it in sync with the CLI and the [root README](../README.md#2-command-reference).
- **Smooth Navigation**: Global smooth scrolling, scroll-margin-aware sections, and a smart scroll-to-top button.
- **Premium Aesthetics**: Tailwind CSS v4, custom glass panels, and subpixel-perfect typography.
- **Responsive Design**: Mobile-first architecture with a 75% sidebar navigation and fluid layouts.

## Development

```bash
bun install
bun run dev      # http://localhost:3000
bun run lint
bun run build    # outputs .output/ (Nitro server)
```

Deployed on Vercel: Nitro detects Vercel during the build and emits the output Vercel expects, so `vercel.json` only sets the build command.

## Technologies Used

| Technology                                                                                                             | Description                                                       |
| ---------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| ![React](https://img.shields.io/badge/React-61DAFB?style=for-the-badge&logo=react&logoColor=black)                     | Frontend library for building the UI component-by-component.      |
| ![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)                        | Lightning-fast build tool and dev server.                         |
| ![TanStack Start](https://img.shields.io/badge/TanStack_Start-FF4154?style=for-the-badge&logo=npm&logoColor=white)     | Full-stack framework for high-performance React applications.     |
| ![TanStack Router](https://img.shields.io/badge/TanStack_Router-FF4154?style=for-the-badge&logo=npm&logoColor=white)   | Type-safe, file-based routing with seamless transitions.          |
| ![TanStack Query](https://img.shields.io/badge/TanStack_Query-160440?style=for-the-badge&logo=react-query)             | Efficient data fetching and caching for real-time GitHub stats.   |
| ![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)      | Type-safe development for enterprise-grade scalability.           |
| ![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white) | Utility-first styling using version 4 for maximum performance.    |
| ![Motion](https://img.shields.io/badge/Motion-000000?style=for-the-badge&logo=framer&logoColor=white)                  | Production-ready animation library for interactive micro-moments. |
| ![Shadcn/UI](https://img.shields.io/badge/Shadcn/UI-000000?style=for-the-badge&logo=radixui&logoColor=white)           | Reusable UI components built with Radix and Tailwind.             |

## License

This project is under **Sole Proprietary Ownership**. All rights reserved.

## Author Info

Developed by **Olatilewa Olatoye** (amnesia2k).

- GitHub: [@amnesia2k](https://github.com/amnesia2k)
- LinkedIn: [Olatilewa Olatoye](https://www.linkedin.com/in/olatilewaolatoye)
- X (Twitter): [@olathedev\_](https://x.com/olathedev_)

## Badges

![Vercel Deployment Status](https://img.shields.io/badge/Deployed%20on-Vercel-black?logo=vercel&style=for-the-badge)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![React 19](https://img.shields.io/badge/React_19-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![Tailwind v4](https://img.shields.io/badge/Tailwind_v4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)
![TanStack Start](https://img.shields.io/badge/TanStack_Start-FF4154?style=for-the-badge&logo=npm&logoColor=white)

[![Readme was generated by Dokugen](https://img.shields.io/badge/Readme%20was%20generated%20by-Dokugen-brightgreen)](https://www.npmjs.com/package/dokugen)
