import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const prismaPkg = require("../../node_modules/.pnpm/@prisma+client@5.22.0_prisma@5.22.0/node_modules/@prisma/client");

const { PrismaClient, UserRole } = prismaPkg;

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
  console.log(`password=${password}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
