import { PrismaClient, UserRole } from "@prisma/client";
import * as argon2 from "argon2";
import * as dotenv from "dotenv";

dotenv.config();

const prisma = new PrismaClient();

async function main() {
  const shopSlug = process.env.SEED_SHOP_SLUG || "main-branch";
  const shopName = process.env.SEED_SHOP_NAME || "Chhapai Main Branch";
  const adminEmail = (process.env.SEED_ADMIN_EMAIL || "admin@chhapai.com")
    .toLowerCase()
    .trim();
  const adminPassword =
    process.env.SEED_ADMIN_PASSWORD || "SuperSecurePassword123!";

  console.log(`[Seed] Checking shop: ${shopSlug}...`);

  let shop = await prisma.shop.findUnique({
    where: { slug: shopSlug },
  });

  if (!shop) {
    shop = await prisma.shop.create({
      data: {
        slug: shopSlug,
        name: shopName,
        nameUrdu: "چھپائی مین برانچ",
        isOpen: true,
        autoPrint: true,
        rateBwSingle: 5.0,
        rateBwDouble: 4.0,
        rateColorSingle: 30.0,
        rateColorDouble: 25.0,
        maxFileMb: 25,
        maxPages: 200,
        retentionMinutes: 60,
        pendingExpiryHours: 24,
      },
    });
    console.log(`[Seed] Created shop: ${shop.name} (${shop.id})`);
  } else {
    console.log(`[Seed] Shop already exists: ${shop.name} (${shop.id})`);
  }

  console.log(`[Seed] Checking admin user: ${adminEmail}...`);

  let admin = await prisma.adminUser.findUnique({
    where: { email: adminEmail },
  });

  if (!admin) {
    const passwordHash = await argon2.hash(adminPassword);
    admin = await prisma.adminUser.create({
      data: {
        shopId: shop.id,
        email: adminEmail,
        name: "Shop Owner",
        passwordHash,
        role: UserRole.OWNER,
        isActive: true,
      },
    });
    console.log(`[Seed] Created owner admin: ${admin.email} (${admin.id})`);
  } else {
    console.log(
      `[Seed] Admin user already exists: ${admin.email} (${admin.id})`,
    );
  }

  console.log("[Seed] Seeding completed successfully.");
}

main()
  .catch((e) => {
    console.error("[Seed] Error during seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
