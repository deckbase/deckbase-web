import { v4 as uuid } from "uuid";

export const privacyPolicy = [
  {
    id: uuid(),
    title: "Information We Collect",
    text: "Deckbase is designed with privacy in mind. We collect only the minimum information necessary to provide our services. Depending on how you use the app, we may collect the following:",
    subtext: "a. Account Information (Optional)",
    subtext2: "If you create an account for cloud sync, we collect:",
    list: ["Email address", "Display name (optional)", "Authentication tokens"],
    addition:
      "You can use Deckbase without an account, in which case no personal information is collected.",
    subtext3: "b. Learning Data",
    subtext4:
      "To provide spaced repetition and analytics features, we store your flashcards, review history, and progress data. This data is stored locally on your device and optionally synced to our secure cloud if you enable cloud sync.",
    subtext5: "c. Usage Analytics (Optional & Anonymous)",
    subtext6:
      "To improve the app, we may collect anonymized usage data such as feature usage patterns and crash reports. This data does not contain personal identifiers.",
  },
  {
    id: uuid(),
    title: "How We Use Information",
    text: "We use collected data only for:",
    list: [
      "Providing flashcard creation and spaced repetition services",
      "Syncing your data across devices (if cloud sync is enabled)",
      "Improving app performance and features",
      "Providing learning analytics and insights",
    ],
    addition:
      "We never sell, rent, or share your data with third parties for advertising or marketing purposes.",
  },
  {
    id: uuid(),
    title: "AI Processing",
    text: "When you use AI to generate flashcards, your text is processed by our AI systems to extract key concepts and create study materials. We do not store or use your input text beyond the immediate processing required to generate flashcards. Generated flashcards are stored only in your personal library.",
  },
  {
    id: uuid(),
    title: "Third-Party Services",
    text: "Deckbase may integrate trusted third-party services to provide functionality:",
    list: [
      "Firebase (Google LLC) — for authentication, cloud sync, and anonymized analytics",
      "OpenAI — for AI-powered flashcard generation",
      "RevenueCat — for managing subscriptions and purchases",
    ],
    addition:
      "Each third party adheres to GDPR and CCPA-compliant standards. You can review their privacy policies on their respective websites.",
  },
  {
    id: uuid(),
    title: "Data Retention and Deletion",
    text: "Your flashcards and learning data are retained as long as you use Deckbase. If you delete your account, all associated data will be permanently removed from our servers within 30 days. You can export your data at any time before deletion.",
  },
  {
    id: uuid(),
    title: "Security",
    text: "We follow industry-standard practices to protect your information from unauthorized access, alteration, or disclosure. Your data is encrypted in transit and at rest. We regularly update our security measures to maintain the highest level of protection.",
  },
  {
    id: uuid(),
    title: "Children's Privacy",
    text: "Deckbase is not intended for children under 13. We do not knowingly collect personal information from children. If we discover such data, it will be deleted immediately.",
  },
  {
    id: uuid(),
    title: "Your Rights",
    text: "Depending on your region, you may have the right to:",
    list: [
      "Access, correct, or delete your personal data",
      "Export your flashcards and learning data",
      "Withdraw consent to data processing",
      "Request a copy of your stored data",
    ],
    addition:
      "To exercise these rights, please contact us through our contact form or in-app settings.",
  },
  {
    id: uuid(),
    title: "Changes to This Policy",
    text: "We may update this Privacy Policy periodically. The latest version will always be available within the app and on our official website. Material changes will be communicated clearly through in-app notices.",
  },
  {
    id: uuid(),
    title: "Contact Us",
    text: "If you have any questions or concerns about this Privacy Policy or how Deckbase handles your data, please reach out through our contact form.",
  },
];
