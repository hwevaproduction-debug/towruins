import { useState } from "react";
import { Alert, Box, Container, Link, Typography } from "@mui/material";
import AppButton from "../ui/AppButton";
import AppCard from "../ui/AppCard";

export interface LegalSection {
  id: string;
  title: string;
  content: string;
}

interface LegalPageLayoutProps {
  title: string;
  sections: LegalSection[];
  unavailableMessage?: string;
}

const inlineLinkPattern =
  /(\[[^\]]+\]\((?:https?:\/\/|mailto:)[^)]+\)|https?:\/\/[^\s]+|[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})/gi;

const renderInlineText = (text: string) =>
  text.split(inlineLinkPattern).map((part, index) => {
    const markdownLink = part.match(/^\[([^\]]+)\]\(((?:https?:\/\/|mailto:)[^)]+)\)$/i);
    if (markdownLink) {
      return (
        <Link key={index} href={markdownLink[2]} target="_blank" rel="noreferrer">
          {markdownLink[1]}
        </Link>
      );
    }

    if (/^https?:\/\//i.test(part)) {
      return (
        <Link key={index} href={part} target="_blank" rel="noreferrer">
          {part}
        </Link>
      );
    }

    if (/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(part)) {
      return (
        <Link key={index} href={`mailto:${part}`}>
          {part}
        </Link>
      );
    }

    return part;
  });

const renderSectionContent = (content: string) => {
  const blocks: Array<{
    type: "paragraph" | "unordered" | "ordered" | "heading";
    lines: string[];
  }> = [];
  let currentParagraph: string[] = [];
  let currentList: "unordered" | "ordered" | null = null;
  let listLines: string[] = [];

  const flushParagraph = () => {
    if (currentParagraph.length) {
      blocks.push({ type: "paragraph", lines: currentParagraph });
      currentParagraph = [];
    }
  };
  const flushList = () => {
    if (currentList && listLines.length) {
      blocks.push({ type: currentList, lines: listLines });
    }
    currentList = null;
    listLines = [];
  };

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) {
      flushParagraph();
      flushList();
      continue;
    }

    const heading = line.match(/^#{1,3}\s+(.+)$/);
    if (heading) {
      flushParagraph();
      flushList();
      blocks.push({ type: "heading", lines: [heading[1]] });
      continue;
    }

    const bullet = line.match(/^(?:[-*•])\s+(.+)$/);
    const ordered = line.match(/^\d+[.)]\s+(.+)$/);
    const listType = bullet ? "unordered" : ordered ? "ordered" : null;
    if (listType) {
      flushParagraph();
      if (currentList !== listType) flushList();
      currentList = listType;
      listLines.push((bullet || ordered)![1]);
      continue;
    }

    flushList();
    currentParagraph.push(line);
  }
  flushParagraph();
  flushList();

  return blocks.map((block, index) => {
    if (block.type === "heading") {
      return (
        <Typography
          key={index}
          component="h3"
          variant="h6"
          sx={{ fontWeight: 700, mt: 2, mb: 1 }}
        >
          {renderInlineText(block.lines[0])}
        </Typography>
      );
    }

    if (block.type === "unordered" || block.type === "ordered") {
      const List = block.type === "unordered" ? "ul" : "ol";
      return (
        <Box
          key={index}
          component={List}
          sx={{ pl: 3, my: 1, color: "text.secondary" }}
        >
          {block.lines.map((line, lineIndex) => (
            <Box component="li" key={lineIndex} sx={{ mb: 0.5 }}>
              {renderInlineText(line)}
            </Box>
          ))}
        </Box>
      );
    }

    return (
      <Typography
        key={index}
        component="p"
        sx={{ color: "text.secondary", fontSize: 14, lineHeight: 1.8, my: 0 }}
      >
        {renderInlineText(block.lines.join(" "))}
      </Typography>
    );
  });
};

const LegalPageLayout = ({
  title,
  sections,
  unavailableMessage,
}: LegalPageLayoutProps) => {
  const [activeId, setActiveId] = useState(sections[0]?.id || "");

  const scrollToSection = (id: string) => {
    setActiveId(id);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <Box>
      <Box
        sx={{
          background: "linear-gradient(135deg, #1F2937 0%, #1F4D3A 100%)",
          py: 10,
          textAlign: "center",
          px: 2,
        }}
      >
        <Box
          sx={{
            color: "#B8975A",
            fontSize: "11px",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.15em",
            mb: 1,
          }}
        >
          Legal
        </Box>
        <Box
          component="h1"
          sx={{ color: "#fff", fontSize: { xs: "2rem", md: "2.5rem" }, fontWeight: 800, m: 0 }}
        >
          {title}
        </Box>
      </Box>
      <Container maxWidth="lg" sx={{ py: 6 }}>
        {unavailableMessage ? (
          <Alert severity="warning" role="alert" sx={{ mb: 3 }}>
            {unavailableMessage}
          </Alert>
        ) : null}
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "220px 1fr" }, gap: 4 }}>
          <Box component="nav" aria-label={`${title} sections`} sx={{ position: { md: "sticky" }, top: 80, alignSelf: "start" }}>
            {sections
              .filter((section) => section.title)
              .map((section) => (
                <Box
                  key={section.id}
                  component="a"
                  href={`#${section.id}`}
                  onClick={() => scrollToSection(section.id)}
                  sx={{
                    display: "block",
                    cursor: "pointer",
                    color: activeId === section.id ? "#B8975A" : "text.secondary",
                    fontWeight: activeId === section.id ? 800 : 600,
                    fontSize: 14,
                    py: 1,
                    textDecoration: "none",
                    "&:hover": { color: "#B8975A" },
                  }}
                >
                  {section.title}
                </Box>
              ))}
          </Box>
          <Box component="main">
            {sections.map((section) => (
              <AppCard
                key={section.id}
                id={section.id}
                sx={{ mb: 2, p: 3, scrollMarginTop: "96px" }}
              >
                {section.title ? (
                  <Typography component="h2" sx={{ color: "text.primary", fontWeight: 800, fontSize: "20px", mb: 1 }}>
                    {section.title}
                  </Typography>
                ) : null}
                {renderSectionContent(section.content)}
              </AppCard>
            ))}
          </Box>
        </Box>
      </Container>
      <Box sx={{ textAlign: "center", py: 6 }}>
        <Box sx={{ fontWeight: 800, fontSize: "24px", mb: 2 }}>
          Ready to get started?
        </Box>
        <AppButton href="/signup">Create an account</AppButton>
      </Box>
    </Box>
  );
};

export default LegalPageLayout;
