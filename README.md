# Clinical-Data-Reconciliation-Engine-backend

Note: Project has been deployed on railway. You can test the live version here: https://honeypatel08.github.io/Clinical-Data-Reconciliation-Engine_frontend/#/

Local Run:
1. Clone repository
2. cd backend
3. Install dependencies: npm install
4. create .env:
    PORT= <PORT>
    ADMIN_EMAIL=<your-admin-email>
    ADMIN_PASSWORD=<your-admin-password>
    ADMIN_PASS=<your-admin-password-for-email>
    GEMINI_API_KEY=<your-gemini-api-key>
    JWT_SECRET=<your-jwt-secret>
    DATABASE_URL=<your-database-url>
6. Run the backend: npm run dev

Key Design Decisions: 
1. Node.js + Express: clean, fast, and widely used for REST APIs.
2. JWT Authentication: Manages user sessions and role-based access control.
3. Role-Based Access Control: Admin and healthcare provider endpoints clearly separated.
4. Caching & Rate-Limiting Middleware: Reduces unnecessary Gemini API calls and improves performance.
5. Error Handling: debugging and ensures consistent API responses.

Trade-offs: 
1. AI request caching handled on backend using database; 
