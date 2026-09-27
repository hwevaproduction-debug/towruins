require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });
const { createHash } = require("crypto");
const prisma = require("../utils/prisma");

const LEGACY_SEEDED_CONTENT_HASHES = {
  "terms-of-use":
    "fe5d47b3b9ac03134022191b44b5ecab354ab0531b4fb2e6df6e24c222cda422",
  "privacy-policy":
    "fa60cd07fd677e27625092424a37b6873e1afaca6ab8cf02afa29ae693a98223",
  "landlord-terms":
    "f9947d6e0371dd7e989e082747e2735a3196db66822b1f74d4d367c5ad5fa7b5",
  "refund-policy":
    "1bd00933c67c615b6bdcbec365975499df5d878de1f8d8a6af6de3cf7a02ebf5",
  "community-guidelines":
    "98fbf1c69ba79fb5905475e82f91ee13b8303f6875e54eb47baa9b1621f07536",
  "trust-safety":
    "a3f736cf75d2f92e470db17cc6e6d1c09e5f91a887d3c277e84f158d601602ab",
};

const LEGAL_DOCS = [
  {
    slug: "terms-of-use",
    title: "Tenant & Guest Agreement",
    content: JSON.stringify([
      {
        id: "agreement",
        title: "Tenant & Guest Agreement",
        content:
          "This Agreement applies to all users of the platform seeking accommodation, including residential tenants and short-term guests.\nBy using the platform to search for, enquire about, or book accommodation, you agree to the following terms:",
      },
      {
        id: "platform-role",
        title: "Platform Role",
        content:
          "The platform acts solely as an intermediary connecting users with property owners, landlords, hotels, and other accommodation providers. We do not own, manage, or control any listed property.",
      },
      {
        id: "accuracy-of-information",
        title: "Accuracy of Information",
        content:
          "You agree to provide accurate, complete, and truthful information when making enquiries or bookings, including identity and booking details where required.",
      },
      {
        id: "booking-responsibility",
        title: "Booking Responsibility",
        content:
          "All bookings and tenancy arrangements are entered into directly between you and the property provider. The platform is not a party to these agreements.",
      },
      {
        id: "payments",
        title: "Payments",
        content:
          "Where payments are made through the platform, they are processed securely via third-party payment providers. Payment terms are subject to the individual property’s policies.",
      },
      {
        id: "user-conduct",
        title: "User Conduct",
        content:
          "You agree not to:\n- Misuse the platform or submit false enquiries\n- Engage in fraudulent or unlawful activity\n- Attempt to bypass the platform after initiating contact or booking\n- Damage, misuse, or fail to respect any property you occupy",
      },
      {
        id: "residential-tenancy-use",
        title: "Residential Tenancy Use",
        content:
          "Where the platform is used for long-term rentals, you acknowledge that:\n- The final tenancy agreement is between you and the landlord only\n- The landlord is solely responsible for property condition, legality, and tenancy enforcement\n- The platform is not responsible for eviction, disputes, or rental arrears",
      },
      {
        id: "short-term-guest-use",
        title: "Short-Term Guest Use",
        content:
          "Where the platform is used for hotels, lodges, or short-term stays:\n- You agree to comply with the property’s rules and policies during your stay\n- You are supposed to pay for any damages you caused as needed by the property owner\n- Cancellation and refund policies are set by the property provider",
      },
      {
        id: "limitation-of-liability",
        title: "Limitation of Liability",
        content:
          "To the fullest extent permitted by law, the platform shall not be liable for:\n- Property conditions or misrepresentations by hosts\n- Disputes between users and property providers\n- Loss, damage, or injury occurring during occupancy",
      },
      {
        id: "account-suspension",
        title: "Account Suspension",
        content:
          "We reserve the right to suspend or terminate access where there is reasonable evidence of misuse, fraud, or violation of these terms.",
      },
      {
        id: "governing-law",
        title: "Governing Law",
        content: "This Agreement is governed by the laws of Zimbabwe.",
      },
    ]),
  },
  {
    slug: "privacy-policy",
    title: "Privacy Policy",
    content: JSON.stringify([
      {
        id: "privacy-policy",
        title: "Privacy Policy",
        content:
          "We are committed to protecting your personal information and your right to privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our platform.",
      },
      {
        id: "information-we-collect",
        title: "Information We Collect",
        content:
          "We may collect the following types of information:\n- Personal details (name, email address, phone number)\n- Booking and enquiry information\n- Property listing details\n- Payment-related information (processed securely through third-party providers)\n- Device and usage data (IP address, browser type, activity on the platform)",
      },
      {
        id: "how-we-use-your-information",
        title: "How We Use Your Information",
        content:
          "We use your information to:\n- Facilitate bookings and enquiries\n- Connect tenants, landlords, hotels, and guests\n- Improve our platform and user experience\n- Communicate important updates and support responses\n- Prevent fraud and ensure platform security",
      },
      {
        id: "legal-basis-for-processing",
        title: "Legal Basis for Processing",
        content:
          "We process personal data in accordance with applicable laws, including the Data Protection Act (Zimbabwe) and international data protection standards. This includes:\n- User consent\n- Performance of a contract\n- Legal obligations\n- Legitimate business interests",
      },
      {
        id: "sharing-of-information",
        title: "Sharing of Information",
        content:
          "We may share your information with:\n- Property owners or guests (to facilitate bookings)\n- Service providers (payment processors, hosting services)\n- Legal authorities where required by law\n\nWe do not sell your personal data.",
      },
      {
        id: "data-security",
        title: "Data Security",
        content:
          "We implement appropriate technical and organizational measures to protect your data. However, no system is completely secure.",
      },
      {
        id: "data-retention",
        title: "Data Retention",
        content:
          "We retain your data only as long as necessary to provide our services and comply with legal obligations.",
      },
      {
        id: "your-rights",
        title: "Your Rights",
        content:
          "Depending on your location, you may have the right to:\n- Access your personal data\n- Request correction or deletion\n- Object to processing\n- Withdraw consent",
      },
      {
        id: "cookies",
        title: "Cookies",
        content:
          "We use cookies to improve functionality and user experience. Cookies help us remember your preferences, understand how users interact with the platform, and improve performance and functionality. You can control cookie settings through your browser. You can disable cookies in your browser settings, but some features may not function properly.",
      },
      {
        id: "changes-to-this-policy",
        title: "Changes to This Policy",
        content:
          "We may update this Privacy Policy from time to time. Updates will be posted on this page.",
      },
      {
        id: "contact-us",
        title: "Contact Us",
        content:
          "If you have questions, contact us at: support@townruins.com",
      },
    ]),
  },
  {
    slug: "landlord-terms",
    title: "Host & Landlord Agreement",
    content: JSON.stringify([
      {
        id: "host-landlord-agreement",
        title: "Host & Landlord Agreement",
        content:
          "This Agreement applies to all property owners, including residential landlords, hotels, lodges, and any other accommodation providers listed on the platform.\nBy listing a property on our platform, you agree to the following terms:",
      },
      {
        id: "role-of-the-platform",
        title: "Role of the Platform",
        content:
          "The platform operates as a neutral intermediary connecting property owners (including residential landlords and hospitality providers) with tenants and guests. We do not own, manage, or control any listed property.",
      },
      {
        id: "scope-of-listings",
        title: "Scope of Listings",
        content:
          "This Agreement applies to:\n- Residential rental properties (apartments, houses, rooms, shared accommodation)\n- Short-term accommodation (hotels, lodges, guest houses, serviced stays)",
      },
      {
        id: "accuracy-and-responsibility",
        title: "Accuracy and Responsibility",
        content:
          "You are solely responsible for ensuring that all listing information is accurate, lawful, and up to date, including:\n- Rental terms and pricing (for residential properties)\n- Availability and occupancy conditions\n- Property condition and suitability",
      },
      {
        id: "booking-and-tenancy-commitments",
        title: "Booking and Tenancy Commitments",
        content:
          "You agree to honour:\n- Confirmed bookings for short-term stays\n- Confirmed tenancy arrangements or rental agreements initiated through the platform",
      },
      {
        id: "commission-fees",
        title: "Commission Fees",
        content:
          "You agree to pay the applicable commission on all successful transactions facilitated through the platform, including:\n- Short-term bookings (hotels and lodges)\n- Long-term rental agreements (residential properties where applicable under platform terms)",
      },
      {
        id: "non-circumvention",
        title: "Non-Circumvention",
        content:
          "You agree not to bypass the platform in order to avoid commission fees for any enquiry, introduction, or transaction initiated through the platform.",
      },
      {
        id: "residential-landlord-obligations",
        title: "Residential Landlord Obligations",
        content:
          "Where applicable, residential landlords acknowledge that:\n- The platform facilitates tenant discovery and connection only\n- Final tenancy agreements are executed directly between landlord and tenant\n- The landlord is responsible for screening, legal compliance, and tenancy enforcement\n- The platform is not a party to long-term tenancy disputes",
      },
      {
        id: "hospitality-provider-obligations",
        title: "Hospitality Provider Obligations",
        content:
          "Hotels and lodges acknowledge responsibility for:\n- Maintaining accurate room availability and pricing\n- Honour of confirmed bookings\n- Service delivery standards consistent with advertised offerings",
      },
      {
        id: "compliance",
        title: "Compliance",
        content:
          "All users must comply with applicable laws and regulations in Zimbabwe relating to property rental, tenancy, accommodation services, and taxation.",
      },
      {
        id: "enforcement-and-removal",
        title: "Enforcement and Removal",
        content:
          "We reserve the right to suspend or remove any listing that:\n- Violates these terms\n- Misleads users\n- Undermines platform integrity or trust",
      },
      {
        id: "governing-law",
        title: "Governing Law",
        content:
          "This Agreement shall be governed by and interpreted in accordance with the laws of Zimbabwe.",
      },
    ]),
  },
  {
    slug: "refund-policy",
    title: "Refund and Cancellation Policy",
    content: JSON.stringify([
      {
        id: "cancellation-and-refunds",
        title: "Cancellation and Refunds",
        content:
          "Cancellation and refund terms depend on the individual property’s policy.\nUsers are encouraged to review cancellation terms before booking.\nIn cases where payments are processed through our platform, refunds (if applicable) will be handled in accordance with the property’s policy.\nWe are not responsible for disputes between guests and property owners but will provide reasonable support where possible.",
      },
      {
        id: "stay-booking-cancellations",
        title: "Stay Booking Cancellations",
        content:
          "Cancel a booking from My Bookings at any time. Before confirming, you can preview the refund amount. Approved refunds are processed back to your original payment method.",
      },
    ]),
  },
  {
    slug: "community-guidelines",
    title: "Platform Rules Summary",
    content: JSON.stringify([
      {
        id: "platform-rules-summary",
        title: "Platform Rules Summary",
        content:
          "Welcome to our platform. To keep things fair, safe, and reliable for everyone, please follow these simple rules:",
      },
      {
        id: "be-honest",
        title: "Be Honest",
        content: "Only provide accurate information when making enquiries or listings.",
      },
      {
        id: "respect-commitments",
        title: "Respect Commitments",
        content: "If you confirm a booking or tenancy, you are expected to honour it.",
      },
      {
        id: "use-platform-properly",
        title: "Use the Platform Properly",
        content:
          "Do not attempt to bypass the platform after being introduced to a property.",
      },
      {
        id: "respect-properties",
        title: "Respect Properties",
        content:
          "Treat all accommodation with care and respect house or property rules.",
      },
      {
        id: "payments",
        title: "Payments",
        content: "Only make payments through approved methods and only for confirmed bookings.",
      },
      {
        id: "fair-use",
        title: "Fair Use",
        content:
          "Any misuse of the platform, including fraud or fake activity, may result in account suspension.\nOur goal is simple:\nTo make finding and offering accommodation safe, fair, and reliable for everyone.",
      },
    ]),
  },
  {
    slug: "trust-safety",
    title: "Trust & Safety Policy",
    content: JSON.stringify([
      {
        id: "trust-safety-policy",
        title: "Trust & Safety Policy",
        content:
          "We are committed to maintaining a safe, transparent, and trustworthy platform for all users.",
      },
      {
        id: "dispute-resolution-policy",
        title: "Dispute Resolution Policy",
        content:
          "This Policy outlines how disputes between users of the platform are handled.",
      },
      {
        id: "scope",
        title: "Scope",
        content:
          "This Policy applies to disputes between:\n- Tenants/guests and landlords\n- Guests and hotels or accommodation providers\n- Users and the platform (where applicable)",
      },
      {
        id: "platform-role",
        title: "Platform Role",
        content:
          "The platform acts solely as an intermediary and is not a party to rental, tenancy, or accommodation agreements. However, we may provide assistance in facilitating communication between parties.",
      },
      {
        id: "primary-resolution-method",
        title: "Primary Resolution Method",
        content:
          "In the event of a dispute, users are encouraged to first attempt to resolve the issue directly between themselves.",
      },
      {
        id: "platform-assistance",
        title: "Platform Assistance",
        content:
          "Where direct resolution is unsuccessful, the platform may:\n- Review relevant communication and booking records\n- Request additional information from both parties\n- Provide non-binding mediation support",
      },
      {
        id: "limitations",
        title: "Limitations",
        content:
          "The platform does not act as a court, arbitrator, or legal authority and does not issue legally binding decisions.",
      },
      {
        id: "escalation",
        title: "Escalation",
        content:
          "Users may escalate unresolved disputes to relevant legal or regulatory authorities in Zimbabwe.",
      },
      {
        id: "good-faith-requirement",
        title: "Good Faith Requirement",
        content:
          "All users are expected to engage in good faith during dispute resolution. Abuse of the dispute system may result in account suspension.",
      },
      {
        id: "verification-and-listings",
        title: "Verification and Listings",
        content:
          "We may implement verification processes for:\n- Property listings\n- User accounts\n- Contact information\nListings that appear misleading or incomplete may be removed.",
      },
      {
        id: "prohibited-activities",
        title: "Prohibited Activities",
        content:
          "The following activities are strictly prohibited:\n- Fraudulent or misleading listings\n- Fake enquiries or bookings\n- Identity misrepresentation\n- Attempting to bypass platform fees or processes\n- Harassment or abusive behaviour",
      },
      {
        id: "payment-safety",
        title: "Payment Safety",
        content:
          "Where payments are processed through the platform, we use secure third-party providers. We do not store full payment card details.",
      },
      {
        id: "content-monitoring",
        title: "Content Monitoring",
        content:
          "We reserve the right to review, flag, or remove content that violates platform standards or undermines trust.",
      },
      {
        id: "account-enforcement",
        title: "Account Enforcement",
        content:
          "We may suspend or permanently remove accounts involved in:\n- Fraud\n- Repeated policy violations\n- Attempts to manipulate the platform",
      },
      {
        id: "safety-commitment",
        title: "Safety Commitment",
        content:
          "We are committed to continuously improving safety mechanisms to protect both property providers and users.",
      },
    ]),
  },
];

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required in .env to run seed-legal-docs.js");
  }

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const doc of LEGAL_DOCS) {
    const existing = await prisma.legalDocument.findFirst({
      where: { slug: doc.slug, isActive: true },
    });

    if (existing) {
      const currentHash = createHash("sha256")
        .update(existing.content)
        .digest("hex");
      const legacyHash = LEGACY_SEEDED_CONTENT_HASHES[doc.slug];

      // Upgrade only unchanged version-one seed records; never overwrite Admin-published content.
      if (existing.version !== 1 || currentHash !== legacyHash) {
        skipped += 1;
        console.log(`  skip  ${doc.slug}`);
        continue;
      }

      await prisma.$transaction(async (transaction) => {
        await transaction.legalDocument.update({
          where: { id: existing.id },
          data: { isActive: false, archivedAt: new Date() },
        });
        await transaction.legalDocument.create({
          data: {
            slug: doc.slug,
            title: doc.title,
            content: doc.content,
            isActive: true,
            version: existing.version + 1,
          },
        });
      });

      updated += 1;
      console.log(`  update ${doc.slug}`);
      continue;
    }

    await prisma.legalDocument.create({
      data: {
        slug: doc.slug,
        title: doc.title,
        content: doc.content,
        isActive: true,
        version: 1,
      },
    });

    created += 1;
    console.log(`  seed  ${doc.slug}`);
  }

  console.log(
    `\nLegal documents seeded: ${created} created, ${updated} updated, ${skipped} skipped`
  );
}

main()
  .catch((error) => {
    console.error(error.message || error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
