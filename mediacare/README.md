# MediCare AI — frontend (Phase 1–3 + Doctor dashboard & Patients)
npm install && npm run dev   # mock mode by default (see .env.example)
Logins (any password): doctor@medicare.ai · patient@medicare.ai · admin@medicare.ai
Swap to the Spring Boot API: set VITE_USE_MOCK=false (Vite proxies /api -> localhost:8080).
All data access goes through src/services/api; mock data lives only in src/mockData.
