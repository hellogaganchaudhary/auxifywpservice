targetScope = 'resourceGroup'

@description('Primary location for all resources')
param location string = resourceGroup().location

@description('Container Apps environment name')
param containerAppsEnvironmentName string = 'wpservice-env'

@description('Azure Container Registry name')
param containerRegistryName string = 'wpserviceacr'

@description('API container app name')
param apiAppName string = 'wpservice-api'

@description('Web container app name')
param webAppName string = 'wpservice-web'

@description('Broadcast worker container app name')
param workerAppName string = 'wpservice-worker'

@description('Log Analytics workspace name')
param logAnalyticsName string = 'wpservice-logs'

@description('API image reference')
param apiImage string

@description('Web image reference')
param webImage string

@description('Public API base URL used by web build/runtime')
param publicApiUrl string

@secure()
@minLength(1)
param databaseUrl string

@secure()
@minLength(1)
param redisUrl string

@secure()
param jwtSecret string

@secure()
param jwtRefreshSecret string

@secure()
param betterAuthSecret string = ''

@secure()
param resendApiKey string = ''

@secure()
param stripeSecretKey string = ''

@secure()
param metaAppId string = ''

@secure()
param metaAppSecret string = ''

@secure()
param metaWebhookVerifyToken string = ''

@secure()
param r2AccountId string = ''

@secure()
param r2AccessKeyId string = ''

@secure()
param r2SecretAccessKey string = ''

param r2Bucket string = ''
param r2PublicUrl string = ''
param corsOrigin string
param appUrl string
param apiUrl string
param nextPublicApiUrl string
param mediaUploadDir string = '/tmp/uploads'
param superAdminEmail string
@secure()
param superAdminPassword string
param superAdminName string = 'Platform Super Admin'

var apiOptionalSecrets = concat(
  betterAuthSecret != '' ? [
    {
      name: 'better-auth-secret'
      value: betterAuthSecret
    }
  ] : [],
  resendApiKey != '' ? [
    {
      name: 'resend-api-key'
      value: resendApiKey
    }
  ] : [],
  stripeSecretKey != '' ? [
    {
      name: 'stripe-secret-key'
      value: stripeSecretKey
    }
  ] : [],
  metaAppId != '' ? [
    {
      name: 'meta-app-id'
      value: metaAppId
    }
  ] : [],
  metaAppSecret != '' ? [
    {
      name: 'meta-app-secret'
      value: metaAppSecret
    }
  ] : [],
  metaWebhookVerifyToken != '' ? [
    {
      name: 'meta-webhook-verify-token'
      value: metaWebhookVerifyToken
    }
  ] : [],
  r2AccountId != '' ? [
    {
      name: 'r2-account-id'
      value: r2AccountId
    }
  ] : [],
  r2AccessKeyId != '' ? [
    {
      name: 'r2-access-key-id'
      value: r2AccessKeyId
    }
  ] : [],
  r2SecretAccessKey != '' ? [
    {
      name: 'r2-secret-access-key'
      value: r2SecretAccessKey
    }
  ] : [],
  superAdminPassword != '' ? [
    {
      name: 'super-admin-password'
      value: superAdminPassword
    }
  ] : []
)

var apiOptionalEnv = concat(
  betterAuthSecret != '' ? [
    {
      name: 'BETTER_AUTH_SECRET'
      secretRef: 'better-auth-secret'
    }
  ] : [],
  resendApiKey != '' ? [
    {
      name: 'RESEND_API_KEY'
      secretRef: 'resend-api-key'
    }
  ] : [],
  stripeSecretKey != '' ? [
    {
      name: 'STRIPE_SECRET_KEY'
      secretRef: 'stripe-secret-key'
    }
  ] : [],
  metaAppId != '' ? [
    {
      name: 'META_APP_ID'
      secretRef: 'meta-app-id'
    }
  ] : [],
  metaAppSecret != '' ? [
    {
      name: 'META_APP_SECRET'
      secretRef: 'meta-app-secret'
    }
  ] : [],
  metaWebhookVerifyToken != '' ? [
    {
      name: 'META_WEBHOOK_VERIFY_TOKEN'
      secretRef: 'meta-webhook-verify-token'
    }
  ] : [],
  r2AccountId != '' ? [
    {
      name: 'R2_ACCOUNT_ID'
      secretRef: 'r2-account-id'
    }
  ] : [],
  r2AccessKeyId != '' ? [
    {
      name: 'R2_ACCESS_KEY_ID'
      secretRef: 'r2-access-key-id'
    }
  ] : [],
  r2SecretAccessKey != '' ? [
    {
      name: 'R2_SECRET_ACCESS_KEY'
      secretRef: 'r2-secret-access-key'
    }
  ] : [],
  superAdminPassword != '' ? [
    {
      name: 'SUPER_ADMIN_PASSWORD'
      secretRef: 'super-admin-password'
    }
  ] : []
)

