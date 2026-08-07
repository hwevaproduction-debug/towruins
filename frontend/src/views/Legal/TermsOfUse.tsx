import { Box, CircularProgress } from "@mui/material";
import LegalPageLayout from "../../components/LegalPageLayout";
import { useGetPublicLegalDocQuery } from "../../redux/api/legalApiSlice";

const sections = [
  { id: "introduction", title: "Introduction", content: "Town Ruins is a Zimbabwe-focused property rental platform connecting tenants with landlords and accommodation hosts. By using the platform, you agree to follow these terms and use the service only for lawful property discovery, listing, booking, and communication." },
  { id: "eligibility", title: "Eligibility", content: "You must be at least 18 years old and able to provide valid Zimbabwe identification or other accepted verification details when requested. Accounts may be refused or restricted where identity, age, or eligibility cannot be confirmed." },
  { id: "account-registration", title: "Account Registration", content: "You must provide accurate, current information and keep your account secure. Each person may maintain one account unless Town Ruins approves otherwise. You are responsible for activity under your login credentials." },
  { id: "listing-rules", title: "Listing Rules", content: "Listings must accurately describe the property, price, location, availability, rules, and amenities. Photos must represent the actual property and must not mislead tenants about size, condition, access, or surroundings." },
  { id: "tenant-responsibilities", title: "Tenant Responsibilities", content: "Tenants must communicate respectfully, make agreed payments on time, inspect properties responsibly, and care for any property they occupy. Tenants must not misuse landlord contact details or submit false enquiries." },
  { id: "payments-fees", title: "Payments & Fees", content: "Town Ruins uses TR Tokens for platform features such as premium access, listing activation, and engagement charges. The only direct money payments are for purchasing TR Tokens and for booking-related stay payments shown at checkout." },
  { id: "prohibited-conduct", title: "Prohibited Conduct", content: "Fraud, harassment, impersonation, spam, illegal listings, discriminatory conduct, and attempts to bypass platform safety processes are prohibited. Town Ruins may investigate and restrict accounts involved in suspicious activity." },
  { id: "termination", title: "Termination", content: "We may suspend or terminate accounts that violate these terms, harm users, create legal risk, or undermine platform trust. Users may stop using the service at any time and may request account deletion where applicable." },
  { id: "governing-law", title: "Governing Law", content: "These terms are governed by the laws of Zimbabwe. Disputes should first be raised with Town Ruins support so we can attempt practical resolution before further legal steps." },
  { id: "contact", title: "Contact", content: "Questions about these terms can be sent to support@townruins.com." },
];

export default function TermsOfUse() {
  const { data, isLoading } = useGetPublicLegalDocQuery("terms-of-use");
  const apiSections = data?.data?.content ? (() => { try { return JSON.parse(data.data.content); } catch { return null; } })() : null;
  const resolvedSections = apiSections ?? sections;
  const lastUpdated = data?.data?.updatedAt ? new Date(data.data.updatedAt).toLocaleDateString("en-US", { month: "long", year: "numeric" }) : "May 2026";

  if (isLoading) {
    return <Box sx={{ display: "flex", justifyContent: "center", py: 10 }}><CircularProgress /></Box>;
  }

  return <LegalPageLayout title="Terms of Use" lastUpdated={lastUpdated} sections={resolvedSections} />;
}
