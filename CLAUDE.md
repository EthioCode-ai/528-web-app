@AGENTS.md

## Mobile-First Development Rule

Before building ANY feature page in this web app, ALWAYS read the corresponding screen from the mobile app first:
- Mobile app location: C:\Users\abiys\Downloads\mcat-study-app\src\screens\
- Read the mobile screen file, understand the API calls, state management, and business logic
- Replicate the functionality faithfully in Next.js + Tailwind
- NEVER invent API endpoints or logic — always derive from the mobile source
- The API base URL is: https://mcat-study-app-backend.onrender.com/api

Key mobile screens to reference:
- DiagnosticScreen.js → /diagnostic
- FlashcardsScreen.js → /flashcards
- WrongAnswerJournalScreen.js → /journal
- StudyPlanScreen.js → /study-plan
- SettingsScreen.js → /settings
- ScanScreen.js → /scan

## Design System
- Light theme, Inter font, blue primary color #1a56db
- Use Tailwind CSS for all new pages
- Match the mobile app's functionality exactly

## Stores to Reference
- Mobile stores: C:\Users\abiys\Downloads\mcat-study-app\src\stores\
- Web stores: src/stores/
- Mobile API config: C:\Users\abiys\Downloads\mcat-study-app\src\config\api.js
- Web API client: src/lib/api.js (base URL via NEXT_PUBLIC_API_URL env var)
