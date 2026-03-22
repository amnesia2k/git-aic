# Schola: The Digital Future of School Management

Schola is a cutting-edge web application designed to revolutionize school administration and learning experiences for modern Nigerian educational institutions. This platform digitizes crucial operations like attendance, academics, assessments, and communication, aiming to free educators from manual paperwork and foster a more efficient, connected school environment.

## Overview

Schola is a dynamic frontend application crafted with **TypeScript** and **React**, leveraging the power of **TanStack Router** for seamless navigation and **TanStack Query** for efficient data fetching. It provides an intuitive and responsive user interface, styled with **Tailwind CSS** and **Shadcn/ui**, ensuring a modern and accessible experience across all devices.

## Usage

To experience Schola, simply navigate to the deployed application in your web browser. The application is designed to be self-explanatory, allowing you to explore its various sections and features easily.

### Navigating the Platform

- **Home Page (`/`)**: Discover the core value proposition of Schola, its key features, and testimonials.
- **About Us (`/about`)**: Learn about the vision, mission, and the dedicated team behind Schola.
- **Features (`/features`)**: Dive deep into the specific functionalities offered, covering administration, academics, communication, and data privacy.
- **Solutions (`/solutions`)**: Understand how Schola caters to different stakeholders (admins, teachers, students) and school types.
- **FAQ (`/faq`)**: Find answers to frequently asked questions about the platform, security, and onboarding.
- **Contact Us (`/contact`)**: Reach out to the Schola team for support or inquiries.
- **Waitlist (`/waitlist`)**: Join the early access program to be among the first to utilize Schola.

The user interface includes a persistent navigation bar at the top, allowing easy access to all main sections. A "Back to Top" button appears when scrolling down, ensuring a smooth user experience.

### Local Development Usage

While the primary "usage" is interacting with the deployed site, for developers, running it locally involves:

1.  **Start Development Server**:

    ```bash
    bun run dev
    ```

    This command starts the development server, typically accessible at `http://localhost:3000`. The application will automatically reload as you make changes to the source code.

2.  **Build for Production**:

    ```bash
    bun run build
    ```

    This command compiles the application for production. The optimized output will be placed in the `dist` directory, ready for deployment.

3.  **Preview Production Build**:
    ```bash
    bun run preview
    ```
    After building, this command serves the production build locally, allowing you to test the optimized version before actual deployment.

## Features

Schola is packed with features designed to streamline every aspect of school management:

- **Comprehensive School Management**: Digitizes critical operations including attendance tracking, academic record management, assessment processing, and result generation.
- **Role-Based Access Portals**: Provides tailored experiences and functionalities for different users: school administrators, teachers, and students/parents.
- **Advanced Academic Tools**: Includes a digital timetable for conflict-free scheduling, an intelligent gradebook for instant calculations, lesson planning, and an online homework submission portal.
- **Efficient Administrative Functions**: Offers a central dashboard for real-time insights, streamlined online enrollment processes, robust staff management tools, and inventory control.
- **Integrated Communication Hub**: Facilitates seamless communication through mass alerts, direct messaging between teachers and students, and a centralized event calendar.
- **Robust Data Privacy & Control**: Ensures data sovereignty and security with granular roles and permissions, comprehensive activity logs for auditing, and compliance with the Nigeria Data Protection Act (NDPA) and NDPR.
- **Modern User Experience**: Features a responsive and intuitive design, dark/light theme toggling, and smooth animations powered by `motion` for an engaging user interface.
- **Optimized Performance**: Leverages Vite for fast development and build times, and `@unpic/react` for efficient image loading.
- **SEO-Friendly Pages**: Each major page includes optimized meta tags and structured data (JSON-LD) to improve search engine visibility.

## Technologies Used

| Technology                | Description                                               | Link                                           |
| :------------------------ | :-------------------------------------------------------- | :--------------------------------------------- |
| **React**                 | A JavaScript library for building user interfaces.        | [React](https://react.dev/)                    |
| **TypeScript**            | Superset of JavaScript that adds static typing.           | [TypeScript](https://www.typescriptlang.org/)  |
| **TanStack React Router** | Declarative, file-based routing for React.                | [TanStack Router](https://tanstack.com/router) |
| **TanStack React Query**  | Powerful asynchronous state management for React.         | [TanStack Query](https://tanstack.com/query)   |
| **Vite**                  | Next-generation frontend tooling.                         | [Vite](https://vitejs.dev/)                    |
| **Tailwind CSS**          | A utility-first CSS framework.                            | [Tailwind CSS](https://tailwindcss.com/)       |
| **Shadcn/ui**             | Reusable components built with Radix UI and Tailwind CSS. | [Shadcn/ui](https://ui.shadcn.com/)            |
| **Motion**                | A production-ready animation library for React.           | [Motion](https://www.framer.com/motion/)       |
| **Unpic/react**           | Universal image component for optimized loading.          | [Unpic](https://unpic.app/)                    |
| **ESLint**                | Pluggable JavaScript linter.                              | [ESLint](https://eslint.org/)                  |
| **Prettier**              | An opinionated code formatter.                            | [Prettier](https://prettier.io/)               |

## License

Distributed under an unspecified proprietary license. All rights reserved by Schola.

## Author Info

The Schola platform is developed by a dedicated team committed to transforming education in Nigeria.

- **Abdulkareem Abdullateef** (Co-Founder & CEO)
  - LinkedIn: [https://linkedin.com/in/abdulkareem](https://linkedin.com/in/abdulkareem) (Placeholder)
  - X: [https://x.com/abdulkareem_x](https://x.com/abdulkareem_x) (Placeholder)

- **Faruq Abiodun** (Co-Founder & CPO)
  - LinkedIn: [https://linkedin.com/in/faruq](https://linkedin.com/in/faruq) (Placeholder)
  - X: [https://x.com/faruq_x](https://x.com/faruq_x) (Placeholder)

- **Olatilewa Olatoye** (Co-Founder & CTO)
  - LinkedIn: [https://linkedin.com/in/olatilewa](https://linkedin.com/in/olatilewa) (Placeholder)
  - X: [https://x.com/olatilewa_x](https://x.com/olatilewa_x) (Placeholder)

---

## Badges

![GitHub Workflow Status](https://img.shields.io/github/actions/workflow/status/schola/schola-page/ci.yml?branch=main&logo=github&style=for-the-badge)
![Vercel Deployment Status](https://img.shields.io/badge/Deployed%20on-Vercel-black?logo=vercel&style=for-the-badge)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)
[![Readme was generated by Dokugen](https://img.shields.io/badge/Readme%20was%20generated%20by-Dokugen-brightgreen)](https://www.npmjs.com/package/dokugen)
