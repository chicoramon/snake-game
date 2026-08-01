# Google Cloud Arcade Announcer Setup

The arcade announcer is a private batch job. Gemini never runs in the browser, and no Google or Supabase secret is included in the GitHub Pages build.

## What is needed from the Google Cloud account

Provide or choose:

- The Google Cloud **project ID**. This value is not secret.
- A Cloud Run region. The default used below is `europe-west1`.
- A Vertex AI location. The default is `global`.
- Permission to enable APIs, create service accounts, deploy Cloud Run Jobs, create a secret, and add a Scheduler trigger.

Do **not** send a service-account JSON key, Gemini API key, or Supabase service-role key in chat. Cloud Run uses its service identity for Gemini. Enter the Supabase service-role key directly into Google Secret Manager.

## One-time Google Cloud preparation

Run these commands in Google Cloud Shell after replacing `YOUR_PROJECT_ID` and `YOUR_SUPABASE_URL`:

```bash
export PROJECT_ID="loyal-copilot-156714"
export RUN_REGION="europe-west1"
export RUNTIME_SA="snake-announcer-generator@${PROJECT_ID}.iam.gserviceaccount.com"

gcloud config set project "$PROJECT_ID"
gcloud services enable \
  aiplatform.googleapis.com \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com \
  secretmanager.googleapis.com \
  cloudscheduler.googleapis.com

gcloud iam service-accounts create snake-announcer-generator \
  --display-name="Snake Arcade Announcer Generator"

gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:${RUNTIME_SA}" \
  --role="roles/aiplatform.user"
```

Create the Supabase secret interactively, so it is not written to shell history:

```bash
read -s SUPABASE_SERVICE_ROLE_KEY
printf %s "$SUPABASE_SERVICE_ROLE_KEY" | \
  gcloud secrets create snake-supabase-service-role --data-file=-
unset SUPABASE_SERVICE_ROLE_KEY

gcloud secrets add-iam-policy-binding snake-supabase-service-role \
  --member="serviceAccount:${RUNTIME_SA}" \
  --role="roles/secretmanager.secretAccessor"
```

## Deploy the generator

From the repository root in a shell with `gcloud` installed:

```bash
gcloud run jobs deploy snake-announcer-generator \
  --source=services/announcer-generator \
  --region="$RUN_REGION" \
  --service-account="$RUNTIME_SA" \
  --set-env-vars="GOOGLE_CLOUD_PROJECT=${PROJECT_ID},GOOGLE_CLOUD_LOCATION=global,GEMINI_MODEL=gemini-2.5-flash,SNAKE_SUPABASE_URL=https://suuwudlnsapyvthjscwp.supabase.co" \
  --set-secrets="SNAKE_SUPABASE_SERVICE_ROLE_KEY=snake-supabase-service-role:latest" \
  --max-retries=1 \
  --task-timeout=10m
```

Run it once manually and inspect the result before scheduling it:

```bash
gcloud run jobs execute snake-announcer-generator \
  --region="$RUN_REGION" \
  --wait
```

The job creates a draft content pack, validates every line deterministically, asks Gemini for a second structured review, and only then marks the pack published. A failed generation never replaces the currently published material.

## Schedule without manual content work

The recommended starting cadence is weekly, Monday at 03:15 UTC. In Google Cloud Console, open the Cloud Run Job, choose **Triggers**, then **Add Scheduler Trigger**. Use:

- Frequency: `15 3 * * 1`
- Time zone: `UTC`
- A scheduler service account with Cloud Run Invoker permission on this job

The cadence can be changed later without changing the game deployment.

## Supabase preparation

Run [`supabase-player-career-announcer.sql`](./supabase-player-career-announcer.sql) in the Supabase SQL editor before deploying the job. It creates:

- idempotent lifetime run-event storage and aggregate career stats;
- RPCs used by authenticated/device-bound players;
- versioned announcer packs and validated template lines;
- per-player impression history for repetition control.

The Gemini job gets the service-role secret. The browser continues using only the existing public Supabase client credentials.

## Local generator validation

```bash
cd services/announcer-generator
npm install
npm test
```

Local calls to Vertex AI should use Application Default Credentials (`gcloud auth application-default login`), never a checked-in key file.
