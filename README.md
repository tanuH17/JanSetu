# JanSetu

**Connecting Citizens, Representatives and Public Services.** JanSetu is an independent civic-service college project. It is under development and is not an official government portal or an endorsed government service.

## Project structure

- `client/` — React, Vite, React Router, Tailwind CSS, Leaflet, and the Supabase browser client. This is the frontend you run.
- `supabase/migrations/` — ordered PostgreSQL schema, workflow, and Row Level Security migrations.
- `supabase/seed.sql` — optional department reference data.
- `supabase/provision_admin_accounts.sql` — administrator-only example for provisioning elevated accounts.
- `server/` — legacy Express/Mongoose stub. It is not used by the current app; do not start it. Supabase provides authentication, database access, and private file storage.

## Run on your computer

<<<<<<< Updated upstream
Open PowerShell in this repository folder (the folder containing this README), then run:
=======
## Current capabilities

- Responsive public landing, about, contact, privacy, and terms pages.
- Citizen sign-up and sign-in; separate representative and department sign-in portals for administrator-provisioned accounts.
- Email confirmation callback, forgot password, password reset, persistent session restore, and logout.
- Role checks read the protected profile record; choosing a portal does not grant a role.
- Citizen profile management and role-specific dashboards.
- Complaint submission with optional image attachment, tracking references, complaint details, community upvotes, and workflow tools for authorized representatives and department officials.
- Dashboard views for announcements, schemes, polls, public projects, and notifications, backed by Supabase when configured.
- PostgreSQL schema, RLS policies, role assignments, department reference data, and storage policies.

These features require a Supabase project configured with the migrations and storage setup below. JanSetu is a college application and is not connected to live government services. There is no separate general-purpose administrator role; elevated access is provisioned for representatives and department officials.

## Run locally

From the repository root:
>>>>>>> Stashed changes

```powershell
cd client
npm ci
Copy-Item .env.example .env.local
```

Open `client/.env.local` and replace the placeholder values with your Supabase **Project URL** and **anon/publishable key**. Then start the app:

```powershell
npm run dev
```

Open the local address Vite prints, usually `http://localhost:5173`. Keep that terminal open while using the app; press `Ctrl+C` to stop it. There is no separate backend command.

Run the code checks from `client/`:

```powershell
npm run lint
npm run build
```

The production-ready static site is written to `client/dist/`. To preview that build locally, run `npm run preview` after `npm run build`.

## Connect Supabase

1. Create a Supabase project and copy its Project URL and anon/publishable key from Project Settings → API into `client/.env.local`.
2. In Supabase SQL Editor, run every migration below in order. Do not run later files before earlier ones.

   1. `supabase/migrations/20261027000001_initial_schema.sql`
   2. `supabase/migrations/20261027000002_rls_hardening_role_assignments.sql`
   3. `supabase/migrations/20261027000003_scope_future_module_policies.sql`
   4. `supabase/migrations/20261111000001_complaint_tracking_and_rep_updates.sql`
   5. `supabase/migrations/20261113000002_complete_jansetu_platform.sql`
   6. `supabase/migrations/20261117000001_add_coordinates_and_multimedia.sql`
   7. `supabase/migrations/20261117000002_workflow_audit_and_private_media.sql`

3. Optionally run `supabase/seed.sql` for the department reference rows. It does not add real projects, announcements, service contacts, or statistics.
4. In Authentication → URL Configuration, set the local Site URL to `http://localhost:5173`. Add allowed redirects for `http://localhost:5173/auth/callback` and `http://localhost:5173/reset-password`.
5. In Authentication → Providers, enable email/password. Configure email confirmation and a production SMTP sender. Set the password minimum to 12 characters and enable leaked-password protection where your Supabase plan supports it.
6. Save `client/.env.local`, restart Vite if it was already running, then test registration and email delivery.

<<<<<<< Updated upstream
The migration `20261117000002_workflow_audit_and_private_media.sql` creates private media buckets and additional role-scoped policies/views. The old `supabase/storage_setup.sql` is retained only as a legacy reference; do not run it because it configures public buckets.
=======
1. Create a Supabase project. In **Project Settings → API**, copy the Project URL and anon/publishable key into `client/.env.local`.
2. In the Supabase SQL Editor, apply these files in order:
   - `supabase/migrations/20261027000001_initial_schema.sql`
   - `supabase/migrations/20261027000002_rls_hardening_role_assignments.sql`
   - `supabase/migrations/20261027000003_scope_future_module_policies.sql`
   - `supabase/migrations/20261111000001_complaint_tracking_and_rep_updates.sql`
   - `supabase/migrations/20261113000002_complete_jansetu_platform.sql`
   - Optional: `supabase/seed.sql` for reference departments (the latest platform migration also installs the core set idempotently).
