import { Box, CircularProgress } from "@mui/material";
import LegalPageLayout, { LegalSection } from "./LegalPageLayout";
import { useGetPublicLegalDocQuery } from "../redux/api/legalApiSlice";

interface LegalDocumentPageProps {
  slug: string;
  title: string;
}

interface ParsedLegalSection {
  id?: unknown;
  title: string;
  content: string;
}

const isParsedLegalSection = (item: unknown): item is ParsedLegalSection => {
  if (typeof item !== "object" || item === null) return false;
  const section = item as Record<string, unknown>;
  return (
    typeof section.title === "string" &&
    typeof section.content === "string"
  );
};

const sectionId = (title: string, index: number) =>
  title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || `section-${index + 1}`;

const parseDocumentSections = (content: string): LegalSection[] | null => {
  const trimmed = content.trim();
  if (!trimmed) return null;

  try {
    const parsed: unknown = JSON.parse(trimmed);
    if (Array.isArray(parsed)) {
      const parsedSections: unknown[] = parsed;
      if (!parsedSections.every(isParsedLegalSection)) return null;

      const sections = parsedSections.map((item, index) => {
        const id =
          typeof item.id === "string"
            ? item.id
            : sectionId(item.title, index);
        return { id, title: item.title, content: item.content };
      });
      return sections.length ? sections : null;
    }

    if (typeof parsed === "object" && parsed !== null) return null;
  } catch {
    // Plain-text content is supported by the Admin legal-document editor.
  }

  return [{ id: "document-content", title: "", content: trimmed }];
};

const LegalDocumentPage = ({ slug, title }: LegalDocumentPageProps) => {
  const { data, isError, isLoading } = useGetPublicLegalDocQuery(slug);

  if (isLoading) {
    return (
      <Box role="status" aria-label={`Loading ${title}`} sx={{ display: "flex", justifyContent: "center", py: 10 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (isError) {
    return (
      <LegalPageLayout
        title={title}
        sections={[]}
        unavailableMessage="The published document could not be loaded. Please try again later."
      />
    );
  }

  const document = data?.data;
  const sections = document ? parseDocumentSections(document.content) : null;

  if (!document || !sections) {
    return (
      <LegalPageLayout
        title={title}
        sections={[]}
        unavailableMessage="This document has not been published yet."
      />
    );
  }

  return <LegalPageLayout title={title} sections={sections} />;
};

export default LegalDocumentPage;
