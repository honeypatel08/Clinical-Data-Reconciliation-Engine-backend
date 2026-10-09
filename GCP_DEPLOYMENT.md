# Deploy the clinical application to Google Cloud

This project uses the following hosted components:

- GitHub Pages for the existing React frontend
- Cloud Run for the Node.js API
- Cloud SQL for PostgreSQL
- Secret Manager for passwords, the JWT signing secret, and the Gemini API key

Cloud SQL is the persistent database. The backend creates its tables and initial admin user automatically when it starts. Creating a Cloud SQL instance, database, and database user is still required before deploying the API.

## Current deployment

```text
Project: project-95ac5102-d083-4bd4-848
Region: us-east1
Cloud Run service: clinical-reconciliation-api
Backend URL: https://clinical-reconciliation-api-1050633691522.us-east1.run.app
Cloud SQL instance: clinical-db
Database: clinical_app
Database user: clinical_user
Admin email: configured through the `ADMIN_EMAIL` Cloud Run variable
Gemini model: gemini-3.8-flash
```

The deployed secret versions are pinned in Cloud Run. Retrieve the generated admin password when needed with:

```bash
CLOUDSDK_PYTHON=/opt/homebrew/opt/python@3.14/bin/python3.14 \
  gcloud secrets versions access 2 \
  --secret=clinical-admin-password \
  --project=project-95ac5102-d083-4bd4-848
```

## 1. Choose names

The examples use:

```text
Project: your-project-id
Region: us-east1
Cloud Run service: clinical-reconciliation-api
Cloud SQL instance: clinical-db
Database: clinical_app
Database user: clinical_user
Service account: clinical-run
```

Replace `your-project-id`, `admin@example.com`, and all secret values with real values.

## 2. Prepare Google Cloud

Create a Google Cloud project, attach billing, open Cloud Shell, and run:

```bash
gcloud config set project your-project-id

gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com \
  sqladmin.googleapis.com \
  secretmanager.googleapis.com
```

## 3. Create PostgreSQL in Cloud SQL

In Google Cloud Console, open **SQL**, choose **Create instance**, and select PostgreSQL.

Use these settings for the demo:

```text
Instance ID: clinical-db
PostgreSQL: 15
Edition: Enterprise
Region: us-east1
Availability: Single zone
Machine: db-f1-micro shared core
Storage: smallest available setting
```

After the instance is ready:

1. Open **Databases** and create `clinical_app`.
2. Open **Users** and create `clinical_user` with a strong password.
3. Copy the instance connection name from the Overview page. It should resemble `your-project-id:us-east1:clinical-db`.

The instance has an ongoing cost while it exists. Cloud Run can scale to zero, but the Cloud SQL instance does not.

## 4. Create application secrets

In **Security > Secret Manager**, create these secrets:

| Secret | Stored value |
| --- | --- |
| `clinical-db-password` | Password for `clinical_user` |
| `clinical-jwt-secret` | Long random JWT signing value |
| `clinical-gemini-key` | Gemini API key |
| `clinical-admin-password` | Password for the application admin |

Generate a JWT secret locally with `openssl rand -base64 48`.

## 5. Create the runtime identity

Run in Cloud Shell:

```bash
gcloud iam service-accounts create clinical-run \
  --display-name="Clinical Cloud Run service"

gcloud projects add-iam-policy-binding your-project-id \
  --member="serviceAccount:clinical-run@your-project-id.iam.gserviceaccount.com" \
  --role="roles/cloudsql.client"

gcloud projects add-iam-policy-binding your-project-id \
  --member="serviceAccount:clinical-run@your-project-id.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

## 6. Deploy the backend

Install the Google Cloud CLI on the development machine and authenticate:

```bash
gcloud auth login
gcloud config set project your-project-id
```

Run the deployment from the directory containing the backend `package.json`:

```bash
cd backend

gcloud run deploy clinical-reconciliation-api \
  --source . \
  --region us-east1 \
  --allow-unauthenticated \
  --service-account clinical-run@your-project-id.iam.gserviceaccount.com \
  --add-cloudsql-instances your-project-id:us-east1:clinical-db \
  --set-env-vars INSTANCE_CONNECTION_NAME=your-project-id:us-east1:clinical-db,DB_USER=clinical_user,DB_NAME=clinical_app,DB_POOL_SIZE=5,ADMIN_EMAIL=admin@example.com,CORS_ORIGIN=https://honeypatel08.github.io,GEMINI_MODEL=gemini-3.8-flash \
  --set-secrets DB_PASSWORD=clinical-db-password:latest,JWT_SECRET=clinical-jwt-secret:latest,GEMINI_API_KEY=clinical-gemini-key:latest,ADMIN_PASSWORD=clinical-admin-password:latest \
  --memory 512Mi \
  --min-instances 0 \
  --max-instances 2 \
  --timeout 300
```

Copy the Cloud Run URL printed after deployment.

## 7. Verify the API and database

```bash
curl https://your-cloud-run-url/ping
curl https://your-cloud-run-url/health
```

Expected health response:

```json
{"status":"ok","database":"connected"}
```

Test the generated admin account:

```bash
curl -X POST https://your-cloud-run-url/api/auth/log-in \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"your-admin-password"}'
```

Read deployment logs if startup fails:

```bash
gcloud run services logs read clinical-reconciliation-api \
  --region us-east1 \
  --limit 100
```

## 8. Build and deploy the frontend

In the frontend's `frontend` directory, create `.env.production`:

```text
VITE_API_URL=https://your-cloud-run-url
```

Then run:

```bash
npm install
npm run build
npm run deploy
```

The frontend reads this value through `src/config.js`. The production environment file is intentionally ignored so a deployment URL can be selected without committing local configuration.

## 9. Interview checks

1. Open `https://your-cloud-run-url/health` and confirm the database is connected.
2. Log in with the admin account.
3. Register a demo provider, approve it as admin, and log in as that provider.
4. Run both AI workflows using synthetic data.
5. Confirm approvals appear in History.
6. Confirm the Gemini project still has quota. Moving the API to Cloud Run does not change Gemini API limits.

For the interview only, setting the Cloud Run minimum instance count to one can avoid a cold start. Return it to zero afterward to reduce cost.
