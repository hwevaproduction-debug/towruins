const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const providerEmails = [
    "provider1@demo.com",
    "provider2@demo.com",
    "provider3@demo.com",
    "provider4@demo.com",
    "provider5@demo.com",
  ];

  const providers = await prisma.user.findMany({
    where: { email: { in: providerEmails } },
    select: { id: true },
  });

  const providerIds = providers.map((p) => p.id);

  const deletedBookings = await prisma.booking.deleteMany({
    where: { room: { providerId: { in: providerIds } } },
  });

  const deletedRooms = await prisma.room.deleteMany({
    where: { providerId: { in: providerIds } },
  });

  console.log("deletedBookings", deletedBookings);
  console.log("deletedRooms", deletedRooms);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());