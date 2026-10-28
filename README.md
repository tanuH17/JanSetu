# JanSetu

**Connecting Citizens, Representatives and Public Services.** JanSetu is an independent college project developing a public-service and constituency management platform. It is not an official government portal and has no government endorsement or live government integration.

## Project layout

- `client/` — React 19, Vite, React Router, Tailwind CSS, and Supabase JS browser app.
- `supabase/migrations/` — reproducible PostgreSQL schema and Row Level Security policies.
- `supabase/seed.sql` — optional reference department names only; it contains no live service contacts or sample project claims.
- `supabase/provision_admin_accounts.sql` — administrator-run provisioning example for representative and department accounts.
- `server/` — unused legacy Express/Mongoose stub. V1 does not run it and does not use MongoDB.

The browser uses Supabase Auth and the public anon/publishable key. There is no custom server for ordinary Auth or RLS-protected queries.

## V1 capabilities

- Responsive public landing, about, contact, privacy, and terms pages.
- Citizen sign-up and sign-in; separate representative and department sign-in portals for administrator-provisioned accounts.
- Email confirmation callback, forgot password, password reset, persistent session restore, and logout.
- Role checks read the protected profile record; choosing a portal does not grant a role.
- Citizen profile view/update and role-specific dashboard foundations.
- PostgreSQL schema with RLS, role assignments, department reference data, and policy scope for dormant modules.

Complaint submission and status history, surveys, upvotes, announcements, project workflows, notifications, emergency contacts, and an admin UI are reserved for later phases. Their dashboard areas are labelled as planned and do not simulate successful actions.

## Run locally

From the repository root:

```powershell
cd JanSetu/client
npm ci
Copy-Item .env.example .env.local
# Edit .env.local with your Supabase Project URL and anon/publishable key.
npm run dev
```

The frontend runs at the URL Vite prints (normally `http://localhost:5173`). Do not start the unused `server/` stub.

Checks:

```powershell
npm run lint
npm run build
```

## Environment

Copy `client/.env.example` to `client/.env.local` and set:

- `VITE_SUPABASE_URL` — Supabase project URL.
- `VITE_SUPABASE_ANON_KEY` — public anon/publishable key only.

Never put the service-role key, database password, or any privileged secret in a `VITE_` variable. `.env` and `.env.local` are gitignored.

## Supabase setup

1. Create a Supabase project. In **Project Settings → API**, copy the Project URL and anon/publishable key into `client/.env.local`.
2. In the Supabase SQL Editor, apply these files in order:
   - `supabase/migrations/20261027000001_initial_schema.sql`
   - `supabase/migrations/20261027000002_rls_hardening_role_assignments.sql`
   - `supabase/migrations/20261027000003_scope_future_module_policies.sql`
   - Optional: `supabase/seed.sql` for department names only.
3. In **Authentication → URL Configuration**, set the local Site URL to `http://localhost:5173` and allow redirect URLs `http://localhost:5173/auth/callback` and `http://localhost:5173/reset-password`. Add production URLs when deploying.
4. In **Authentication → Providers → Email**, enable email/password sign-in. Configure email confirmation and SMTP for the environment you use. The built-in email sender may be rate-limited.
5. Configure the Supabase password policy to require at least 12 characters, allow passphrases, and enable leaked-password protection where available. The app validates lengths up to 128 characters; Supabase remains the server-side authority.

### Confirmation and password reset

Registration sends the user to `/auth/callback`; password recovery redirects through `/auth/callback?type=recovery` to `/reset-password`. Email templates must preserve the Supabase confirmation/recovery link parameters. Test email delivery after configuring SMTP and allowed redirect URLs.

### Team access

Invite teammates from the Supabase organization/project team settings with the least privilege their work needs. Share the public anon key for frontend development. Restrict access to SQL Editor and service-role credentials to trusted administrators; never commit privileged keys.

### Provision elevated accounts

Citizens register in the app. Representatives and department officials cannot self-assign roles. A trusted Supabase project administrator should:

1. Have the intended user register (or create/invite them through Supabase Auth).
2. Edit `supabase/provision_admin_accounts.sql`, replacing example emails and jurisdiction/department values.
3. Run the appropriate profile update and role-assignment insert in SQL Editor. Verify the profile role and assignment record before the person uses the corresponding sign-in portal.

The profile role, department, verification status, and elevated jurisdiction are protected from account-holder edits. Never grant access based only on which sign-in page was used.

## Authorization notes

- `public.profiles.role` and protected profile scope are the authorization inputs. `public.role_assignments` records trusted assignments; browser clients have no write policy for that table.
- RLS restricts profile reads, complaint reads, announcement creation, and project writes by role and assigned scope. The future-module policies are foundation only and need role-by-role review before enabling new write workflows.
- Citizens can read their own profile and complaint records. Representatives are scoped to their assigned constituency. Department officials are scoped to their assigned department.
- SQL Editor/migration application and Supabase Auth dashboard configuration must be performed by a project administrator.

## Verification status

- `npm run lint` passes.
- `npm run build` passes.
- `npm run dev -- --host 127.0.0.1` started successfully, and the local frontend returned HTTP 200.
- No live Supabase project credentials were present, so live sign-up, email delivery, password reset, session persistence, and cross-role RLS tests were not run.
- Browser-based responsive and accessibility review has not been performed.
