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

async function hashPassword(password) {
  const bcrypt = await import("bcryptjs");
  return bcrypt.hash(password, 10);
}

async function main() {
  const email = process.env.SUPER_ADMIN_EMAIL || "superadmin@whatsappai.local";
  const password = process.env.SUPER_ADMIN_PASSWORD || "Admin@123456";
  const name = process.env.SUPER_ADMIN_NAME || "Platform Super Admin";

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
