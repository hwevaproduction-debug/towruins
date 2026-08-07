require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });
const prisma = require("../utils/prisma");

const LEGAL_DOCS = [
  {
    slug: "terms-of-use",
    title: "Tenant & Guest Agreement",
    content: JSON.stringify([
      { id: "tenant-guest-agreement", title: "Tenant & Guest Agreement", content: "This Agreement applies to all users of the platform seeking accommodation, including residential tenants and short-term guests.\nBy using the platform to search for, enquire about, or book accommodation, you agree to the following terms:" },
      { id: "platform-role", title: "Platform Role", content: "The platform acts solely as an intermediary connecting users with property owners, landlords, hotels, and other accommodation providers. We do not own, manage, or control any listed property." },
      { id: "accuracy-of-information", title: "Accuracy of Information", content: "You agree to provide accurate, complete, and truthful information when making enquiries or bookings, including identity and booking details where required." },
      { id: "booking-responsibility", title: "Booking Responsibility", content: "All bookings and tenancy arrangements are entered into directly between you and the property provider. The platform is not a party to these agreements." },
      { id: "payments", title: "Payments", content: "Where payments are made through the platform, they are processed securely via third-party payment providers. Payment terms are subject to the individual property\u2019s policies." },
      { id: "user-conduct", title: "User Conduct", content: "You agree not to:\nMisuse the platform or submit false enquiries\nEngage in fraudulent or unlawful activity\nAttempt to bypass the platform after initiating contact or booking\nDamage, misuse, or fail to respect any property you occupy" },
      { id: "residential-tenancy-use", title: "Residential Tenancy Use", content: "Where the platform is used for long-term rentals, you acknowledge that:\nThe final tenancy agreement is between you and the landlord only\nThe landlord is solely responsible for property condition, legality, and tenancy enforcement\nThe platform is not responsible for eviction, disputes, or rental arrears" },
      { id: "short-term-guest-use", title: "Short-Term Guest Use", content: "Where the platform is used for hotels, lodges, or short-term stays:\nYou agree to comply with the property\u2019s rules and policies during your stay\nYou are supposed to pay for any damages you caused as needed by the property owner\nCancellation and refund policies are set by the property provider" },
      { id: "limitation-of-liability", title: "Limitation of Liability", content: "To the fullest extent permitted by law, the platform shall not be liable for:\nProperty conditions or misrepresentations by hosts\nDisputes between users and property providers\nLoss, damage, or injury occurring during occupancy" },
      { id: "account-suspension", title: "Account Suspension", content: "We reserve the right to suspend or terminate access where there is reasonable evidence of misuse, fraud, or violation of these terms." },
      { id: "governing-law", title: "Governing Law", content: "This Agreement is governed by the laws of Zimbabwe.\nHow do we know that someone used our platform to get a room at a hotel?????" }
    ]),
  },
  {
    slug: "privacy-policy",
    title: "Privacy Policy",
    content: JSON.stringify([
      { id: "privacy-policy", title: "Privacy Policy", content: "We are committed to protecting your personal information and your right to privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our platform." },
      { id: "information-we-collect", title: "Information We Collect", content: "We may collect the following types of information:\nPersonal details (name, email address, phone number)\nBooking and enquiry information\nProperty listing details\nPayment-related information (processed securely through third-party providers)\nDevice and usage data (IP address, browser type, activity on the platform)" },
      { id: "how-we-use-your-information", title: "How We Use Your Information", content: "We use your information to:\nFacilitate bookings and enquiries\nConnect tenants, landlords, hotels, and guests\nImprove our platform and user experience\nCommunicate important updates and support responses\nPrevent fraud and ensure platform security" },
      { id: "legal-basis-for-processing", title: "Legal Basis for Processing", content: "We process personal data in accordance with applicable laws, including the Data Protection Act (Zimbabwe) and international data protection standards. This includes:\nUser consent\nPerformance of a contract\nLegal obligations\nLegitimate business interests" },
      { id: "sharing-of-information", title: "Sharing of Information", content: "We may share your information with:\nProperty owners or guests (to facilitate bookings)\nService providers (payment processors, hosting services)\nLegal authorities where required by law\nWe do not sell your personal data." },
      { id: "data-security", title: "Data Security", content: "We implement appropriate technical and organizational measures to protect your data. However, no system is completely secure." },
      { id: "data-retention", title: "Data Retention", content: "We retain your data only as long as necessary to provide our services and comply with legal obligations." },
      { id: "your-rights", title: "Your Rights", content: "Depending on your location, you may have the right to:\nAccess your personal data\nRequest correction or deletion\nObject to processing\nWithdraw consent" },
      { id: "cookies", title: "Cookies", content: "We use cookies to improve functionality and user experience. You can control cookie settings through your browser." },
      { id: "changes-to-this-policy", title: "Changes to This Policy", content: "We may update this Privacy Policy from time to time. Updates will be posted on this page." },
      { id: "contact-us", title: "Contact Us", content: "If you have questions, contact us at: support@townruins.com" }
    ]),
  },
  {
    slug: "landlord-terms",
    title: "Host & Landlord Agreement",
    content: JSON.stringify([
      { id: "host-landlord-agreement", title: "Host & Landlord Agreement", content: "This Agreement applies to all property owners, including residential landlords, hotels, lodges, and any other accommodation providers listed on the platform.\nBy listing a property on our platform, you agree to the following terms:" },
      { id: "role-of-the-platform", title: "Role of the Platform", content: "The platform operates as a neutral intermediary connecting property owners (including residential landlords and hospitality providers) with tenants and guests. We do not own, manage, or control any listed property." },
      { id: "scope-of-listings", title: "Scope of Listings", content: "This Agreement applies to:\nResidential rental properties (apartments, houses, rooms, shared accommodation)\nShort-term accommodation (hotels, lodges, guest houses, serviced stays)" },
      { id: "accuracy-and-responsibility", title: "Accuracy and Responsibility", content: "You are solely responsible for ensuring that all listing information is accurate, lawful, and up to date, including:\nRental terms and pricing (for residential properties)\nAvailability and occupancy conditions\nProperty condition and suitability" },
      { id: "booking-and-tenancy-commitments", title: "Booking and Tenancy Commitments", content: "You agree to honour:\nConfirmed bookings for short-term stays\nConfirmed tenancy arrangements or rental agreements initiated through the platform" },
      { id: "commission-fees", title: "Commission Fees", content: "You agree to pay the applicable commission on all successful transactions facilitated through the platform, including:\nShort-term bookings (hotels and lodges)\nLong-term rental agreements (residential properties where applicable under platform terms)" },
      { id: "non-circumvention", title: "Non-Circumvention", content: "You agree not to bypass the platform in order to avoid commission fees for any enquiry, introduction, or transaction initiated through the platform." },
      { id: "residential-landlord-obligations", title: "Residential Landlord Obligations", content: "Where applicable, residential landlords acknowledge that:\nThe platform facilitates tenant discovery and connection only\nFinal tenancy agreements are executed directly between landlord and tenant\nThe landlord is responsible for screening, legal compliance, and tenancy enforcement\nThe platform is not a party to long-term tenancy disputes" },
      { id: "hospitality-provider-obligations", title: "Hospitality Provider Obligations", content: "Hotels and lodges acknowledge responsibility for:\nMaintaining accurate room availability and pricing\nHonour of confirmed bookings\nService delivery standards consistent with advertised offerings" },
      { id: "compliance", title: "Compliance", content: "All users must comply with applicable laws and regulations in Zimbabwe relating to property rental, tenancy, accommodation services, and taxation." },
      { id: "enforcement-and-removal", title: "Enforcement and Removal", content: "We reserve the right to suspend or remove any listing that:\nViolates these terms\nMisleads users\nUndermines platform integrity or trust" },
      { id: "governing-law", title: "Governing Law", content: "This Agreement shall be governed by and interpreted in accordance with the laws of Zimbabwe." }
    ]),
  },
  {
    slug: "refund-policy",
    title: "Refund and Cancellation Policy",
    content: JSON.stringify([
      { id: "refund-and-cancellation-policy", title: "Refund and Cancellation Policy", content: "Cancellation and refund terms depend on the individual property\u2019s policy-Are we\nUsers are encouraged to review cancellation terms before booking.\nIn cases where payments are processed through our platform, refunds (if applicable) will be handled in accordance with the property\u2019s policy.\nWe are not responsible for disputes between guests and property owners but will provide reasonable support where possible.\nCookie Policy\nWe use cookies to enhance your experience on our platform.\nCookies help us:\nRemember your preferences\nUnderstand how users interact with our platform\nImprove performance and functionality\nYou can disable cookies in your browser settings, but some features may not function properly.\nDispute Resolution Policy\nThis Policy outlines how disputes between users of the platform are handled." },
      { id: "scope", title: "Scope", content: "This Policy applies to disputes between:\nTenants/guests and landlords\nGuests and hotels or accommodation providers\nUsers and the platform (where applicable)" },
      { id: "platform-role", title: "Platform Role", content: "The platform acts solely as an intermediary and is not a party to rental, tenancy, or accommodation agreements. However, we may provide assistance in facilitating communication between parties." },
      { id: "primary-resolution-method", title: "Primary Resolution Method", content: "In the event of a dispute, users are encouraged to first attempt to resolve the issue directly between themselves." },
      { id: "platform-assistance", title: "Platform Assistance", content: "Where direct resolution is unsuccessful, the platform may:\nReview relevant communication and booking records\nRequest additional information from both parties\nProvide non-binding mediation support" },
      { id: "limitations", title: "Limitations", content: "The platform does not act as a court, arbitrator, or legal authority and does not issue legally binding decisions." },
      { id: "escalation", title: "Escalation", content: "Users may escalate unresolved disputes to relevant legal or regulatory authorities in Zimbabwe." },
      { id: "good-faith-requirement", title: "Good Faith Requirement", content: "All users are expected to engage in good faith during dispute resolution. Abuse of the dispute system may result in account suspension.\nTrust & Safety Policy\nWe are committed to maintaining a safe, transparent, and trustworthy platform for all users." },
      { id: "verification-and-listings", title: "Verification and Listings", content: "We may implement verification processes for:\nProperty listings\nUser accounts\nContact information\nListings that appear misleading or incomplete may be removed." },
      { id: "prohibited-activities", title: "Prohibited Activities", content: "The following activities are strictly prohibited:\nFraudulent or misleading listings\nFake enquiries or bookings\nIdentity misrepresentation\nAttempting to bypass platform fees or processes\nHarassment or abusive behaviour" },
      { id: "payment-safety", title: "Payment Safety", content: "Where payments are processed through the platform, we use secure third-party providers. We do not store full payment card details." },
      { id: "content-monitoring", title: "Content Monitoring", content: "We reserve the right to review, flag, or remove content that violates platform standards or undermines trust." },
      { id: "account-enforcement", title: "Account Enforcement", content: "We may suspend or permanently remove accounts involved in:\nFraud\nRepeated policy violations\nAttempts to manipulate the platform" },
      { id: "safety-commitment", title: "Safety Commitment", content: "We are committed to continuously improving safety mechanisms to protect both property providers and users.\nPlatform Rules Summary\nWelcome to our platform. To keep things fair, safe, and reliable for everyone, please follow these simple rules:" },
      { id: "be-honest", title: "Be Honest", content: "Only provide accurate information when making enquiries or listings." },
      { id: "respect-commitments", title: "Respect Commitments", content: "If you confirm a booking or tenancy, you are expected to honour it." },
      { id: "use-the-platform-properly", title: "Use the Platform Properly", content: "Do not attempt to bypass the platform after being introduced to a property." },
      { id: "respect-properties", title: "Respect Properties", content: "Treat all accommodation with care and respect house or property rules." },
      { id: "payments", title: "Payments", content: "Only make payments through approved methods and only for confirmed bookings." },
      { id: "fair-use", title: "Fair Use", content: "Any misuse of the platform, including fraud or fake activity, may result in account suspension." },
      { id: "our-goal-is-simple", title: "Our goal is simple:", content: "To make finding and offering accommodation safe, fair, and reliable for everyone." }
    ]),
  },
  {
    slug: "community-guidelines",
    title: "Community Guidelines",
    content: JSON.stringify([
      { id: "values", title: "Our Values", content: "Town Ruins is built for direct, respectful property discovery. Accuracy, fairness, safety, and accountability are expected from tenants, landlords, hosts, and providers." },
      { id: "communication", title: "Respectful Communication", content: "Messages should be clear, honest, and courteous. Do not pressure users, insult them, share private information, or continue contact after someone asks you to stop." },
      { id: "prohibited", title: "Prohibited Behavior", content: "Threats, scams, discrimination, fake documents, fake listings, spam, harassment, and illegal activity are not allowed on Town Ruins." },
      { id: "reporting", title: "Reporting Violations", content: "Users should report suspicious listings, unsafe behavior, or policy violations to support@townruins.com with relevant screenshots, links, and account details." },
      { id: "consequences", title: "Consequences", content: "Violations may result in warnings, content removal, feature restrictions, account suspension, permanent termination, or referral to relevant authorities." },
      { id: "appeals", title: "Appeals", content: "Users may appeal enforcement decisions by contacting support with context, evidence, and the account email connected to the decision." },
    ]),
  },
  {
    slug: "trust-safety",
    title: "Trust & Safety",
    content: JSON.stringify([
      { id: "commitment", title: "Our Commitment", content: "Town Ruins combines verification, reporting tools, payment records, and moderation workflows to reduce fraud and improve confidence in property discovery." },
      { id: "landlord", title: "Landlord Verification", content: "Landlords may be asked to submit identity documents, selfies, phone numbers, and property authority information before publishing or receiving enhanced visibility." },
      { id: "identity", title: "Identity Verification", content: "Identity checks help confirm that users are real people and reduce impersonation. Verification status may be shown where it helps tenants assess trust." },
      { id: "payments", title: "Secure Payments", content: "Where Town Ruins processes payments, we use transaction references, audit records, and provider checks to track payment status and support dispute resolution." },
      { id: "disputes", title: "Dispute Resolution", content: "Users can raise disputes with supporting evidence. Town Ruins may review messages, listings, bookings, payment records, and account activity to help reach a fair outcome." },
      { id: "reporting", title: "Reporting", content: "Report unsafe conduct, fake listings, payment scams, or suspicious accounts to support@townruins.com." },
    ]),
  },
];

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required in .env to run seed-legal-docs.js");
  }

  let created = 0;
  let skipped = 0;

  for (const doc of LEGAL_DOCS) {
    const existing = await prisma.legalDocument.findFirst({
      where: { slug: doc.slug, isActive: true },
    });

    if (existing) {
      skipped += 1;
      console.log(`  skip  ${doc.slug}`);
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

  console.log(`\nLegal documents seeded: ${created} created, ${skipped} skipped`);
}

main()
  .catch((error) => {
    console.error(error.message || error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
