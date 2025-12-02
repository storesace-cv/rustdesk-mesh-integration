WARNING: Secrets have been removed from this file for security.

This file previously contained Supabase publishable and service-role keys. Storing
service-role keys in the repository is unsafe. Move any required secrets into the
gitignored `deploy/.supabase-credentials` file and load them in your deploy or
runtime environment.

Example `deploy/.supabase-credentials` (gitignored):

```bash
export SUPABASE_PROJECT_REF="<your-project-ref>"
export SUPABASE_URL="https://<your-project-ref>.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="<REDACTED_SERVICE_ROLE_KEY>"
```

Use the above environment variables from your CI or droplet environment instead
of committing keys to source control.
