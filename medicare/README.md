# MediCare AI

The frontend uses the Spring Boot API for authentication and application data. Vite proxies `/api` to `http://localhost:8080`.

```powershell
npm install
npm run dev
```

Copy `.env.example` to `.env` if you need to change `VITE_API_BASE_URL`. Demo accounts and mock data are not included; users must be provisioned in the backend database.
