# Word of the Day

A full-stack Next.js web application for a daily word vocabulary builder.
It is built on free-tier infrastructure using Next.js (Vercel), Firebase, Resend, and Gemini.

## Tech Stack
- **Frontend & Backend**: Next.js (App Router), Tailwind CSS
- **Database & Auth**: Firebase (Spark Free Plan)
- **Email Delivery**: Resend (Free Tier)
- **Automation**: Vercel Cron Jobs
- **AI Content**: Google Gemini (via offline scripts)

---

## 1. Firebase Setup (Spark Plan)

1. Go to the [Firebase Console](https://console.firebase.google.com/) and create a new project.
2. Under **Build > Authentication**, enable **Email/Password** sign-in.
3. Under **Build > Firestore Database**, create a database (Start in Production mode).
4. Go to **Project Settings > General** and add a Web App. Copy the config to use in step 4 below.
5. Go to **Project Settings > Service Accounts** and generate a new private key. This will download a JSON file.

## 2. Resend Setup

1. Sign up at [Resend](https://resend.com/).
2. Verify your sending domain (required to ensure emails land in the inbox and not spam).
3. Create an API Key.

## 3. Gemini Setup

1. Get a [Google Gemini API Key](https://aistudio.google.com/app/apikey).

## 4. Environment Variables

Create a `.env.local` file in the root of the project and add the following keys:

```env
# Client-side Firebase config
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# Server-side Firebase Admin (from Service Account JSON)
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_CLIENT_EMAIL=your_client_email
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# Resend
RESEND_API_KEY=re_your_api_key

# Gemini (for offline scripts)
GEMINI_API_KEY=your_gemini_api_key

# Security for your Cron Job
CRON_SECRET=super_secret_string_here

# Next JS App URL
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## 5. Deployment & Vercel Cron

1. Push this repository to GitHub.
2. Import the project in Vercel.
3. Add **all** the environment variables from your `.env.local` into the Vercel project settings.
4. Deploy the project. Vercel will automatically detect the `vercel.json` and configure the daily cron job to run at 06:00 UTC.

## 6. Offline Data Generation (Run locally)

To keep ongoing costs at $0, we generate words via a standalone script, then seed them to Firestore.

1. Install `tsx` globally or run it via npx:
   ```bash
   npx tsx scripts/generate-words.ts
   ```
   This will generate a `words.json` file inside `scripts/` using Gemini.

2. Seed the generated words to Firestore:
   ```bash
   npx tsx scripts/seed-words.ts
   ```

## 7. Security Rules

Don't forget to deploy your Firestore security rules. You can use the Firebase CLI:
```bash
npx firebase-tools login
npx firebase-tools init firestore
npx firebase-tools deploy --only firestore:rules
```
Or simply copy the contents of `firestore.rules` into the Firebase Console -> Firestore Database -> Rules tab and publish.
