import { Box, CircularProgress } from "@mui/material";
import LegalPageLayout from "../../components/LegalPageLayout";
import { useGetPublicLegalDocQuery } from "../../redux/api/legalApiSlice";

const sections = [
  { id: "overview", title: "Overview", content: "This policy explains how cancellation and refund requests are handled for Town Ruins wallet transactions, TR Token purchases, premium access, temporary stays, and platform services." },
  { id: "flexible", title: "Flexible Policy", content: "Where a flexible policy applies, guests may cancel within the displayed free-cancellation period and receive the eligible refund less any non-refundable processing fees." },
  { id: "moderate", title: "Moderate Policy", content: "Moderate bookings may qualify for partial refunds depending on timing, landlord approval, and costs already incurred by the host or platform." },
  { id: "strict", title: "Strict Policy", content: "Strict bookings may be refundable only in limited cases, such as verified duplicate payment, host cancellation, or legally required refund circumstances." },
  { id: "non-refundable", title: "Non-Refundable Bookings", content: "Non-refundable TR Token purchases and promotional fees are not refundable unless required by law or explicitly stated at checkout." },
  { id: "request", title: "How to Request a Refund", content: "Contact support@townruins.com with your account email, payment reference, booking or listing ID, and reason for the refund request." },
  { id: "times", title: "Processing Times", content: "Approved refunds are usually submitted to the payment provider within 5 to 10 business days, but final settlement depends on banks, wallets, and processors." },
];

export default function RefundPolicy() {
  const { data, isLoading } = useGetPublicLegalDocQuery("refund-policy");
  const apiSections = data?.data?.content ? (() => { try { return JSON.parse(data.data.content); } catch { return null; } })() : null;
  const resolvedSections = apiSections ?? sections;
  const lastUpdated = data?.data?.updatedAt ? new Date(data.data.updatedAt).toLocaleDateString("en-US", { month: "long", year: "numeric" }) : "May 2026";

  if (isLoading) {
    return <Box sx={{ display: "flex", justifyContent: "center", py: 10 }}><CircularProgress /></Box>;
  }

  return <LegalPageLayout title="Refund & Cancellation Policy" lastUpdated={lastUpdated} sections={resolvedSections} />;
}