var workerOptionalSecrets = concat(
  metaAppId != '' ? [
    {
      name: 'meta-app-id'
      value: metaAppId
    }
  ] : [],
  metaAppSecret != '' ? [
    {
      name: 'meta-app-secret'
      value: metaAppSecret
    }
  ] : [],
  metaWebhookVerifyToken != '' ? [
    {
      name: 'meta-webhook-verify-token'
      value: metaWebhookVerifyToken
    }
  ] : []
)

var workerOptionalEnv = concat(
  metaAppId != '' ? [
    {
      name: 'META_APP_ID'
      secretRef: 'meta-app-id'
    }
  ] : [],
  metaAppSecret != '' ? [
    {
      name: 'META_APP_SECRET'
      secretRef: 'meta-app-secret'
    }
  ] : [],
  metaWebhookVerifyToken != '' ? [
    {
      name: 'META_WEBHOOK_VERIFY_TOKEN'
      secretRef: 'meta-webhook-verify-token'
    }
  ] : []
)

resource workspace 'Microsoft.OperationalInsights/workspaces@2023-09-01' = {
  name: logAnalyticsName
  location: location
  properties: {
    sku: {
      name: 'PerGB2018'
    }
    retentionInDays: 30
  }
}

resource managedEnvironment 'Microsoft.App/managedEnvironments@2024-03-01' = {
  name: containerAppsEnvironmentName
  location: location
  properties: {
    appLogsConfiguration: {
      destination: 'log-analytics'
      logAnalyticsConfiguration: {
        customerId: workspace.properties.customerId
        sharedKey: workspace.listKeys().primarySharedKey
      }
    }
  }
}

resource registry 'Microsoft.ContainerRegistry/registries@2023-11-01-preview' = {
  name: containerRegistryName
  location: location
  sku: {
    name: 'Basic'
  }
  properties: {
    adminUserEnabled: true
    publicNetworkAccess: 'Enabled'
    anonymousPullEnabled: false
  }
}

resource apiApp 'Microsoft.App/containerApps@2024-03-01' = {
  name: apiAppName
  location: location
  properties: {
    managedEnvironmentId: managedEnvironment.id
    configuration: {
      ingress: {
        external: true
        targetPort: 4000
        transport: 'auto'
      }
      registries: [
        {
          server: registry.properties.loginServer
          username: registry.listCredentials().username
          passwordSecretRef: 'acr-password'
        }
      ]
      secrets: concat(
        [
          {
            name: 'acr-password'
            value: registry.listCredentials().passwords[0].value
          }
          {
            name: 'database-url'
            value: databaseUrl
          }
          {
            name: 'redis-url'
            value: redisUrl
          }
          {
            name: 'jwt-secret'
            value: jwtSecret
          }
          {
            name: 'jwt-refresh-secret'
            value: jwtRefreshSecret
          }
        ],
        apiOptionalSecrets
      )
    }
    template: {
      containers: [
        {
          name: 'api'
          image: apiImage
          env: concat(
            [
              { name: 'NODE_ENV', value: 'production' }
              { name: 'PORT', value: '4000' }
              { name: 'DATABASE_URL', secretRef: 'database-url' }
              { name: 'REDIS_URL', secretRef: 'redis-url' }
              { name: 'JWT_SECRET', secretRef: 'jwt-secret' }
              { name: 'JWT_REFRESH_SECRET', secretRef: 'jwt-refresh-secret' }
              { name: 'R2_BUCKET', value: r2Bucket }
              { name: 'R2_PUBLIC_URL', value: r2PublicUrl }
              { name: 'CORS_ORIGIN', value: corsOrigin }
              { name: 'APP_URL', value: appUrl }
              { name: 'API_URL', value: apiUrl }
              { name: 'API_PUBLIC_URL', value: publicApiUrl }
              { name: 'PUBLIC_WEBHOOK_BASE_URL', value: publicApiUrl }
              { name: 'SUPER_ADMIN_EMAIL', value: superAdminEmail }
              { name: 'SUPER_ADMIN_NAME', value: superAdminName }
            ],
            apiOptionalEnv
          )
          resources: {
            cpu: json('0.5')
            memory: '1Gi'
          }
        }
      ]
      scale: {
        minReplicas: 1
        maxReplicas: 2
      }
    }
  }
}

