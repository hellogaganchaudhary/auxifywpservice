import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { PrismaClient, UserRole } = require("@prisma/client");

if (!process.env.DATABASE_URL) {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const envPath = path.resolve(__dirname, "../../.env");

  if (fs.existsSync(envPath)) {
    const envFile = fs.readFileSync(envPath, "utf8");
    for (const line of envFile.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const separatorIndex = trimmed.indexOf("=");
      if (separatorIndex === -1) continue;
      const key = trimmed.slice(0, separatorIndex).trim();
      const rawValue = trimmed.slice(separatorIndex + 1).trim();
      const value = rawValue.replace(/^['"]|['"]$/g, "");
      if (!(key in process.env)) {
        process.env[key] = value;
      }
    }
  }
}

const prisma = new PrismaClient();
const RESET_CONFIRMATION_PHRASE = "DELETE LIVE USERS AND TENANT DATA";

async function hashPassword(password) {
  const bcrypt = await import("bcryptjs");
  return bcrypt.hash(password, 10);
}

function isEnabled(value) {
  return ["1", "true", "yes"].includes(String(value || "").trim().toLowerCase());
}

async function collectCounts() {
  const [users, superAdmins, organizations] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { role: UserRole.SUPER_ADMIN } }),
    prisma.organization.count(),
  ]);

  return { users, superAdmins, organizations };
}

async function resetTenantData(targetEmail) {
  if (!isEnabled(process.env.RESET_PRODUCTION_USERS)) {
    return;
  }

  if (!process.env.SUPER_ADMIN_EMAIL || !process.env.SUPER_ADMIN_PASSWORD) {
    throw new Error("Refusing destructive reset unless SUPER_ADMIN_EMAIL and SUPER_ADMIN_PASSWORD are explicitly configured.");
  }

  if (process.env.RESET_PRODUCTION_CONFIRMATION !== RESET_CONFIRMATION_PHRASE) {
    throw new Error(`Refusing destructive reset. Set RESET_PRODUCTION_CONFIRMATION="${RESET_CONFIRMATION_PHRASE}".`);
  }

  if (process.env.NODE_ENV !== "production") {
    throw new Error("Refusing destructive reset unless NODE_ENV=production.");
  }

  const before = await collectCounts();
  console.log("Production tenant reset requested:");
  console.log(`before users=${before.users} superAdmins=${before.superAdmins} organizations=${before.organizations}`);

  await prisma.$transaction(async (tx) => {
    const targetUser = await tx.user.findUnique({ where: { email: targetEmail } });

    if (targetUser) {
      await tx.user.update({
        where: { id: targetUser.id },
        data: { organizationId: null },
      });
    }

    await tx.messageAttachment.deleteMany();
    await tx.message.deleteMany();
    await tx.broadcastRecipient.deleteMany();
    await tx.conversationLabel.deleteMany();
    await tx.conversationNote.deleteMany();
    await tx.conversation.deleteMany();
    await tx.teamGroupMember.deleteMany();
    await tx.teamGroup.deleteMany();
    await tx.inboxView.deleteMany();
    await tx.apiKey.deleteMany();
    await tx.refreshToken.deleteMany();
    await tx.passwordReset.deleteMany();
    await tx.invite.deleteMany();
    await tx.broadcast.deleteMany();
    await tx.template.deleteMany();
    await tx.contact.deleteMany();
    await tx.contactSegment.deleteMany();
    await tx.contactCustomField.deleteMany();
    await tx.wabaConfig.deleteMany();
    await tx.walletTransaction.deleteMany();
    await tx.wallet.deleteMany();
    await tx.webhookEvent.deleteMany();
    await tx.quickReply.deleteMany();
    await tx.notificationSettings.deleteMany();
    await tx.auditLog.deleteMany();
    await tx.user.deleteMany({ where: { email: { not: targetEmail } } });
    await tx.organization.deleteMany();
  }, { timeout: 60000 });

  const after = await collectCounts();
  console.log(`after reset users=${after.users} superAdmins=${after.superAdmins} organizations=${after.organizations}`);
}

async function main() {
  const email = process.env.SUPER_ADMIN_EMAIL || "superadmin@whatsappai.local";
  const password = process.env.SUPER_ADMIN_PASSWORD || "Admin@123456";
  const name = process.env.SUPER_ADMIN_NAME || "Platform Super Admin";

  await resetTenantData(email);

  const passwordHash = await hashPassword(password);

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      name,
      role: UserRole.SUPER_ADMIN,
      passwordHash,
      organizationId: null,
    },
    create: {
      email,
      name,
      role: UserRole.SUPER_ADMIN,
      passwordHash,
      organizationId: null,
    },
  });

  console.log("Super-admin ready:");
  console.log(`email=${user.email}`);
  console.log("password=<configured from SUPER_ADMIN_PASSWORD>");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
