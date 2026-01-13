# 📗 Table of Contents

- [📖 Deckbase](#about-project)
  - [🛠 Built With](#built-with)
    - [Tech Stack](#tech-stack)
    - [Key Features](#key-features)
  - [🚀 Live Demo](#live-demo)
- [💻 Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Setup](#setup)
  - [Install](#install)
  - [Usage](#usage)
  - [Deployment](#deployment)
  - [Firebase Configuration](#firebase-configuration)
    - [Important Security Notes](#important-security-notes)
- [👥 Author](#authors)
- [🔭 Future Features](#future-features)
- [🙏 Acknowledgements](#acknowledgements)

---

# 🌟 Deckbase — AI-Powered Flashcards for Smarter Learning <a name="about-project"></a>

**Deckbase** is an AI-powered flashcard platform that helps people turn what they read into learning material instantly.  
Instead of manually creating flashcards, Deckbase lets users capture text from articles, PDFs, books, or notes and automatically converts it into well-structured flashcards optimized for long-term memory using spaced repetition.

This repository contains the **Deckbase Landing Page**, built with Next.js and Firebase. It introduces Deckbase, collects waitlist sign-ups, and stores contact submissions securely.

---

## 🏷 Git Tagging <a name="git-tagging"></a>

Use Git tags to version releases:

```sh
git tag -a v2.0.0 -m "v2.0.0"
git push origin v2.0.0
```

## 🛠 Built With <a name="built-with"></a>

### Tech Stack <a name="tech-stack"></a>

<details>
  <summary>Client (Frontend)</summary>
  <ul>
    <li><a href="https://reactjs.org/">React.js</a></li>
    <li><a href="https://nextjs.org/">Next.js</a></li>
    <li><a href="https://tailwindcss.com/">Tailwind CSS</a></li>
    <li><a href="https://formik.org/">Formik</a></li>
    <li><a href="https://github.com/jquense/yup">Yup</a></li>
    <li><a href="https://www.npmjs.com/package/react-phone-number-input">react-phone-number-input</a></li>
    <li><a href="https://framer.com/motion">Framer Motion</a></li>
  </ul>
</details>

<details>
  <summary>Backend & Data Storage</summary>
  <ul>
    <li><a href="https://firebase.google.com/">Firebase</a>
      <ul>
        <li>Firestore Database</li>
      </ul>
    </li>
  </ul>
</details>

---

### Key Features <a name="key-features"></a>

- **AI-Powered Card Generation** — Automatically create flashcards from any text using advanced AI.
- **Spaced Repetition** — Review cards at scientifically optimal intervals for maximum retention.
- **Multi-Source Import** — Capture content from PDFs, articles, books, and notes.
- **Waitlist Sign-Up** — Stores user sign-ups in Firestore.
- **Contact Form** — Allows users to send questions and messages securely.
- **Responsive UI** — Mobile-first and optimized for all devices.
- **Framer Motion Animations** — Smooth animations throughout the landing site.
- **Lightweight Design** — Gradient UI with no heavy images for fast loading.

---

## 🚀 Live Demo <a name="live-demo"></a>

👉 https://deckbase.vercel.app/

---

## 💻 Getting Started <a name="getting-started"></a>

Follow these steps to run the project locally.

---

### Prerequisites <a name="prerequisites"></a>

- Node.js 18 or higher
- npm or yarn
- A Firebase project with Firestore enabled

---

### Setup <a name="setup"></a>

Clone the repository:

```sh
git clone git@github.com:deckbase/deckbase-web-landing.git
cd deckbase-web-landing
npm install   # or yarn install
```

### Usage

To run the project, execute the following command:

#### Firebase Configuration <a name="firebase-configuration"></a>

- Firebase Project Setup:

- [] Ensure you have a Firebase project set up in the Firebase Console (https://console.firebase.google.com/).
- [] Enable Firestore Database in your Firebase project.

- Obtain Firebase Configuration:

- [] Go to "Project settings" (the gear icon next to "Project Overview") in the Firebase Console.

- [] Scroll down to the "Your apps" section and select the web app (</> icon).

- [] Copy the Firebase configuration object (the firebaseConfig object).

- Create .env.local File:

In the root directory of your Next.js project, create a file named .env.local.

- [] Add the following environment variables to the .env.local file, replacing the placeholders with your actual Firebase configuration values:

```sh
NEXT_PUBLIC_FIREBASE_API_KEY=YOUR_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=YOUR_PROJECT_ID.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=YOUR_PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=YOUR_PROJECT_ID.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=YOUR_MESSAGING_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID=YOUR_APP_ID
```

Firebase Security Rules: Configure your Firebase Security Rules in the Firebase Console to protect your data from unauthorized access. The following are to be implemented

```sh
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /leads/{document} {
      allow read, write: if request.auth != null;
    }
    match /contacts/{document} {
      allow read, write: if request.auth != null;
    }
  }
}
```

#### Run the project

```sh
  npm run dev  # or yarn dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
