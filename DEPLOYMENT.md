# Deployment (Google Cloud)

I'd deploy both parts as containers on **Cloud Run**. It runs a Docker image, gives you an HTTPS URL, scales up and down on its own (even to zero), and there are no servers or Kubernetes to manage.

## Setup

```
User's browser
     │
     ├──▶ Cloud Run: frontend  (nginx serving the React build)
     │
     └──▶ Cloud Run: backend   (Node/Express API) ──▶ Claude API (Anthropic)
                    │
                    └── reads ANTHROPIC_API_KEY and JWT_SECRET from Secret Manager
```

| What | GCP service |
|---|---|
| Run the containers | Cloud Run (one service for the backend, one for the frontend) |
| Store the Docker images | Artifact Registry |
| Store secrets (API key, JWT secret) | Secret Manager |
| Logs | Cloud Logging (Cloud Run sends `console.log` there automatically) |

## Steps

Each step below has the `gcloud` commands. If you prefer clicking, every step can also be done in the **Google Cloud Console** (console.cloud.google.com), and a **Console** line under each step says where. For anything that needs a terminal (like `docker build`), **Cloud Shell** (the `>_` icon at the top of the console) has `gcloud` and `docker` ready to use in the browser.

**1. One-time setup**

```bash
PROJECT_ID=my-project
REGION=europe-north1
REPO=$REGION-docker.pkg.dev/$PROJECT_ID/ai-query

gcloud config set project $PROJECT_ID
gcloud services enable run.googleapis.com artifactregistry.googleapis.com secretmanager.googleapis.com cloudbuild.googleapis.com
gcloud artifacts repositories create ai-query --repository-format=docker --location=$REGION
gcloud auth configure-docker $REGION-docker.pkg.dev
```

> **Console:** pick the project from the top bar → **APIs & Services → Library**, and enable Cloud Run, Artifact Registry, Secret Manager and Cloud Build → **Artifact Registry → Repositories → Create repository** (name `ai-query`, format Docker, region `europe-north1`).

**2. Save the secrets** (they never go into the code or the image)

```bash
printf "sk-ant-your-real-key" | gcloud secrets create anthropic-api-key --data-file=-
openssl rand -base64 48 | tr -d '\n' | gcloud secrets create jwt-secret --data-file=-
```

The Cloud Run service account needs the **Secret Manager Secret Accessor** role to read them.

> **Console:** **Security → Secret Manager → Create secret**. Create `anthropic-api-key` with your key as the value, and `jwt-secret` with a long random string. Then go to **IAM & Admin → IAM**, find the Compute Engine default service account (Cloud Run uses it), and add the role *Secret Manager Secret Accessor*.

**3. Deploy the backend**

```bash
gcloud builds submit backend --tag $REPO/backend:v1

gcloud run deploy ai-query-backend \
  --image $REPO/backend:v1 \
  --region $REGION \
  --allow-unauthenticated \
  --set-secrets ANTHROPIC_API_KEY=anthropic-api-key:latest,JWT_SECRET=jwt-secret:latest \
  --set-env-vars NODE_ENV=production,ENABLE_DEMO_LOGIN=true \
  --timeout 180 \
  --max-instances 5
```

- `--allow-unauthenticated` only means Google won't block requests itself. Our own JWT check still protects `/api/query`.
- `--timeout 180` gives slow LLM answers enough time to finish.
- `--max-instances 5` caps the cost.
- Cloud Run sets the `PORT` variable itself, and the backend already reads it.

Copy the backend URL from the output, for example `https://ai-query-backend-xxxx.run.app`.

> **Console:** build the image with the first command in Cloud Shell (or connect GitHub under **Cloud Build → Triggers**). Then **Cloud Run → Deploy container → Service**:
> - **Container image URL:** select `ai-query/backend:v1` from Artifact Registry
> - **Service name:** `ai-query-backend`, **Region:** `europe-north1`
> - **Authentication:** *Allow unauthenticated invocations*
> - **Container(s) → Variables & Secrets:**
>   - add env vars `NODE_ENV=production` and `ENABLE_DEMO_LOGIN=true`
>   - **Reference a secret:** `ANTHROPIC_API_KEY` → `anthropic-api-key` (latest), and `JWT_SECRET` → `jwt-secret` (latest)
> - **Request timeout:** 180 seconds, **Maximum instances:** 5
> - Click **Create**. The URL appears at the top of the service page.

**4. Deploy the frontend** (the backend URL gets baked into the React build)

```bash
docker build --build-arg VITE_API_BASE_URL=https://ai-query-backend-xxxx.run.app -t $REPO/frontend:v1 frontend
docker push $REPO/frontend:v1

gcloud run deploy ai-query-frontend --image $REPO/frontend:v1 --region $REGION --allow-unauthenticated
```

> **Console:** run the `docker build` and `docker push` commands in Cloud Shell, because the backend URL has to be passed in at build time. Then **Cloud Run → Deploy container → Service**: pick `ai-query/frontend:v1`, name it `ai-query-frontend`, choose *Allow unauthenticated invocations*, and click **Create**.

**5. Allow the frontend to call the backend (CORS)**

```bash
gcloud run services update ai-query-backend --region $REGION \
  --update-env-vars CORS_ORIGINS=https://ai-query-frontend-xxxx.run.app
```

> **Console:** **Cloud Run → ai-query-backend → Edit & deploy new revision → Variables & Secrets**. Add `CORS_ORIGINS` = the frontend URL and click **Deploy**.

Open the frontend URL and it works.

## Updating the app

Build a new image tag (`v2`) and run `gcloud run deploy` again. Cloud Run switches traffic over with no downtime. To roll back, open **Cloud Run → your service → Revisions → Manage traffic** in the console, and send 100% to the previous revision. With the CLI, use `gcloud run services update-traffic`.

Logs: **Cloud Run → your service → Logs** tab (or **Logging → Logs Explorer**).

To automate this, a GitHub Actions workflow on every push to `main` would:
1. Run the tests (`npm test`)
2. Build and push both images
3. Run `gcloud run deploy`

It would log in to GCP with **Workload Identity Federation**, so no GCP keys are stored in GitHub.

## Before real production

- **Turn off the demo login:** set `ENABLE_DEMO_LOGIN=false` and use a real login (Google Identity Platform, or the company's SSO).
- **Shared rate limiting:** the rate limiter keeps its counts in memory, so with more than one instance each one counts separately. Moving the counts to Memorystore (Redis) fixes that.
- **Spend alerts:** add a budget alert in GCP Billing, and one on the Anthropic side too. The LLM tokens cost far more than Cloud Run does.

## Same setup on Azure or AWS

| GCP | Azure | AWS |
|---|---|---|
| Cloud Run | Azure Container Apps | ECS Fargate (or App Runner) |
| Artifact Registry | Azure Container Registry | ECR |
| Secret Manager | Key Vault | Secrets Manager |
| Cloud Logging | Azure Monitor / Log Analytics | CloudWatch |
| Workload Identity Federation | GitHub OIDC with Entra ID | GitHub OIDC with an IAM role |
