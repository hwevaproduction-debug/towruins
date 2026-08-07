require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });
const prisma = require("../utils/prisma");

const AMENITIES = [
  { slug: "wifi", label: "WiFi", category: "CONNECTIVITY", icon: "wifi" },
  { slug: "ethernet", label: "Ethernet", category: "CONNECTIVITY", icon: "ethernet" },
  { slug: "air-conditioning", label: "Air Conditioning", category: "COMFORT", icon: "ac_unit" },
  { slug: "heating", label: "Heating", category: "COMFORT", icon: "thermostat" },
  { slug: "hot-water", label: "Hot Water", category: "COMFORT", icon: "hot_tub" },
  { slug: "tv", label: "Television", category: "COMFORT", icon: "tv" },
  { slug: "balcony", label: "Balcony", category: "COMFORT", icon: "balcony" },
  { slug: "ensuite", label: "En-suite Bathroom", category: "COMFORT", icon: "bathroom" },
  { slug: "security-guard", label: "Security Guard", category: "SAFETY", icon: "security" },
  { slug: "cctv", label: "CCTV", category: "SAFETY", icon: "videocam" },
  { slug: "fire-extinguisher", label: "Fire Extinguisher", category: "SAFETY", icon: "fire_extinguisher" },
  { slug: "smoke-detector", label: "Smoke Detector", category: "SAFETY", icon: "detector_smoke" },
  { slug: "safe", label: "In-room Safe", category: "SAFETY", icon: "lock" },
  { slug: "swimming-pool", label: "Swimming Pool", category: "RECREATION", icon: "pool" },
  { slug: "gym", label: "Gym", category: "RECREATION", icon: "fitness_center" },
  { slug: "garden", label: "Garden", category: "RECREATION", icon: "yard" },
  { slug: "breakfast-included", label: "Breakfast Included", category: "FOOD", icon: "free_breakfast" },
  { slug: "restaurant", label: "Restaurant On-site", category: "FOOD", icon: "restaurant" },
  { slug: "minibar", label: "Minibar", category: "FOOD", icon: "local_bar" },
  { slug: "kitchen", label: "Kitchen", category: "FOOD", icon: "kitchen" },
  { slug: "parking", label: "Parking", category: "TRANSPORT", icon: "local_parking" },
  { slug: "airport-shuttle", label: "Airport Shuttle", category: "TRANSPORT", icon: "airport_shuttle" },
  { slug: "wheelchair-accessible", label: "Wheelchair Accessible", category: "ACCESSIBILITY", icon: "accessible" },
  { slug: "elevator", label: "Elevator", category: "ACCESSIBILITY", icon: "elevator" },
];

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required in .env to run seed-amenities.js");
  }

  let created = 0;
  let skipped = 0;

  for (const amenity of AMENITIES) {
    await prisma.amenity.upsert({
      where: { slug: amenity.slug },
      update: {},
      create: {
        slug: amenity.slug,
        label: amenity.label,
        category: amenity.category,
        icon: amenity.icon,
      },
    });

    skipped += 1;
    console.log(`  seed  ${amenity.slug}`);
  }

  console.log(`\nAmenities seeded: ${created} created, ${skipped} skipped`);
}

main()
  .catch((error) => {
    console.error(error.message || error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
