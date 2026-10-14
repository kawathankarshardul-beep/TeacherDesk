# TeacherDesk

TeacherDesk is a React and Vite classroom workspace backed by Supabase. It includes student records, attendance, assessments, report cards, AI teaching tools, learning signals, and a class calendar.

## Local setup

1. Install dependencies with `npm install`.
2. Create `.env.local` with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
3. Apply SQL migrations in `supabase/migrations` to the linked Supabase project.
4. Deploy the `teacherdesk-ai` Edge Function and configure OpenRouter credentials as server-side secrets.
5. Start the app with `npm run dev`.

Never put an OpenRouter API key in a `VITE_` environment variable or browser code.
Add the deployed app URL to Supabase Auth's allowed redirect URLs so password-reset links return to the app.

## Vercel deployment

Vercel can deploy this Vite app from the linked GitHub repository using `npm run build` and the `dist` output directory. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in the Vercel project's environment variables for Preview and Production. The `teacherdesk-ai` Supabase Edge Function and its OpenRouter server-side secret must be configured separately; a successful frontend deployment does not verify AI generation.

## Lesson plans and classroom games

Lesson, revision, and game tools accept class size, lesson duration, and available materials. AI requests ask for timed teacher/student steps, presentation outlines, playable rules, scoring, individual understanding checks, and adaptations. If the AI service is unavailable, TeacherDesk creates an editable offline plan/game pack from the provided syllabus text; the template does not invent answer keys or subject facts. Review all generated content before class.

## Calendar

The Calendar page supports repeating weekly lessons and dated class events. Apply `supabase/migrations/20261013000000_create_class_calendar.sql` and `supabase/migrations/20261013100000_add_calendar_lesson_plan.sql` in Supabase. Weekly lessons can store a systematic teaching outline; generate a lesson in AI Studio, then use “Use latest lesson draft” when adding that weekly calendar lesson. Calendar access is based on `teacher_profiles`; ensure each teacher has an administrator-managed profile with the correct class. The configured administrator can manage any listed class.

## Validation

- `npm run test` runs focused domain and teaching-plan tests.
- `npm run lint` checks source files.
- `npm run build` creates the production bundle.
