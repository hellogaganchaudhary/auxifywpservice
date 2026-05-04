# Meta WhatsApp Business API — Complete Implementation Guide
> WhatsAppAI Platform · All APIs · Backend + Frontend · NestJS + Next.js
>
> _Last updated: May 2026 · Graph API v25.0 · Cloud API only (on-premise deprecated Oct 2025)_

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Prerequisites & Credentials](#2-prerequisites--credentials)
3. [Domain 1 — Authentication & Onboarding](#3-domain-1--authentication--onboarding)
4. [Domain 2 — WABA & Phone Number Setup](#4-domain-2--waba--phone-number-setup)
5. [Domain 3 — Webhook Configuration](#5-domain-3--webhook-configuration)
6. [Domain 4 — Sending Messages](#6-domain-4--sending-messages)
7. [Domain 5 — Media Management](#7-domain-5--media-management)
8. [Domain 6 — Template Management](#8-domain-6--template-management)
9. [Domain 7 — Analytics & Quality Monitoring](#9-domain-7--analytics--quality-monitoring)
10. [Error Handling Reference](#10-error-handling-reference)
11. [Rate Limits Reference](#11-rate-limits-reference)
12. [Environment Variables](#12-environment-variables)
13. [NestJS Module Structure](#13-nestjs-module-structure)
14. [Implementation Checklist](#14-implementation-checklist)

---

## 1. Architecture Overview

```
Org Admin (Browser)
       │
       ▼
┌─────────────────────────────────────┐
│         Next.js Frontend            │
│  (Embedded Signup SDK · Dashboard)  │
└──────────────┬──────────────────────┘
               │ REST / WebSocket
               ▼
┌─────────────────────────────────────┐
│       NestJS API Gateway            │  ← your server (localhost:4000)
│  meta-onboarding · messages ·       │
│  templates · billing · inbox ·      │
│  analytics · webhooks               │
└──────┬───────────────────┬──────────┘
       │                   │
       ▼                   ▼
┌─────────────┐   ┌────────────────────┐
│  PostgreSQL  │   │  Meta Graph API    │
│  (Prisma)   │   │  graph.facebook.com│
└─────────────┘   └────────────────────┘
       │
       ▼
┌─────────────┐
│    Redis    │  ← BullMQ queues + Socket.io adapter
└─────────────┘
```

### Key Design Principles

- **Never call Meta Graph API from the browser.** All calls go through your NestJS backend.
- **One WabaConfig per org.** Every DB query and Meta API call is scoped to `organizationId`.
- **Tokens stored encrypted.** Store `access_token` with AES-256 encryption at rest.
- **System User tokens only in production.** Never use short-lived user tokens beyond testing.
- **Webhook responses < 200ms.** Enqueue heavy processing with BullMQ, return 200 immediately.

---

## 2. Prerequisites & Credentials

### What Each Org Admin Provides

| Field | Meta Name | Where to Find |
|---|---|---|
| `accessToken` | System User Access Token | Meta Business Settings → System Users → Generate Token |
| `phoneNumberId` | Business Phone Number ID | WhatsApp Manager → Phone Numbers |
| `wabaId` | WhatsApp Business Account ID | WhatsApp Manager → Account Overview |
| `businessAccountId` | Meta Business Account ID | Meta Business Settings → Business Info |

### Required Meta App Permissions

```
whatsapp_business_messaging     ← send/receive messages
whatsapp_business_management    ← templates, WABA config, analytics
business_management             ← system users, business assets
```

### Base URL

```
https://graph.facebook.com/v25.0
```

> Always use the latest stable version. v25.0+ is required — `conversation_analytics` and `messaging_limit_tier` are deprecated on v25.0.

---

## 3. Domain 1 — Authentication & Onboarding

### 3.1 Embedded Signup (Frontend — Next.js)

The preferred onboarding flow. The org admin connects their WABA inside your platform without leaving.

**Install the Meta JS SDK in your onboarding page:**

```tsx
// apps/web/src/app/(app)/onboarding/page.tsx
'use client';
import { useEffect, useCallback } from 'react';

declare global {
  interface Window {
    FB: any;
    fbAsyncInit: () => void;
  }
}

export default function OnboardingPage() {
  useEffect(() => {
    // Load Meta JS SDK
    window.fbAsyncInit = function () {
      window.FB.init({
        appId: process.env.NEXT_PUBLIC_META_APP_ID!,
        autoLogAppEvents: true,
        xfbml: true,
        version: 'v25.0',
      });
    };
    const script = document.createElement('script');
    script.src = 'https://connect.facebook.net/en_US/sdk.js';
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);
  }, []);

  const handleEmbeddedSignup = useCallback(() => {
    window.FB.login(
      (response: any) => {
        if (response.authResponse?.code) {
          // Exchange the short-lived code for a permanent system user token
          exchangeCodeForToken(response.authResponse.code);
        }
      },
      {
        config_id: process.env.NEXT_PUBLIC_META_CONFIG_ID!, // from Meta App Dashboard
        response_type: 'code',
        override_default_response_type: true,
        extras: {
          setup: {},
          featureType: '',
          sessionInfoVersion: '2',
        },
      }
    );
  }, []);

  const exchangeCodeForToken = async (code: string) => {
    const res = await fetch('/api/meta/onboarding/exchange-token', {
      method: 'POST',
      body: JSON.stringify({ code }),
      headers: { 'Content-Type': 'application/json' },
    });
    const data = await res.json();
    // data contains { wabaId, phoneNumberId, accessToken }
    // proceed to Step 2: verify & persist
  };

  return (
    <button onClick={handleEmbeddedSignup}>
      Connect WhatsApp Business Account
    </button>
  );
}
```

### 3.2 Exchange Auth Code for Access Token (Backend)

```typescript
// apps/api-gateway/src/modules/meta-onboarding/meta-onboarding.service.ts

async exchangeToken(code: string): Promise<{ accessToken: string }> {
  const url = `https://graph.facebook.com/v25.0/oauth/access_token`;
  const response = await this.httpService.axiosRef.get(url, {
    params: {
      client_id: this.config.META_APP_ID,
      client_secret: this.config.META_APP_SECRET,
      redirect_uri: `${this.config.WEB_URL}/onboarding/meta`,
      code,
    },
  });
  // response.data.access_token is a short-lived USER token
  // Immediately convert to a long-lived system user token (see 3.3)
  return { accessToken: response.data.access_token };
}
```

### 3.3 Create System User & Generate Permanent Token (Backend)

> Do this once per org onboarding. Store the resulting token — it does not expire unless manually revoked.

```typescript
// Step 1: Create system user under the business
async createSystemUser(businessId: string, userToken: string) {
  const url = `https://graph.facebook.com/v25.0/${businessId}/system_users`;
  const response = await this.httpService.axiosRef.post(url, {
    name: `whatsappai-org-${Date.now()}`,
    role: 'EMPLOYEE', // or ADMIN for full access
    access_token: userToken,
  });
  return response.data; // { id: "system_user_id" }
}

// Step 2: Assign WABA asset access to system user
async assignWabaToSystemUser(
  businessId: string,
  systemUserId: string,
  wabaId: string,
  userToken: string
) {
  const url = `https://graph.facebook.com/v25.0/${businessId}/assigned_users`;
  await this.httpService.axiosRef.post(url, {
    user: systemUserId,
    tasks: ['MANAGE'], // ANALYZE, ADVERTISE, MANAGE
    access_token: userToken,
  });
}

// Step 3: Generate permanent system user token
async generateSystemUserToken(
  businessId: string,
  systemUserId: string,
  userToken: string
): Promise<string> {
  const url = `https://graph.facebook.com/v25.0/${systemUserId}/access_tokens`;
  const response = await this.httpService.axiosRef.post(url, {
    business_app: this.config.META_APP_ID,
    appsecret_proof: this.generateAppSecretProof(userToken),
    access_token: userToken,
  });
  // Store response.data.access_token encrypted in WabaConfig
  return response.data.access_token;
}

private generateAppSecretProof(token: string): string {
  const crypto = require('crypto');
  return crypto
    .createHmac('sha256', this.config.META_APP_SECRET)
    .update(token)
    .digest('hex');
}
```

### 3.4 WabaConfig Prisma Model

```typescript
// packages/db/prisma/schema.prisma — already exists, ensure these fields:
model WabaConfig {
  id                String   @id @default(cuid())
  organizationId    String   @unique
  organization      Organization @relation(fields: [organizationId], references: [id])
  accessToken       String   // AES-256 encrypted at rest
  phoneNumberId     String
  wabaId            String
  businessAccountId String
  systemUserId      String?
  displayName       String?
  qualityRating     String?  // GREEN | YELLOW | RED
  messagingLimitTier String? // TIER_250 | TIER_1K | TIER_10K | TIER_100K | TIER_UNLIMITED
  throughputLevel   String?  // STANDARD | HIGH
  webhookVerified   Boolean  @default(false)
  isActive          Boolean  @default(false)
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
}
```

---

## 4. Domain 2 — WABA & Phone Number Setup

### 4.1 Verify WABA Credentials (Backend)

Called immediately after the org admin submits their credentials in the onboarding wizard.

```typescript
async verifyWabaCredentials(dto: {
  accessToken: string;
  wabaId: string;
  phoneNumberId: string;
}): Promise<{ valid: boolean; displayName: string; qualityRating: string }> {
  const baseUrl = 'https://graph.facebook.com/v25.0';

  // 1. Verify WABA
  const waba = await this.httpService.axiosRef.get(
    `${baseUrl}/${dto.wabaId}`,
    {
      params: {
        fields: 'name,currency,timezone_id,account_review_status',
        access_token: dto.accessToken,
      },
    }
  );

  // 2. Verify phone number
  const phone = await this.httpService.axiosRef.get(
    `${baseUrl}/${dto.phoneNumberId}`,
    {
      params: {
        fields: 'display_phone_number,verified_name,quality_rating,status,throughput',
        access_token: dto.accessToken,
      },
    }
  );

  if (phone.data.status !== 'CONNECTED') {
    throw new BadRequestException(
      `Phone number status is ${phone.data.status}, expected CONNECTED`
    );
  }

  return {
    valid: true,
    displayName: phone.data.verified_name,
    qualityRating: phone.data.quality_rating,
  };
}
```

### 4.2 List Phone Numbers Under WABA

```typescript
async listPhoneNumbers(wabaId: string, accessToken: string) {
  const response = await this.httpService.axiosRef.get(
    `https://graph.facebook.com/v25.0/${wabaId}/phone_numbers`,
    {
      params: {
        fields: 'display_phone_number,verified_name,quality_rating,status,throughput,whatsapp_business_manager_messaging_limit',
        access_token: accessToken,
      },
    }
  );
  return response.data.data; // array of phone number objects
}
```

### 4.3 Register Phone Number (New Number Flow)

```typescript
// Step 1: Request verification code
async requestVerificationCode(
  phoneNumberId: string,
  accessToken: string,
  method: 'SMS' | 'VOICE' = 'SMS',
  language: string = 'en_US'
) {
  await this.httpService.axiosRef.post(
    `https://graph.facebook.com/v25.0/${phoneNumberId}/request_code`,
    { code_method: method, language },
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
}

// Step 2: Verify code
async verifyCode(phoneNumberId: string, accessToken: string, code: string) {
  await this.httpService.axiosRef.post(
    `https://graph.facebook.com/v25.0/${phoneNumberId}/verify_code`,
    { code },
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
}

// Step 3: Register with 2FA PIN
async registerPhoneNumber(
  phoneNumberId: string,
  accessToken: string,
  pin: string
) {
  await this.httpService.axiosRef.post(
    `https://graph.facebook.com/v25.0/${phoneNumberId}/register`,
    { messaging_product: 'whatsapp', pin },
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
}
```

### 4.4 Update Business Profile

```typescript
async updateBusinessProfile(
  phoneNumberId: string,
  accessToken: string,
  profile: {
    about?: string;
    address?: string;
    description?: string;
    email?: string;
    websites?: string[];
    vertical?: string; // AUTOMOTIVE, BEAUTY, CLOTHING, etc.
    profile_picture_handle?: string; // media handle from upload session
  }
) {
  await this.httpService.axiosRef.post(
    `https://graph.facebook.com/v25.0/${phoneNumberId}/whatsapp_business_profile`,
    { messaging_product: 'whatsapp', ...profile },
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
}
```

---

## 5. Domain 3 — Webhook Configuration

### 5.1 Subscribe WABA to Your Webhook App

```typescript
async subscribeWabaToWebhook(wabaId: string, accessToken: string) {
  // This binds your Meta app to the WABA so events are forwarded to your callback URL
  // The callback URL is set in your Meta App Dashboard → WhatsApp → Configuration
  await this.httpService.axiosRef.post(
    `https://graph.facebook.com/v25.0/${wabaId}/subscribed_apps`,
    {},
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
}
```

### 5.2 Webhook Verification Endpoint (GET)

Meta sends a GET request to verify your endpoint when you first configure it.

```typescript
// apps/api-gateway/src/modules/webhooks/webhooks.controller.ts

@Get('meta/webhooks')
verifyWebhook(
  @Query('hub.mode') mode: string,
  @Query('hub.verify_token') token: string,
  @Query('hub.challenge') challenge: string,
  @Res() res: Response
) {
  if (mode === 'subscribe' && token === process.env.META_WEBHOOK_VERIFY_TOKEN) {
    return res.status(200).send(challenge); // echo back the challenge string
  }
  return res.status(403).send('Forbidden');
}
```

### 5.3 Webhook Event Receiver (POST)

> **Critical:** Respond with HTTP 200 within 200ms. Enqueue all processing.

```typescript
@Post('meta/webhooks')
async receiveWebhook(
  @Body() payload: any,
  @Res() res: Response
) {
  // Respond immediately to avoid Meta retrying
  res.status(200).send('OK');

  // Enqueue for async processing
  await this.webhookQueue.add('process-webhook', payload, {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
  });
}
```

### 5.4 Webhook Processor (BullMQ Worker)

```typescript
// apps/api-gateway/src/modules/webhooks/webhook.processor.ts

@Processor('webhooks')
export class WebhookProcessor {
  @Process('process-webhook')
  async handle(job: Job<any>) {
    const { entry } = job.data;

    for (const e of entry) {
      for (const change of e.changes) {
        const val = change.value;

        // Incoming messages
        if (val.messages) {
          for (const msg of val.messages) {
            await this.inboxService.handleIncomingMessage(msg, val.metadata);
          }
        }

        // Message status updates (sent, delivered, read, failed)
        if (val.statuses) {
          for (const status of val.statuses) {
            await this.messageService.updateMessageStatus(status);
            // If billable delivery: record pricing object for billing
            if (status.pricing?.billable) {
              await this.billingService.recordMessageCost(status);
            }
          }
        }

        // Template status updates (approved, rejected, paused)
        if (change.field === 'message_template_status_update') {
          await this.templateService.syncTemplateStatus(val);
        }

        // Account / quality / limit changes
        if (change.field === 'account_update') {
          await this.wabaService.handleAccountUpdate(val);
        }

        // Messaging limit tier upgrade
        if (change.field === 'business_capability_update') {
          await this.wabaService.handleCapabilityUpdate(val);
        }
      }
    }
  }
}
```

### 5.5 Webhook Event Types to Subscribe

Configure these in your Meta App Dashboard → WhatsApp → Configuration → Webhook Fields:

| Webhook Field | Events You Handle | Purpose |
|---|---|---|
| `messages` | Incoming messages, reactions, media | Core inbox |
| `message_status` | sent, delivered, read, failed | Message tick marks |
| `message_template_status_update` | APPROVED, REJECTED, PAUSED, DISABLED | Template governance |
| `account_update` | PHONE_NUMBER_QUALITY_UPDATE, VOLUME_BASED_PRICING_TIER_UPDATE | Quality dashboard |
| `business_capability_update` | Messaging limit tier changes | Limit dashboard |

---

## 6. Domain 4 — Sending Messages

### 6.1 Base Send Helper

```typescript
// apps/api-gateway/src/modules/messages/messages.service.ts

private async sendToMeta(
  phoneNumberId: string,
  accessToken: string,
  payload: object
): Promise<{ messageId: string }> {
  const response = await this.httpService.axiosRef.post(
    `https://graph.facebook.com/v25.0/${phoneNumberId}/messages`,
    payload,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    }
  );
  return { messageId: response.data.messages[0].id };
}
```

### 6.2 Send Text Message

```typescript
async sendText(
  phoneNumberId: string,
  accessToken: string,
  to: string,
  body: string
) {
  return this.sendToMeta(phoneNumberId, accessToken, {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'text',
    text: { preview_url: false, body },
  });
}
```

### 6.3 Send Template Message

```typescript
async sendTemplate(
  phoneNumberId: string,
  accessToken: string,
  to: string,
  templateName: string,
  languageCode: string,
  components?: Array<{
    type: 'header' | 'body' | 'button';
    parameters: Array<{ type: string; text?: string; image?: object }>;
  }>
) {
  return this.sendToMeta(phoneNumberId, accessToken, {
    messaging_product: 'whatsapp',
    to,
    type: 'template',
    template: {
      name: templateName,
      language: { code: languageCode },
      components: components ?? [],
    },
  });
}
```

### 6.4 Send Media Message

```typescript
async sendMedia(
  phoneNumberId: string,
  accessToken: string,
  to: string,
  mediaType: 'image' | 'document' | 'audio' | 'video' | 'sticker',
  options: {
    mediaId?: string;   // use uploaded media_id (preferred)
    link?: string;      // or public URL
    caption?: string;
    filename?: string;  // for documents
  }
) {
  const mediaPayload: Record<string, any> = {};
  if (options.mediaId) mediaPayload.id = options.mediaId;
  else if (options.link) mediaPayload.link = options.link;
  if (options.caption) mediaPayload.caption = options.caption;
  if (options.filename) mediaPayload.filename = options.filename;

  return this.sendToMeta(phoneNumberId, accessToken, {
    messaging_product: 'whatsapp',
    to,
    type: mediaType,
    [mediaType]: mediaPayload,
  });
}
```

### 6.5 Send Interactive Message (Buttons / List)

```typescript
// Reply buttons (max 3)
async sendButtons(
  phoneNumberId: string,
  accessToken: string,
  to: string,
  bodyText: string,
  buttons: Array<{ id: string; title: string }>
) {
  return this.sendToMeta(phoneNumberId, accessToken, {
    messaging_product: 'whatsapp',
    to,
    type: 'interactive',
    interactive: {
      type: 'button',
      body: { text: bodyText },
      action: {
        buttons: buttons.map((b) => ({
          type: 'reply',
          reply: { id: b.id, title: b.title },
        })),
      },
    },
  });
}

// List message (max 10 items across sections)
async sendList(
  phoneNumberId: string,
  accessToken: string,
  to: string,
  bodyText: string,
  buttonLabel: string,
  sections: Array<{
    title: string;
    rows: Array<{ id: string; title: string; description?: string }>;
  }>
) {
  return this.sendToMeta(phoneNumberId, accessToken, {
    messaging_product: 'whatsapp',
    to,
    type: 'interactive',
    interactive: {
      type: 'list',
      body: { text: bodyText },
      action: { button: buttonLabel, sections },
    },
  });
}
```

### 6.6 Mark Message as Read (Show Blue Ticks)

Call this when an agent opens a conversation in the inbox.

```typescript
async markAsRead(
  phoneNumberId: string,
  accessToken: string,
  messageId: string
) {
  return this.sendToMeta(phoneNumberId, accessToken, {
    messaging_product: 'whatsapp',
    status: 'read',
    message_id: messageId,
  });
}
```

### 6.7 Send Reaction

```typescript
async sendReaction(
  phoneNumberId: string,
  accessToken: string,
  to: string,
  messageId: string,
  emoji: string
) {
  return this.sendToMeta(phoneNumberId, accessToken, {
    messaging_product: 'whatsapp',
    to,
    type: 'reaction',
    reaction: { message_id: messageId, emoji },
  });
}
```

---

## 7. Domain 5 — Media Management

### 7.1 Upload Media

```typescript
async uploadMedia(
  phoneNumberId: string,
  accessToken: string,
  fileBuffer: Buffer,
  mimeType: string
): Promise<{ mediaId: string }> {
  const formData = new FormData();
  formData.append('messaging_product', 'whatsapp');
  formData.append('type', mimeType);
  formData.append('file', new Blob([fileBuffer], { type: mimeType }), 'upload');

  const response = await this.httpService.axiosRef.post(
    `https://graph.facebook.com/v25.0/${phoneNumberId}/media`,
    formData,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        ...formData.getHeaders(),
      },
    }
  );
  return { mediaId: response.data.id };
}
```

### 7.2 Get Media URL (for Incoming Media)

```typescript
async getMediaUrl(
  mediaId: string,
  accessToken: string
): Promise<string> {
  const response = await this.httpService.axiosRef.get(
    `https://graph.facebook.com/v25.0/${mediaId}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  return response.data.url; // Temporary URL — expires in ~5 minutes
}
```

### 7.3 Download and Store Media

> Always download and store in your own storage (S3/R2). The URL expires in ~5 minutes.

```typescript
async downloadAndStore(
  mediaId: string,
  accessToken: string,
  conversationId: string
): Promise<string> {
  // 1. Get the temporary URL
  const tempUrl = await this.getMediaUrl(mediaId, accessToken);

  // 2. Download the binary
  const response = await this.httpService.axiosRef.get(tempUrl, {
    responseType: 'arraybuffer',
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  // 3. Upload to your storage (S3 / Cloudflare R2)
  const key = `media/${conversationId}/${mediaId}`;
  const storedUrl = await this.storageService.upload(
    key,
    response.data,
    response.headers['content-type']
  );

  // 4. Optionally delete from Meta servers (GDPR)
  await this.deleteMedia(mediaId, accessToken);

  return storedUrl;
}
```

### 7.4 Delete Media from Meta Servers

```typescript
async deleteMedia(mediaId: string, accessToken: string) {
  await this.httpService.axiosRef.delete(
    `https://graph.facebook.com/v25.0/${mediaId}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
}
```

---

## 8. Domain 6 — Template Management

### 8.1 Create Template

```typescript
async createTemplate(
  wabaId: string,
  accessToken: string,
  dto: {
    name: string;
    category: 'MARKETING' | 'UTILITY' | 'AUTHENTICATION';
    language: string;             // e.g. 'en_US', 'hi', 'en'
    components: TemplateComponent[];
    allow_category_change?: boolean; // let Meta reclassify if wrong category
  }
): Promise<{ id: string; status: string }> {
  const response = await this.httpService.axiosRef.post(
    `https://graph.facebook.com/v25.0/${wabaId}/message_templates`,
    dto,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  return response.data; // { id, status: "PENDING" }
}
```

**Example component structure:**

```typescript
const components: TemplateComponent[] = [
  {
    type: 'HEADER',
    format: 'TEXT',
    text: 'Hello {{1}}',
    example: { header_text: ['John'] },
  },
  {
    type: 'BODY',
    text: 'Your order {{1}} is confirmed. Total: ₹{{2}}.',
    example: { body_text: [['ORD-1234', '499']] },
  },
  {
    type: 'FOOTER',
    text: 'Reply STOP to unsubscribe',
  },
  {
    type: 'BUTTONS',
    buttons: [
      { type: 'URL', text: 'Track Order', url: 'https://example.com/track/{{1}}' },
      { type: 'QUICK_REPLY', text: 'Cancel Order' },
    ],
  },
];
```

### 8.2 List All Templates

```typescript
async listTemplates(wabaId: string, accessToken: string, status?: string) {
  const response = await this.httpService.axiosRef.get(
    `https://graph.facebook.com/v25.0/${wabaId}/message_templates`,
    {
      params: {
        fields: 'id,name,status,category,language,quality_score,components',
        ...(status && { status }),
        limit: 100,
        access_token: accessToken,
      },
    }
  );
  return response.data.data;
}
```

### 8.3 Get Single Template Status

```typescript
async getTemplate(templateId: string, accessToken: string) {
  const response = await this.httpService.axiosRef.get(
    `https://graph.facebook.com/v25.0/${templateId}`,
    {
      params: {
        fields: 'id,name,status,quality_score,category,language,components,rejected_reason',
        access_token: accessToken,
      },
    }
  );
  return response.data;
}
```

### 8.4 Update Template

```typescript
async updateTemplate(
  templateId: string,
  accessToken: string,
  components: TemplateComponent[]
) {
  const response = await this.httpService.axiosRef.put(
    `https://graph.facebook.com/v25.0/${templateId}`,
    { components },
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  return response.data;
}
```

### 8.5 Delete Template

```typescript
// NOTE: Pass template NAME (not ID) for deletion
async deleteTemplate(wabaId: string, accessToken: string, templateName: string) {
  await this.httpService.axiosRef.delete(
    `https://graph.facebook.com/v25.0/${wabaId}/message_templates`,
    {
      params: { name: templateName },
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );
}
```

### 8.6 Sync Template Status from Webhook

```typescript
// Called by webhook processor when field === 'message_template_status_update'
async syncTemplateStatus(payload: {
  message_template_id: number;
  message_template_name: string;
  event: string; // APPROVED, REJECTED, FLAGGED, PAUSED, DISABLED, REINSTATED
  reason?: string;
}) {
  const statusMap = {
    APPROVED: 'APPROVED',
    REJECTED: 'REJECTED',
    FLAGGED: 'FLAGGED',
    PAUSED: 'PAUSED',
    DISABLED: 'DISABLED',
    REINSTATED: 'APPROVED',
  };

  await this.prisma.template.updateMany({
    where: { metaTemplateId: String(payload.message_template_id) },
    data: {
      status: statusMap[payload.event] ?? payload.event,
      rejectionReason: payload.reason ?? null,
      updatedAt: new Date(),
    },
  });

  // Create governance alert if rejected or paused
  if (['REJECTED', 'PAUSED', 'DISABLED'].includes(payload.event)) {
    await this.prisma.templateGovernanceAlert.create({
      data: {
        templateId: String(payload.message_template_id),
        severity: payload.event === 'DISABLED' ? 'CRITICAL' : 'HIGH',
        message: `Template "${payload.message_template_name}" was ${payload.event}. Reason: ${payload.reason ?? 'Not specified'}`,
        status: 'OPEN',
      },
    });
  }
}
```

---

## 9. Domain 7 — Analytics & Quality Monitoring

> **Important API changes in v25.0 (Oct 2025):**
> - `conversation_analytics` → **DEPRECATED**. Use `pricing_analytics` instead.
> - `messaging_limit_tier` → **DEPRECATED**. Use `whatsapp_business_manager_messaging_limit` instead.
> - Max lookback for `analytics` and `pricing_analytics` → **1 year** (reduced from 10 years, effective Dec 2025).
> - Max lookback for `template_analytics` → **90 days** (unchanged).

### 9.A Message Analytics (Sent / Delivered / Read Totals)

```typescript
async getMessageAnalytics(
  wabaId: string,
  accessToken: string,
  startUnix: number,
  endUnix: number,
  granularity: 'DAY' | 'MONTH' = 'DAY',
  phoneNumbers?: string[]
) {
  let fields = `analytics.start(${startUnix}).end(${endUnix}).granularity(${granularity})`;
  if (phoneNumbers?.length) {
    fields += `.phone_numbers([${phoneNumbers.join(',')}])`;
  }

  const response = await this.httpService.axiosRef.get(
    `https://graph.facebook.com/v25.0/${wabaId}`,
    {
      params: { fields, access_token: accessToken },
    }
  );

  // Returns: { data_points: [{ start, end, sent, delivered, read }] }
  return response.data.analytics;
}
```

### 9.B Pricing Analytics (Per-Message Cost — replaces conversation_analytics)

```typescript
async getPricingAnalytics(
  wabaId: string,
  accessToken: string,
  startUnix: number,
  endUnix: number,
  options?: {
    granularity?: 'DAY' | 'MONTH';
    phoneNumbers?: string[];
    countryCodes?: string[];
  }
) {
  let fields = `pricing_analytics.start(${startUnix}).end(${endUnix})`;
  fields += `.granularity(${options?.granularity ?? 'DAY'})`;
  if (options?.phoneNumbers?.length) {
    fields += `.phone_numbers([${options.phoneNumbers.join(',')}])`;
  }
  if (options?.countryCodes?.length) {
    fields += `.country_codes([${options.countryCodes.join(',')}])`;
  }

  const response = await this.httpService.axiosRef.get(
    `https://graph.facebook.com/v25.0/${wabaId}`,
    { params: { fields, access_token: accessToken } }
  );

  // Returns data points with: category, country, delivered, cost, tier
  return response.data.pricing_analytics;
}
```

### 9.C Enable Template Analytics (One-Time Per WABA)

```typescript
// Call once on org onboarding. Without this, all template analytics return empty.
async enableTemplateAnalytics(wabaId: string, accessToken: string) {
  await this.httpService.axiosRef.post(
    `https://graph.facebook.com/v25.0/${wabaId}/template_analytics_opt_in`,
    {},
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  // Update WabaConfig.templateAnalyticsEnabled = true in DB
}
```

### 9.D Template-Level Analytics (Per Template: Sent / Delivered / Read / Clicks / Cost)

```typescript
async getTemplateAnalytics(
  wabaId: string,
  accessToken: string,
  templateIds: string[],                 // max 10 per request
  startDate: string,                     // YYYY-MM-DD
  endDate: string,                       // YYYY-MM-DD
  metricTypes?: ('SENT' | 'DELIVERED' | 'READ' | 'CLICKED')[],
  productType?: 'CLOUD_API' | 'MARKETING_MESSAGES_LITE_API',
  useWabaTimezone = false
) {
  // template_analytics only supports DAILY granularity
  let fields = `template_analytics.start(${startDate}).end(${endDate}).granularity(DAILY)`;
  fields += `.template_ids([${templateIds.join(',')}])`;
  if (metricTypes?.length) {
    fields += `.metric_types([${metricTypes.join(',')}])`;
  }
  if (productType) {
    fields += `.product_type(${productType})`;
  }
  if (useWabaTimezone) {
    fields += `.use_waba_timezone(true)`;
  }

  const response = await this.httpService.axiosRef.get(
    `https://graph.facebook.com/v25.0/${wabaId}`,
    { params: { fields, access_token: accessToken } }
  );

  return response.data.template_analytics;
  /*
  Returns per-template per-day:
  {
    template_id: "...",
    data_points: [{
      start, end,
      sent, delivered, read,
      clicked: [{ type: "url_button" | "quick_reply", count, unique_count }],
      cost: { total, per_delivered, per_click }
    }]
  }
  */
}
```

### 9.E Template Group Analytics (Across All Language Variants)

```typescript
async getTemplateGroupAnalytics(
  wabaId: string,
  accessToken: string,
  templateNames: string[],
  startDate: string,
  endDate: string,
  useWabaTimezone = false
) {
  let fields = `template_group_analytics.start(${startDate}).end(${endDate}).granularity(DAILY)`;
  fields += `.template_names([${templateNames.map(n => `"${n}"`).join(',')}])`;
  if (useWabaTimezone) fields += `.use_waba_timezone(true)`;

  const response = await this.httpService.axiosRef.get(
    `https://graph.facebook.com/v25.0/${wabaId}`,
    { params: { fields, access_token: accessToken } }
  );
  return response.data.template_group_analytics;
}
```

### 9.F Phone Number Quality Rating

```typescript
async getPhoneNumberQuality(phoneNumberId: string, accessToken: string) {
  const response = await this.httpService.axiosRef.get(
    `https://graph.facebook.com/v25.0/${phoneNumberId}`,
    {
      params: {
        fields: 'quality_rating,status,display_phone_number,verified_name',
        access_token: accessToken,
      },
    }
  );
  return response.data;
  // { quality_rating: "GREEN" | "YELLOW" | "RED", status: "CONNECTED" | "FLAGGED" | "RESTRICTED" }
}
```

### 9.G Phone Number Messaging Limit Tier

```typescript
// v25.0+ — use whatsapp_business_manager_messaging_limit (messaging_limit_tier is deprecated)
async getMessagingLimitTier(phoneNumberId: string, accessToken: string) {
  const response = await this.httpService.axiosRef.get(
    `https://graph.facebook.com/v25.0/${phoneNumberId}`,
    {
      params: {
        // messaging_limit_tier is DEPRECATED on v25.0+ — use the field below
        fields: 'whatsapp_business_manager_messaging_limit',
        access_token: accessToken,
      },
    }
  );
  return response.data.whatsapp_business_manager_messaging_limit;
  // "TIER_250" | "TIER_1K" | "TIER_10K" | "TIER_100K" | "TIER_UNLIMITED"
}
```

### 9.H Phone Number Throughput Level

```typescript
async getThroughputLevel(phoneNumberId: string, accessToken: string) {
  const response = await this.httpService.axiosRef.get(
    `https://graph.facebook.com/v25.0/${phoneNumberId}`,
    {
      params: {
        fields: 'throughput',
        access_token: accessToken,
      },
    }
  );
  return response.data.throughput;
  // { level: "STANDARD" | "HIGH" }
}
```

### 9.I Batch Phone Number Health Check

Combine all health fields in one request to minimize API calls:

```typescript
async getPhoneNumberHealthSnapshot(phoneNumberId: string, accessToken: string) {
  const response = await this.httpService.axiosRef.get(
    `https://graph.facebook.com/v25.0/${phoneNumberId}`,
    {
      params: {
        fields: [
          'display_phone_number',
          'verified_name',
          'status',
          'quality_rating',
          'throughput',
          'whatsapp_business_manager_messaging_limit',
        ].join(','),
        access_token: accessToken,
      },
    }
  );
  return response.data;
}
```

### 9.J Quality & Limit Change Webhooks Handler

```typescript
// In webhook.processor.ts — handle account_update and business_capability_update events

async handleAccountUpdate(payload: {
  phone_number_id?: string;
  event: string;
  // PHONE_NUMBER_QUALITY_UPDATE fields:
  current_limit?: string;
  // VOLUME_BASED_PRICING_TIER_UPDATE fields:
  pricing_category?: string;
  tier_range?: string;
  effective_month?: string;
  region?: string;
}) {
  if (payload.event === 'PHONE_NUMBER_QUALITY_UPDATE') {
    // Update WabaConfig with latest quality rating
    await this.prisma.wabaConfig.updateMany({
      where: { phoneNumberId: payload.phone_number_id },
      data: { qualityRating: payload.current_limit },
    });
    // Alert org admin if quality degraded to RED
    // Emit realtime event via Socket.io to frontend
    this.socketGateway.emitToOrg(orgId, 'waba:quality-change', payload);
  }

  if (payload.event === 'VOLUME_BASED_PRICING_TIER_UPDATE') {
    // Log tier upgrade — useful for billing dashboard
    await this.prisma.auditLog.create({
      data: {
        event: 'PRICING_TIER_UPGRADE',
        payload: JSON.stringify(payload),
      },
    });
    this.socketGateway.emitToOrg(orgId, 'waba:tier-upgrade', payload);
  }
}

async handleCapabilityUpdate(payload: {
  max_daily_conversations_per_business?: number;
}) {
  // Messaging limit tier increased
  await this.prisma.wabaConfig.updateMany({
    where: { /* scope by phone number */ },
    data: {
      messagingLimitTier: `TIER_${payload.max_daily_conversations_per_business}`,
    },
  });
}
```

### 9.K Per-Message Cost Recording (from Status Webhook pricing object)

```typescript
// Called inside the statuses loop in webhook.processor.ts
async recordMessageCost(status: {
  id: string;
  recipient_id: string;
  timestamp: string;
  status: string;
  pricing?: {
    billable: boolean;
    pricing_model: string; // "PMP"
    type: string;          // "regular" | "free_customer_service" | "free_entry_point"
    category: string;      // "marketing" | "utility" | "authentication" | "service"
  };
}) {
  if (!status.pricing?.billable) return; // free message — skip

  await this.prisma.usageRecord.create({
    data: {
      messageId: status.id,
      recipientPhone: status.recipient_id,
      pricingCategory: status.pricing.category,
      pricingType: status.pricing.type,
      billedAt: new Date(Number(status.timestamp) * 1000),
    },
  });

  // Deduct from org wallet credit
  await this.billingService.deductCredit({
    category: status.pricing.category,
    // Look up rate from PricingConfig table
  });
}
```

---

## 10. Error Handling Reference

### Common Meta API Error Codes

| Code | Subcode | Meaning | Your Action |
|---|---|---|---|
| `100` | — | Invalid parameter | Log and surface to admin |
| `130429` | — | Rate limit reached (throughput) | Exponential backoff |
| `131000` | — | Message failed to send | Log, mark message failed in DB |
| `131005` | — | Permission denied | Token missing scope — re-auth |
| `131009` | — | Parameter value not valid | Check template variables |
| `131021` | — | Invalid recipient (not a WhatsApp user) | Mark contact as invalid |
| `131026` | — | Message undeliverable | Retry or mark failed |
| `131042` | — | Business eligibility — payment issue | Alert admin to check billing |
| `131047` | — | Template quality too low | Notify admin, governance alert |
| `131056` | — | Per-user 24h rate exceeded | Throttle per-recipient sends |
| `132000` | — | Template not found | Re-sync templates from Meta |
| `132001` | — | Template paused or disabled | Governance alert + block send |
| `133004` | — | Server temporarily unavailable | Retry with backoff |
| `200` | — | Permission error (token or asset access) | System user has no WABA access |

### Retry Strategy

```typescript
// In messages.service.ts
private async sendWithRetry(
  fn: () => Promise<any>,
  maxAttempts = 3
): Promise<any> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const errorCode = err.response?.data?.error?.code;
      const isRetryable = [130429, 133004].includes(errorCode);

      if (!isRetryable || attempt === maxAttempts) {
        throw err;
      }
      // Exponential backoff: 1s, 2s, 4s
      await new Promise((res) => setTimeout(res, 1000 * 2 ** (attempt - 1)));
    }
  }
}
```

---

## 11. Rate Limits Reference

| Endpoint Type | Default Limit | Notes |
|---|---|---|
| Most Business Management API endpoints | 200 req/hr per app per WABA | Increases to 5,000/hr for active WABAs |
| Messages (outbound) | 80 msg/s per phone number | Upgradeable to 500+ msg/s |
| Per-user rate | 10 msg/min to same user | Error 131056 if exceeded |
| Template creation | 100 templates/hr per WABA | |
| Webhook response deadline | 200ms | Meta retries if exceeded |
| Webhook failure threshold | 5 consecutive failures | Meta disables webhook |

---

## 12. Environment Variables

```bash
# Meta App
META_APP_ID=your_meta_app_id
META_APP_SECRET=your_meta_app_secret
META_WEBHOOK_VERIFY_TOKEN=your_random_secure_token
META_GRAPH_API_VERSION=v25.0

# Frontend (exposed to browser — safe, no secrets)
NEXT_PUBLIC_META_APP_ID=your_meta_app_id
NEXT_PUBLIC_META_CONFIG_ID=your_embedded_signup_config_id

# Encryption key for storing access tokens at rest
TOKEN_ENCRYPTION_KEY=32-byte-hex-key-here

# Storage
S3_BUCKET=your-media-bucket
S3_REGION=ap-south-1
S3_ACCESS_KEY=...
S3_SECRET_KEY=...
```

---

## 13. NestJS Module Structure

```
apps/api-gateway/src/modules/
├── meta-onboarding/
│   ├── meta-onboarding.controller.ts   ← POST /meta/onboarding/*
│   ├── meta-onboarding.service.ts      ← Domains 1 & 2
│   └── meta-onboarding.module.ts
├── webhooks/
│   ├── webhooks.controller.ts          ← GET/POST /meta/webhooks
│   ├── webhook.processor.ts            ← BullMQ worker (Domain 3)
│   └── webhooks.module.ts
├── messages/
│   ├── messages.controller.ts          ← POST /messages/send
│   ├── messages.service.ts             ← Domain 4
│   └── messages.module.ts
├── media/
│   ├── media.controller.ts             ← POST /media/upload
│   ├── media.service.ts                ← Domain 5
│   └── media.module.ts
├── templates/
│   ├── templates.controller.ts         ← CRUD + governance
│   ├── templates.service.ts            ← Domain 6
│   └── templates.module.ts
├── analytics/
│   ├── analytics.controller.ts         ← GET /analytics/*
│   ├── analytics.service.ts            ← Domain 7 (A–K)
│   └── analytics.module.ts
├── waba/
│   ├── waba.controller.ts              ← GET /waba/health, /waba/limits
│   ├── waba.service.ts                 ← Quality + limits polling
│   └── waba.module.ts
└── billing/
    ├── billing.controller.ts
    ├── billing.service.ts              ← Wallet deduction + pricing analytics
    └── billing.module.ts
```

---

## 14. Implementation Checklist

Use this checklist to track progress across all API domains.

### Domain 1 — Authentication & Onboarding
- [ ] Meta JS SDK integrated in Next.js onboarding page
- [ ] Embedded Signup flow configured in Meta App Dashboard
- [ ] `POST /oauth/access_token` — exchange auth code for user token
- [ ] `POST /{business_id}/system_users` — create system user per org
- [ ] `POST /{system_user_id}/access_tokens` — generate permanent token
- [ ] System user token stored encrypted (AES-256) in `WabaConfig`
- [ ] `WabaConfig.isActive` set to `true` on successful onboarding

### Domain 2 — WABA & Phone Number Setup
- [ ] `GET /{waba_id}` — verify WABA on onboarding
- [ ] `GET /{waba_id}/phone_numbers` — list all phone numbers
- [ ] `GET /{phone_number_id}` — fetch display name, quality, status
- [ ] `POST /{phone_number_id}/request_code` — phone registration
- [ ] `POST /{phone_number_id}/verify_code` — phone registration
- [ ] `POST /{phone_number_id}/register` — phone registration with PIN
- [ ] `POST /{phone_number_id}/whatsapp_business_profile` — update profile
- [ ] Onboarding wizard UI shows verified status with display name

### Domain 3 — Webhook Configuration
- [ ] `POST /{waba_id}/subscribed_apps` — called on each org onboarding
- [ ] `GET /meta/webhooks` — verification endpoint echoes `hub.challenge`
- [ ] `POST /meta/webhooks` — returns 200 in < 200ms, enqueues via BullMQ
- [ ] BullMQ webhook processor handles `messages` field
- [ ] BullMQ webhook processor handles `statuses` field
- [ ] BullMQ webhook processor handles `message_template_status_update`
- [ ] BullMQ webhook processor handles `account_update`
- [ ] BullMQ webhook processor handles `business_capability_update`
- [ ] Webhook fields subscribed in Meta App Dashboard (all 5 fields)

### Domain 4 — Sending Messages
- [ ] `POST /{phone_number_id}/messages` — text message
- [ ] `POST /{phone_number_id}/messages` — template message with variables
- [ ] `POST /{phone_number_id}/messages` — image / document / audio / video
- [ ] `POST /{phone_number_id}/messages` — interactive buttons
- [ ] `POST /{phone_number_id}/messages` — interactive list
- [ ] `POST /{phone_number_id}/messages` — mark as read (status: "read")
- [ ] `POST /{phone_number_id}/messages` — reaction emoji
- [ ] Exponential retry for error codes 130429 and 133004
- [ ] Message IDs stored in DB for status correlation

### Domain 5 — Media Management
- [ ] `POST /{phone_number_id}/media` — upload outbound media
- [ ] `GET /{media_id}` — get download URL for incoming media
- [ ] Download binary and store in S3/R2 within 5 min of webhook receipt
- [ ] `DELETE /{media_id}` — delete from Meta servers post-download
- [ ] Media URLs in DB point to your own storage (not Meta temp URLs)

### Domain 6 — Template Management
- [ ] `POST /{waba_id}/message_templates` — create template
- [ ] `GET /{waba_id}/message_templates` — list all templates
- [ ] `GET /{template_id}` — get single template status + quality score
- [ ] `PUT /{template_id}` — update template components
- [ ] `DELETE /{waba_id}/message_templates?name=` — delete by name
- [ ] Webhook sync: `message_template_status_update` → DB status update
- [ ] Governance alerts created on REJECTED / PAUSED / DISABLED
- [ ] Template UI shows quality score (HIGH / MEDIUM / LOW)

### Domain 7 — Analytics & Quality Monitoring
- [ ] `GET /{waba_id}?fields=analytics` — message volume (sent/delivered/read)
- [ ] `GET /{waba_id}?fields=pricing_analytics` — per-message cost breakdown
- [ ] `POST /{waba_id}/template_analytics_opt_in` — enabled on org onboarding
- [ ] `GET /{waba_id}?fields=template_analytics` — per-template metrics
- [ ] `GET /{waba_id}?fields=template_group_analytics` — cross-language rollup
- [ ] `GET /{phone_number_id}?fields=quality_rating` — phone quality
- [ ] `GET /{phone_number_id}?fields=whatsapp_business_manager_messaging_limit` — tier (NOT messaging_limit_tier — deprecated v25.0)
- [ ] `GET /{phone_number_id}?fields=throughput` — msg/s level
- [ ] Webhook: `PHONE_NUMBER_QUALITY_UPDATE` → DB update + realtime alert
- [ ] Webhook: `VOLUME_BASED_PRICING_TIER_UPDATE` → audit log + realtime alert
- [ ] Webhook: `business_capability_update` → messaging limit update
- [ ] Webhook `pricing` object on `delivered` status → `UsageRecord` insert → wallet deduction
- [ ] **Do NOT use `conversation_analytics`** — deprecated on v25.0+
- [ ] **Do NOT use `messaging_limit_tier`** — deprecated on v25.0+
- [ ] Analytics dashboard shows delivery rate = delivered/sent × 100
- [ ] Analytics dashboard shows read rate = read/delivered × 100

### Security & Operations
- [ ] All `accessToken` values AES-256 encrypted at rest
- [ ] `META_APP_SECRET` never exposed to frontend or logs
- [ ] `appsecret_proof` header sent on all server-side API calls
- [ ] Webhook signature verification (X-Hub-Signature-256 header)
- [ ] Retry logic implemented for 130429, 133004 error codes
- [ ] Rate limiting: enforce 10 msg/min max per recipient
- [ ] Media downloaded from temp URLs within 5 minutes of webhook receipt
- [ ] All API errors logged with `errorCode`, `orgId`, `messageId`

---

_This document covers all 30+ Meta API calls required for the complete WhatsAppAI platform. Cross-reference with `WHATSAPPAI-PLATFORM-BLUEPRINT.md` for the full frontend + backend build plan._