3. In the SQL Editor, run `supabase/storage_setup.sql` to create storage buckets and access policies for profile avatars and complaint attachments.
4. In **Authentication → URL Configuration**, set the local Site URL to `http://localhost:5173` and allow redirect URLs `http://localhost:5173/auth/callback` and `http://localhost:5173/reset-password`. Add production URLs when deploying.
5. In **Authentication → Providers → Email**, enable email/password sign-in. Configure email confirmation and SMTP for the environment you use. The built-in email sender may be rate-limited.
6. Configure the Supabase password policy to require at least 12 characters, allow passphrases, and enable leaked-password protection where available. The app validates lengths up to 128 characters; Supabase remains the server-side authority.
>>>>>>> Stashed changes

## Email confirmation and password reset

The app sends confirmation and recovery flows through `/auth/callback`; reset links continue to `/reset-password`. Keep the redirect parameters in your Supabase email templates. Confirm that both local and deployed callback/reset URLs are in the Supabase allow-list, and verify email sending with your configured SMTP provider. The built-in sender can be rate-limited.

## Deploy/host the frontend

JanSetu is a Vite single-page app and can be deployed to a static host (for example, Vercel, Netlify, or Cloudflare Pages):

1. Connect the repository and set the project root/build directory to `client`.
2. Use `npm ci` as the install command and `npm run build` as the build command. Publish `dist` as the output directory.
3. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as build environment variables on the host. Use only the public anon/publishable key; never add a service-role key or database password.
4. Configure the host to serve `index.html` for app routes such as `/auth/callback`, `/reset-password`, and role dashboard URLs (SPA history fallback).
5. Add your deployed site URL and exact callback/reset paths to Supabase Authentication → URL Configuration, then redeploy.

The frontend is public by design; Supabase Auth, Row Level Security, database policies, and private Storage policies protect data. Hosting the static bundle alone does not provision the Supabase project or apply migrations.

## Team access and elevated accounts

Invite collaborators from the Supabase organization/project team settings and grant the least access needed. Share frontend environment values through a secure team secret store; never commit local environment files. Restrict SQL Editor and service-role access to trusted administrators.

Citizens can register through the app. Representative and department accounts must be created or approved by a trusted administrator:

<<<<<<< Updated upstream
1. Have the person register or create/invite their account in Supabase Auth.
2. Review `supabase/provision_admin_accounts.sql`; replace example email, jurisdiction, designation, and department values with verified values.
3. Run the appropriate statements in Supabase SQL Editor, then verify the profile and role assignment before granting access.
=======
- `public.profiles.role` and protected profile scope are the authorization inputs. `public.role_assignments` records trusted assignments; browser clients have no write policy for that table.
- RLS restricts profile reads, complaint reads and workflow updates, announcement creation, and project writes by role and assigned scope. Review the policies in all migrations before deploying to a real service environment.
- Citizens can read their own profile and complaint records. Representatives are scoped to their assigned constituency. Department officials are scoped to their assigned department.
- SQL Editor/migration application and Supabase Auth dashboard configuration must be performed by a project administrator.
>>>>>>> Stashed changes

Selecting a representative or department sign-in page never grants that role. Do not run the provisioning example unchanged.

## Current implementation and limits

The repository includes separate citizen, representative, and department access routes; citizen registration and password recovery; role-protected dashboards; complaint and project workflows; announcements, surveys, upvotes, notifications, map/analytics, and private media foundations. Their database behavior depends on applying the migrations and configuring a real Supabase project. Emergency assistance content is informational and does not dispatch responders.

Some operational requirements remain external: Supabase project creation and configuration, migration application, email/SMTP setup, elevated-account review, and production domain setup. No live credentials are stored in this repository.

## Verification

Run `npm run lint` and `npm run build` from `client/`. A successful local build does not verify Supabase policies or email flows. Live signup, confirmation, password reset, cross-role access, Storage authorization, and RLS cases must be tested against a configured Supabase project before deployment.