resource webApp 'Microsoft.App/containerApps@2024-03-01' = {
  name: webAppName
  location: location
  properties: {
    managedEnvironmentId: managedEnvironment.id
    configuration: {
      ingress: {
        external: true
        targetPort: 3000
        transport: 'auto'
      }
      registries: [
        {
          server: registry.properties.loginServer
          username: registry.listCredentials().username
          passwordSecretRef: 'acr-password'
        }
      ]
      secrets: [
        {
          name: 'acr-password'
          value: registry.listCredentials().passwords[0].value
        }
      ]
    }
    template: {
      containers: [
        {
          name: 'web'
          image: webImage
          env: [
            { name: 'NODE_ENV', value: 'production' }
            { name: 'PORT', value: '3000' }
            { name: 'NEXT_PUBLIC_API_URL', value: nextPublicApiUrl }
          ]
          resources: {
            cpu: json('0.5')
            memory: '1Gi'
          }
        }
      ]
      scale: {
        minReplicas: 1
        maxReplicas: 2
      }
    }
  }
}

resource workerApp 'Microsoft.App/containerApps@2024-03-01' = {
  name: workerAppName
  location: location
  properties: {
    managedEnvironmentId: managedEnvironment.id
    configuration: {
      registries: [
        {
          server: registry.properties.loginServer
          username: registry.listCredentials().username
          passwordSecretRef: 'acr-password'
        }
      ]
      secrets: concat(
        [
          {
            name: 'acr-password'
            value: registry.listCredentials().passwords[0].value
          }
          {
            name: 'database-url'
            value: databaseUrl
          }
          {
            name: 'redis-url'
            value: redisUrl
          }
        ],
        workerOptionalSecrets
      )
    }
    template: {
      containers: [
        {
          name: 'worker'
          image: apiImage
          command: [
            'node'
            'apps/api/dist/modules/broadcasts/jobs/broadcast.worker.js'
          ]
          env: concat(
            [
              { name: 'NODE_ENV', value: 'production' }
              { name: 'DATABASE_URL', secretRef: 'database-url' }
              { name: 'REDIS_URL', secretRef: 'redis-url' }
              { name: 'RUN_DB_SETUP', value: 'false' }
              { name: 'MEDIA_UPLOAD_DIR', value: mediaUploadDir }
              { name: 'PUBLIC_WEBHOOK_BASE_URL', value: publicApiUrl }
              { name: 'API_PUBLIC_URL', value: publicApiUrl }
            ],
            workerOptionalEnv
          )
          resources: {
            cpu: json('0.5')
            memory: '1Gi'
          }
        }
      ]
      scale: {
        minReplicas: 1
        maxReplicas: 1
      }
    }
  }
}

output registryLoginServer string = registry.properties.loginServer
output apiContainerAppUrl string = 'https://${apiApp.properties.configuration.ingress.fqdn}'
output webContainerAppUrl string = 'https://${webApp.properties.configuration.ingress.fqdn}'
