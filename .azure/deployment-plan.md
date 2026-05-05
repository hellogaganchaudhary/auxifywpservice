# Azure Deployment Plan

## Status
Ready for Validation

## Request
Deploy the existing `newwp` application to Azure in a new resource group named `wpservice` in `Central India`, with production-safe configuration, no dummy/test data in production, and a live super-admin account using `gagan@nxthubconsulting.com`.

## App Summary
- Monorepo with `apps/api` (NestJS API)
- `apps/web` (Next.js frontend)
- Prisma with PostgreSQL
- Redis/BullMQ usage
- Existing production PostgreSQL and Redis connection strings available

## Proposed Minimal Azure Architecture
- Resource Group: `wpservice`
- Subscription: `7929d7f2-0764-410e-bfaa-788c7fa40015` (`...0015`, default)
- CI/CD: GitHub Actions from `git@github.com:hellogaganchaudhary/auxifywpservice.git`
- Azure Container Apps environment
- One Container App for API
- One Container App for Web
- Azure Container Registry for images
- Existing Azure Database for PostgreSQL reused
- Existing Azure Cache for Redis reused
- Optional Log Analytics workspace (required by Container Apps environment)
- Secrets stored as Container Apps secrets / env config

## Production Cleanup Scope
- Remove or disable clearly local/test-only defaults from deployment config
- Keep localhost-only settings out of production configuration
- Do not seed dummy/test data in production
- Seed only the requested super-admin account

## Decisions To Finalize
- Use default Azure URLs first
- Reuse existing production DB and Redis values provided by user
- Production super-admin email: `gagan@nxthubconsulting.com`
- Production super-admin password supplied by user
- Deploy through CI/CD first, then Azure-hosted runtime

## Planned Steps
1. Analyze current app build/runtime requirements
2. Prepare Azure deployment files and infra
3. Clean production configuration
4. Validate build locally where possible
5. Provision Azure resources
6. Deploy API and Web
7. Seed production super-admin
8. Share live URLs and credentials

## Validation Readiness Notes
- GitHub Actions deployment workflow created in `.github/workflows/deploy-azure.yml`
- Validation workflow created in `.github/workflows/validate.yml`
- Azure Container Apps infra defined in `infra/main.bicep`
- Dedicated worker app included for BullMQ broadcast processing
- GitHub OIDC setup and required repository secrets documented in `docs/azure-github-actions-setup.md`
- Remaining execution dependency: create Azure federated identity and populate GitHub repository secrets
