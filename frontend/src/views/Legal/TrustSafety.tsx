import { Box, CircularProgress } from "@mui/material";
import LegalPageLayout from "../../components/LegalPageLayout";
import { useGetPublicLegalDocQuery } from "../../redux/api/legalApiSlice";

const sections = [
  { id: "commitment", title: "Our Commitment", content: "Town Ruins combines verification, reporting tools, wallet records, and moderation workflows to reduce fraud and improve confidence in property discovery." },
  { id: "landlord", title: "Landlord Verification", content: "Landlords may be asked to submit identity documents, selfies, phone numbers, and property authority information before publishing or receiving enhanced visibility." },
  { id: "identity", title: "Identity Verification", content: "Identity checks help confirm that users are real people and reduce impersonation. Verification status may be shown where it helps tenants assess trust." },
  { id: "payments", title: "Secure Payments", content: "Where Town Ruins processes stay payments, we use transaction references, audit records, and provider checks to track payment status and support dispute resolution." },
  { id: "disputes", title: "Dispute Resolution", content: "Users can raise disputes with supporting evidence. Town Ruins may review messages, listings, bookings, wallet records, and account activity to help reach a fair outcome." },
  { id: "reporting", title: "Reporting", content: "Report unsafe conduct, fake listings, payment scams, or suspicious accounts to support@townruins.com." },
];

export default function TrustSafety() {
  const { data, isLoading } = useGetPublicLegalDocQuery("trust-safety");
  const apiSections = data?.data?.content ? (() => { try { return JSON.parse(data.data.content); } catch { return null; } })() : null;
  const resolvedSections = apiSections ?? sections;
  const lastUpdated = data?.data?.updatedAt ? new Date(data.data.updatedAt).toLocaleDateString("en-US", { month: "long", year: "numeric" }) : "May 2026";

  if (isLoading) {
    return <Box sx={{ display: "flex", justifyContent: "center", py: 10 }}><CircularProgress /></Box>;
  }

  return <LegalPageLayout title="Trust & Safety" lastUpdated={lastUpdated} sections={resolvedSections} />;
}
