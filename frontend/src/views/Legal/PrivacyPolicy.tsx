import { Box, CircularProgress } from "@mui/material";
import LegalPageLayout from "../../components/LegalPageLayout";
import { useGetPublicLegalDocQuery } from "../../redux/api/legalApiSlice";

const sections = [
  { id: "information", title: "Information We Collect", content: "We collect account details, contact information, listing and booking activity, verification documents where required, payment references, device data, and messages or support requests submitted through Town Ruins." },
  { id: "use", title: "How We Use Your Data", content: "We use data to operate accounts, show listings, process wallet transactions and stay payments, support verification, prevent fraud, improve search quality, send service messages, and comply with legal obligations in Zimbabwe." },
  { id: "sharing", title: "Data Sharing", content: "We share only what is needed to deliver the service, such as approved contact details between tenants and landlords, payment information with processors, or records with authorities where legally required." },
  { id: "rights", title: "Your Rights", content: "You may request access, correction, deletion, or restriction of your personal information, subject to identity checks and legal retention requirements." },
  { id: "cookies", title: "Cookies & Tracking", content: "Town Ruins may use cookies and similar technologies to keep you signed in, remember preferences, protect accounts, measure performance, and understand platform usage." },
  { id: "retention", title: "Data Retention", content: "We keep information while your account is active and for reasonable periods afterward where needed for disputes, audits, fraud prevention, accounting, or legal compliance." },
  { id: "contact", title: "Contact Us", content: "Privacy requests can be sent to support@townruins.com." },
];

export default function PrivacyPolicy() {
  const { data, isLoading } = useGetPublicLegalDocQuery("privacy-policy");
  const apiSections = data?.data?.content ? (() => { try { return JSON.parse(data.data.content); } catch { return null; } })() : null;
  const resolvedSections = apiSections ?? sections;
  const lastUpdated = data?.data?.updatedAt ? new Date(data.data.updatedAt).toLocaleDateString("en-US", { month: "long", year: "numeric" }) : "May 2026";

  if (isLoading) {
    return <Box sx={{ display: "flex", justifyContent: "center", py: 10 }}><CircularProgress /></Box>;
  }

  return <LegalPageLayout title="Privacy Policy" lastUpdated={lastUpdated} sections={resolvedSections} />;
}
