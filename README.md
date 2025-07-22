# VPDS NLP Suggestion Tool

This project is a full-stack UI component suggestion tool that accepts natural language prompts and dynamically returns **ALL kinds of VPDS-compliant component** snippets. It includes:

- 🔤 NLP-based prompt parsing
- 🧩 Component recommendation (Rule-based)
- 🧱 Dynamic TSX code assembly with variants
- 🖼️ **Live preview** using `react-live`
- 💾 **Prompt history** stored locally
- 🌐 **Deployed on Vercel (Frontend)** + **Render (FastAPI Backend)**  
- 🎥 [Quick 3-minute Demo Video](https://youtu.be/djcmdoA3UH0)
---

## 🚀 Technical Approach

- **Frontend**:  
  Built with **React + Vite**, using `@visa/nova-react` to render component suggestions. User inputs a prompt and receives matching UI components and code snippets in real time.

- **Backend**:  
  Written in **FastAPI**, deployed on **Render.com**.  
  It uses:
  - A `suggest(prompt)` function for **rule-based keyword matching**
  - A `components/` directory containing **default and variant `.tsx` files**
  - **JS/TSX parser functions** to:
    - Strip imports/typescript
    - Parse and reassemble JSX
    - Dynamically build a previewable component with `useId`, labels, and conditional injection

- **CORS**:  
  Configured `allow_origins=["*"]` to allow frontend-backend interaction across domains (e.g. from Vercel to Render).

- **Deployment**:
  - Frontend: [`vpds-nlp-suggestion-tool.vercel.app`](https://vpds-nlp-suggestion-tool.vercel.app)
  - Backend: [`vpds-nlp-suggestion-tool-backend.onrender.com`](https://vpds-nlp-suggestion-tool-backend.onrender.com/docs#/)

## ⚠️ Render Cold Start Note

This app uses **Render free tier** for the backend, which may **sleep after 15 minutes of inactivity**. As a result:

🕒 **The first request may take ~30–60 seconds** to wake up the server.  

---

## ⚙️ Assumptions / Shortcuts

- Assumes user prompts follow **UI intent-like patterns**, e.g. _"responsive login form with remember me"_.  
  Predefined component mappings are based on official component names from [Visa Design System](https://design.visa.com/components/).

- **Rule-based logic only**: No AI/NLP model used yet, to keep backend light.
- Skips full JSX validation—if parsing fails, shows `"/* TODO: JSX not parsed */"`.

---
## 🧪 How to Test

💡 You can freely combine any official component names listed at https://design.visa.com/components/ as natural language prompts (e.g., "input", "banner", "avatar", "chips", "Combobox", "Flag", etc, or combinations like "form with input, toggle button, tooltip, and submit button").

Try prompts like:
- `Create a signup flow with name, email, password, confirm password, agree terms`
- `Dashboard with a tabs and save cancel button and date and color`
- `Navigation bar with breadcrumb and a search field`

---
## 💡 Future Improvements

With more time, I would:
- 🔍 Add **LLM/NLP model** support for semantic understanding of prompts.
- 📦 Refactor backend into **modular services** (e.g., parser, template loader).
- 🧪 Add **unit + integration tests** for extractors and file readers.
- 🎛️ Add UI to manually tweak component variants.
- 📚 Improve error handling and add **OpenAPI docs**.

---

## ✅ Bonus Points Completed

- ✅ Rule-based NLP logic
- ✅ Auto-generated React assembled component code from prompt
- ✅ Used VPDS component set (`@visa/nova-react`)
- ✅ Support for all kinds of VPDS component
- ✅ Deployed frontend (Vercel) + backend (Render) online
- ✅ Frontend renders live preview + snippet accordion
- ✅ Keyboard navigation and accessibility features
- ✅ Copy to Clipboard option and store recent queries/snippets
- ✅ Code is **modular**, well-structured, and organized in folders

