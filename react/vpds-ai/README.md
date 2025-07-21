# Visa UI Prompt-to-Component Frontend (React)

This is the frontend portion of the "Natural Language → Component Suggestion Tool" take-home assignment for Visa Design System Engineering.

## 🧩 Project Summary

This web app allows developers to describe a desired UI using natural language, and receive:

- Suggested components from the **Visa Nova Design System**
- A live-previewable, assembled code snippet using those components
- Variant selection for components
- Copy-to-clipboard for generated code and recent queries

This repository contains the **React + Vite** frontend only.

## ✨ Core Features

- 📝 **Prompt input**: Describe the UI using free-form natural language
- 🧠 **Component suggestions**: Based on rule-based mapping from keywords
- 🧩 **Variant selection**: Dynamically pick component variant for each match
- 👀 **Live preview**: Real-time rendering of the composed code using `react-live`
- 🧠 **Keyboard support**: 
  - `Ctrl + Enter` to suggest
  - `Ctrl + Shift + A` to reassemble
- 💾 **Recent snippet history**: Stores up to 10 prompt+code pairs in localStorage
- 📋 **Copy-to-clipboard**: For fast developer usage

## 🛠️ Tech Stack

- **React + Vite** for a fast frontend dev experience
- **@visa/nova-react** for design system UI components
- **react-live** for interactive component preview
- **localStorage** for caching recent suggestions

## 🚀 How to Run Locally

```bash
cd react\vpds-ai
npm install
npm run dev


