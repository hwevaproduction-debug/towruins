import { render, screen } from "@testing-library/react";
import CommunityGuidelines from "./CommunityGuidelines";
import LandlordTerms from "./LandlordTerms";
import PrivacyPolicy from "./PrivacyPolicy";
import RefundPolicy from "./RefundPolicy";
import TermsOfUse from "./TermsOfUse";
import TrustSafety from "./TrustSafety";
import { useGetPublicLegalDocQuery } from "../../redux/api/legalApiSlice";
import { ThemeProvider } from "@mui/material/styles";
import { createAppTheme } from "../../theme";

jest.mock("../../redux/api/legalApiSlice", () => ({
  useGetPublicLegalDocQuery: jest.fn(),
}));

const mockGetPublicLegalDoc =
  useGetPublicLegalDocQuery as jest.MockedFunction<
    typeof useGetPublicLegalDocQuery
  >;

const pages = [
  {
    Page: TermsOfUse,
    slug: "terms-of-use",
    title: "Terms of Use",
  },
  {
    Page: PrivacyPolicy,
    slug: "privacy-policy",
    title: "Privacy Policy",
  },
  {
    Page: CommunityGuidelines,
    slug: "community-guidelines",
    title: "Community Guidelines",
  },
  {
    Page: RefundPolicy,
    slug: "refund-policy",
    title: "Refund & Cancellation Policy",
  },
  {
    Page: LandlordTerms,
    slug: "landlord-terms",
    title: "Host & Landlord Agreement",
  },
  {
    Page: TrustSafety,
    slug: "trust-safety",
    title: "Trust & Safety",
  },
];

beforeEach(() => {
  mockGetPublicLegalDoc.mockReset();
});

it.each(pages)("loads the published $slug document", ({ Page, slug, title }) => {
  mockGetPublicLegalDoc.mockReturnValue({
    data: {
      status: "success",
      data: {
        id: slug,
        slug,
        title,
        version: 1,
        content: JSON.stringify([
          {
            id: "source-section",
            title: "Source-backed section",
            content: "Published policy text.",
          },
        ]),
        isActive: true,
        createdAt: "2026-09-01T00:00:00.000Z",
        updatedAt: "2026-09-01T00:00:00.000Z",
      },
    },
    isError: false,
    isLoading: false,
    refetch: jest.fn(),
  } as ReturnType<typeof useGetPublicLegalDocQuery>);

  render(<Page />);

  expect(mockGetPublicLegalDoc).toHaveBeenCalledWith(slug);
  expect(
    screen.getByRole("heading", { name: "Source-backed section" })
  ).toBeInTheDocument();
  expect(screen.getByText("Published policy text.")).toBeInTheDocument();
});

it("renders text, lists, and mail links without exposing raw markup", () => {
  mockGetPublicLegalDoc.mockReturnValue({
    data: {
      status: "success",
      data: {
        id: "terms",
        slug: "terms-of-use",
        title: "Tenant & Guest Agreement",
        version: 1,
        content: JSON.stringify([
          {
            id: "conduct",
            title: "User Conduct",
            content:
              "You agree not to:\n- Submit false enquiries\n- Contact support@townruins.com\n\n## Additional rule\nLiteral <em>markup</em> stays text.",
          },
        ]),
        isActive: true,
        createdAt: "2026-09-01T00:00:00.000Z",
        updatedAt: "2026-09-01T00:00:00.000Z",
      },
    },
    isError: false,
    isLoading: false,
    refetch: jest.fn(),
  } as ReturnType<typeof useGetPublicLegalDocQuery>);

  render(<TermsOfUse />);

  expect(screen.getByRole("list")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "support@townruins.com" })).toHaveAttribute(
    "href",
    "mailto:support@townruins.com"
  );
  expect(
    screen.getByRole("heading", { level: 3, name: "Additional rule" })
  ).toBeInTheDocument();
  expect(screen.getByText("Literal <em>markup</em> stays text.")).toBeInTheDocument();
});

it("uses readable theme colors for legal copy and lists in light mode", () => {
  mockGetPublicLegalDoc.mockReturnValue({
    data: {
      status: "success",
      data: {
        id: "terms",
        slug: "terms-of-use",
        title: "Tenant & Guest Agreement",
        version: 1,
        content: JSON.stringify([
          {
            id: "conduct",
            title: "User Conduct",
            content: "Published policy text.\n- A listed rule",
          },
        ]),
        isActive: true,
        createdAt: "2026-09-01T00:00:00.000Z",
        updatedAt: "2026-09-01T00:00:00.000Z",
      },
    },
    isError: false,
    isLoading: false,
    refetch: jest.fn(),
  } as ReturnType<typeof useGetPublicLegalDocQuery>);

  render(
    <ThemeProvider theme={createAppTheme("light")}>
      <TermsOfUse />
    </ThemeProvider>
  );

  expect(getComputedStyle(screen.getByText("Published policy text.")).color).toBe(
    "rgb(71, 85, 105)"
  );
  expect(getComputedStyle(screen.getByRole("list")).color).toBe(
    "rgb(71, 85, 105)"
  );
});

it("does not substitute fallback policy text when no document is published", () => {
  mockGetPublicLegalDoc.mockReturnValue({
    data: { status: "success", data: null },
    isError: false,
    isLoading: false,
    refetch: jest.fn(),
  } as ReturnType<typeof useGetPublicLegalDocQuery>);

  render(<TermsOfUse />);

  expect(screen.getByRole("alert")).toHaveTextContent(
    "This document has not been published yet."
  );
  expect(
    screen.queryByText(/To the fullest extent permitted by law/)
  ).not.toBeInTheDocument();
});
