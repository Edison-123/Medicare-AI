# MediCare Frontend + Backend Integration

This project is configured as a real React/Vite frontend connected to the Spring Boot MediCare backend.

## Authentication

The frontend no longer uses demo credentials or a frontend role switcher.

Login is always sent to:

`POST /api/auth/login`

The backend validates the email and BCrypt password against the `users` table in MySQL and returns a JWT plus the authenticated user role. The frontend stores that session and routes the user to:

- `ROLE_ADMIN` -> `/admin/dashboard`
- `ROLE_DOCTOR` -> `/doctor/dashboard`
- `ROLE_PATIENT` -> `/patient/dashboard`

## Local development

Backend:

```powershell
cd mediacare-backend
# Configure your existing local, untracked .env with private database, JWT, and seed-user values.
# MEDICARE_JWT_SECRET must be Base64 and decode to at least 32 bytes.
mvn clean spring-boot:run
```

Frontend:

```powershell
cd mediacare
npm install
npm run dev
```

Vite proxies `/api` to `http://localhost:8080`, so the browser calls the same API origin used by the application.

## Database

The included backend uses MySQL:

- Host: `localhost`
- Port: `3306`
- Database: `medicare_db`
- Username: `root`
- Set `MYSQL_PASSWORD` and `SEED_USER_PASSWORD` in your existing local `.env` file; Git ignores this file.
- `SEED_USER_PASSWORD` is required to seed local accounts on first startup.

## Admin patient registration

The Admin -> Patients screen now has **Register Patient**. It calls:

`POST /api/admin/patients`

The backend creates both:

1. a `users` row with `ROLE_PATIENT` and a BCrypt password
2. a matching `patients` row

After registration, the patient can sign in from the normal login screen using the email/password entered by the administrator.

## JWT handling

Authenticated API calls automatically send:

`Authorization: Bearer <JWT>`

A 401 response clears the frontend session and sends the user back to login.

## Important

`VITE_USE_MOCK=false` is fixed for this integrated build. The application should be run with the included Spring Boot backend rather than the old frontend mock data.
