require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });
const bcrypt = require("bcryptjs");
const prisma = require("../utils/prisma");

const REQUIRED_ENVS = ["SUPER_ADMIN_EMAIL", "SUPER_ADMIN_PASSWORD", "SUPER_ADMIN_NAME"];

function getEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

async function main() {
  const email = getEnv("SUPER_ADMIN_EMAIL").trim().toLowerCase();
  const password = getEnv("SUPER_ADMIN_PASSWORD");
  const name = getEnv("SUPER_ADMIN_NAME").trim();

  const existingUser = await prisma.user.findUnique({
    where: { email },
    select: { id: true, role: true },
  });

  if (existingUser) {
    if (existingUser.role === "super_admin") {
      console.log(`[seed-super-admin] Already super_admin, no changes needed: ${email}`);
      return;
    }

    await prisma.user.update({
      where: { id: existingUser.id },
      data: { role: "super_admin" },
    });

    console.log(`[seed-super-admin] Promoted existing user to super_admin: ${email}`);
    return;
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  let username = name;
  let existingUsername;

  do {
    existingUsername = await prisma.user.findUnique({
      where: { username },
      select: { id: true },
    });

    if (existingUsername) {
      const suffix = await prisma.user.count({
        where: { username: { startsWith: `${name}_` } },
      });
      username = `${name}_${suffix + 1}`;
    }
  } while (existingUsername);

  await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      username,
      role: "super_admin",
      isEmailVerified: true,
      isPhoneVerified: true,
      consentAcceptedAt: new Date(),
    },
  });

  console.log(`[seed-super-admin] Created super_admin: ${email}`);
}

main()
  .catch((error) => {
    console.error(`[seed-super-admin] Error: ${error.message || error}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
