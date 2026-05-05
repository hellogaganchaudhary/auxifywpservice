# Azure GitHub Actions setup

Use these values for the live deployment pipeline for `wpservice`.

## Repository

- GitHub repo: `hellogaganchaudhary/auxifywpservice`
- Azure subscription: `7929d7f2-0764-410e-bfaa-788c7fa40015`
- Azure tenant: `3b97e837-54ef-47d8-b63d-ca80218949eb`
- Resource group: `wpservice`
- Region: `centralindia`

## Recommended auth model

Use GitHub OIDC federation with `azure/login@v2`.

### 1. Create an app registration / service principal

Create an Entra application for GitHub Actions and capture:

- `AZURE_CLIENT_ID`
- `AZURE_TENANT_ID`
- `AZURE_SUBSCRIPTION_ID`

### 2. Add federated credential

Create a federated credential on the app registration with:

- Issuer: `https://token.actions.githubusercontent.com`
- Organization: `hellogaganchaudhary`
- Repository: `auxifywpservice`
- Entity type: `Branch`
- Branch: `main`
- Audience: `api://AzureADTokenExchange`

### 3. Required Azure role assignments

Assign the service principal these roles on resource group `wpservice`:

- `Contributor`
- `AcrPush`

If scoping `AcrPush` directly to the registry, assign it on `wpserviceacr`.

## GitHub repository secrets

Add these repository secrets in GitHub Actions.

### Azure auth

- `AZURE_CLIENT_ID`
- `AZURE_TENANT_ID`
- `AZURE_SUBSCRIPTION_ID`

### App runtime secrets

- `DATABASE_URL`
- `REDIS_URL`
- `JWT_SECRET`
- `JWT_REFRESH_SECRET`
- `BETTER_AUTH_SECRET`
- `RESEND_API_KEY`
- `STRIPE_SECRET_KEY`
- `META_APP_ID`
- `META_APP_SECRET`
- `META_WEBHOOK_VERIFY_TOKEN`
- `R2_ACCOUNT_ID`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET`
- `R2_PUBLIC_URL`
- `CORS_ORIGIN`
- `APP_URL`
- `API_URL`
- `NEXT_PUBLIC_API_URL`
- `MEDIA_UPLOAD_DIR`
- `SUPER_ADMIN_EMAIL`
- `SUPER_ADMIN_PASSWORD`
- `SUPER_ADMIN_NAME`

## Suggested production values

- `SUPER_ADMIN_EMAIL=gagan@nxthubconsulting.com`
- `SUPER_ADMIN_NAME=Platform Super Admin`
- `MEDIA_UPLOAD_DIR=/tmp/uploads`

Set these URL values after first successful deployment if Azure generates final hostnames:

- `APP_URL`
- `API_URL`
- `NEXT_PUBLIC_API_URL`
- `CORS_ORIGIN`

## Notes

- The current workflow seeds the live super admin automatically.
- The repo input previously shared as `owner/git@github.com:hellogaganchaudhary/auxifywpservice.git` should be treated as the repo `hellogaganchaudhary/auxifywpservice`.
- For safer operations, rotate `SUPER_ADMIN_PASSWORD` after first login.