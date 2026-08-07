// React Imports
import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
// MUI Imports
import { Box, Divider, Grid } from "@mui/material";
// Component Imports
import OverlayLoader from "../../../components/Spinner/OverlayLoader";
import { Heading, SubHeading } from "../../../components/Heading";
import AppContainer from "../../../components/ui/AppContainer";
import AppCard from "../../../components/ui/AppCard";
import AppButton from "../../../components/ui/AppButton";
import ContactModal from "../../../components/ContactModal";
import ImageLightbox from "../../../components/ImageLightbox";
import { studentAccommodationBadgeSx } from "../../../styles/listingBadges";
// Utils Imports
import { thousandSeparatorNumber } from "../../../utils";
import {
  Bath,
  BedDouble,
  Car,
  GraduationCap,
  Lock,
  MapPin,
  Phone,
  Sofa,
  Zap,
} from "lucide-react";
// Redux Imports
import useTypedSelector from "../../../hooks/useTypedSelector";
import {
  selectedUserRole,
  selectedUserToken,
} from "../../../redux/auth/authSlice";
import { useGetMyEngagementsQuery } from "../../../redux/api/engagementApiSlice";
import { useGetSingleListingQuery } from "../../../redux/api/listingApiSlice";

const iconStyle = {
  display: "flex",
  alignItems: "center",
  gap: "5px",
  color: "secondary.main",
  fontWeight: "bold",
};

const ViewListing = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const userToken = useTypedSelector(selectedUserToken);
  const userRole = useTypedSelector(selectedUserRole);
  const isLoggedIn = Boolean(userToken);
  const isTenant = userRole === "tenant";
  const contactIntentConsumedRef = useRef(false);
  const [contactModalOpen, setContactModalOpen] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  const { data, isLoading } = useGetSingleListingQuery(id as string, {
    skip: !id,
  });
  const { data: engagementsData, isLoading: engagementsLoading } =
    useGetMyEngagementsQuery(undefined, {
      skip: !isTenant,
    });
  const listing = data?.data;
  const images = Array.isArray(listing?.imageUrls) ? listing.imageUrls : [];
  const existingEngagement = engagementsData?.data?.find(
    (engagement: any) =>
      engagement?.listing?.id === id || engagement?.listingId === id
  );
  const price = thousandSeparatorNumber(
    listing?.monthlyRent || listing?.regularPrice
  );

  useEffect(() => {
    if (!listing || !id) return;

    const existing = localStorage.getItem("tr_recently_viewed");
    let recentlyViewed: Array<{ id: string; name: string }> = [];
    if (existing) {
      try {
        const parsed = JSON.parse(existing);
        recentlyViewed = Array.isArray(parsed) ? parsed : [];
      } catch {
        recentlyViewed = [];
      }
    }

    const next = [
      { id, name: listing.name },
      ...recentlyViewed.filter((item) => item.id !== id),
    ].slice(0, 10);
    localStorage.setItem("tr_recently_viewed", JSON.stringify(next));
  }, [id, listing]);

  useEffect(() => {
    const openContact = (location.state as any)?.openContact;
    if (contactIntentConsumedRef.current || !openContact || !userRole) {
      return;
    }

    if (userRole !== "tenant") {
      contactIntentConsumedRef.current = true;
      navigate(location.pathname, { replace: true, state: {} });
      return;
    }

    if (!listing || engagementsLoading) {
      return;
    }

    const engagementBlocksContact =
      existingEngagement?.status === "PENDING" ||
      existingEngagement?.status === "APPROVED";

    contactIntentConsumedRef.current = true;
    if (!engagementBlocksContact) {
      setContactModalOpen(true);
    }
    navigate(location.pathname, { replace: true, state: {} });
  }, [
    engagementsLoading,
    existingEngagement,
    listing,
    location.pathname,
    location.state,
    navigate,
    userRole,
  ]);

  const locationData = listing?.location;
  const publicLocation = [
    locationData?.city,
    locationData?.province,
    locationData?.country,
  ]
    .filter(Boolean)
    .join(", ");
  const locationText = publicLocation || "Location unavailable";

  if (!id) return <div>Missing listing id</div>;

  return (
    <>
      {isLoading && <OverlayLoader />}
      <Box>
        <Box
          sx={{
            position: "relative",
            height: { xs: 260, sm: 360, md: 520 },
            overflow: "hidden",
            borderRadius: "16px 16px 0 0",
            cursor: "pointer",
          }}
          onClick={() => {
            setLightboxIndex(0);
            setLightboxOpen(true);
          }}
        >
          <img
            src={images?.[0] || "/app-logo.png"}
            alt="listing"
            width="100%"
            height="100%"
            style={{ objectFit: "cover" }}
          />
          <Box
            sx={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              height: "50%",
              background:
                "linear-gradient(to top, rgba(31,41,55,0.65), transparent)",
              pointerEvents: "none",
            }}
          />
          <Box
            component="button"
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              setLightboxIndex(0);
              setLightboxOpen(true);
            }}
            sx={{
              position: "absolute",
              bottom: 16,
              right: 16,
              background: "#fff",
              border: 0,
              borderRadius: "999px",
              padding: "6px 14px",
              fontSize: "13px",
              fontWeight: 700,
              cursor: "pointer",
              color: "#1F2937",
            }}
          >
            View all photos
          </Box>
        </Box>
        {images.length > 1 ? (
          <Box
            sx={{
              display: "flex",
              gap: 1,
              overflowX: "auto",
              p: 1,
              background: "background.paper",
            }}
          >
            {images.map((image: string, index: number) => (
              <Box
                key={`${image}-${index}`}
                sx={{
                  width: 80,
                  height: 60,
                  flexShrink: 0,
                  borderRadius: "8px",
                  overflow: "hidden",
                  cursor: "pointer",
                  border: "2px solid transparent",
                }}
                onClick={() => {
                  setLightboxIndex(index);
                  setLightboxOpen(true);
                }}
              >
                <img
                  src={image}
                  alt="listing thumbnail"
                  width="100%"
                  height="100%"
                  style={{ objectFit: "cover" }}
                />
              </Box>
            ))}
          </Box>
        ) : null}
        <AppContainer>
          <Box sx={{ my: { xs: 3, md: 4 } }}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={8} lg={8}>
                <AppCard sx={{ p: { xs: 2.5, md: 3 } }}>
                  <Heading>{data?.data?.name}</Heading>
                  <Box
                    sx={{
                      fontSize: "28px",
                      fontWeight: 800,
                      color: "#B8975A",
                      mt: 0.5,
                      mb: 1,
                    }}
                  >
                    USD {price} / month
                  </Box>
                  <Box
                    sx={{
                      marginTop: "14px",
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      color: "text.secondary",
                      fontWeight: 600,
                      "& svg": {
                        color: "secondary.main",
                      },
                    }}
                  >
                    <MapPin />
                    {locationText}
                  </Box>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      margin: "14px 0",
                      flexWrap: "wrap",
                    }}
                  >
                    <Box
                      sx={{
                        background: "#1F4D3A",
                        color: "#fff",
                        borderRadius: "999px",
                        padding: "6px 14px",
                        display: "inline-flex",
                        alignItems: "center",
                        fontWeight: 600,
                      }}
                    >
                      Rent
                    </Box>
                    {data?.data?.discountedPrice > 0 && (
                      <>
                        <Box
                          sx={{
                            background: "#1F2937",
                            color: "#fff",
                            borderRadius: "999px",
                            padding: "6px 14px",
                            display: "inline-flex",
                            alignItems: "center",
                          }}
                        >
                          USD{" "}
                          {thousandSeparatorNumber(
                            data?.data?.discountedPrice
                          )}{" "}
                          discount
                        </Box>
                        <Box
                          sx={{
                            background: "#6B8A7A",
                            color: "#fff",
                            borderRadius: "999px",
                            padding: "6px 14px",
                            display: "inline-flex",
                            alignItems: "center",
                          }}
                        >
                          Now USD{" "}
                          {thousandSeparatorNumber(
                            (data?.data?.monthlyRent ||
                              data?.data?.regularPrice) -
                              data?.data?.discountedPrice
                          )}
                          /
                        </Box>
                      </>
                    )}
                    {data?.data?.status === "early_access" ? (
                      <Box
                        sx={{
                          background: "#dbeafe",
                          color: "#1e40af",
                          fontSize: "11px",
                          fontWeight: 700,
                          borderRadius: "999px",
                          padding: "3px 10px",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 0.5,
                        }}
                      >
                        <Zap size={12} />
                        Early Access
                      </Box>
                    ) : null}
                    {data?.data?.studentAccommodation ? (
                      <Box
                        sx={{
                          ...studentAccommodationBadgeSx,
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 0.5,
                        }}
                      >
                        <GraduationCap size={12} />
                        Student Accommodation
                      </Box>
                    ) : null}
                  </Box>
                  {data?.data?.status === "early_access" ? (
                    <Box
                      sx={{
                        fontSize: "13px",
                        color: "#1e40af",
                        marginTop: 1,
                      }}
                    >
                      {data?.data?.earlyAccessUntil &&
                      new Date(data.data.earlyAccessUntil) > new Date()
                        ? `This listing is available exclusively to Premium members for the next ${Math.ceil(
                            (new Date(data.data.earlyAccessUntil).getTime() -
                              Date.now()) /
                              3_600_000
                          )} hours.`
                        : "This listing is in Early Access."}
                    </Box>
                  ) : null}

                  <Box sx={{ marginTop: 1 }}>
                    <SubHeading>Description</SubHeading>
                    <Box sx={{ color: "text.secondary", marginTop: 0.5 }}>
                      {data?.data?.description}
                    </Box>
                  </Box>

                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 2,
                      marginTop: "16px",
                      flexWrap: "wrap",
                    }}
                  >
                    <Box sx={iconStyle}>
                      <BedDouble />
                      {data?.data?.bedrooms} Rooms
                    </Box>
                    <Box sx={iconStyle}>
                      <Bath />
                      {data?.data?.bathrooms} Baths
                    </Box>
                    <Box sx={iconStyle}>
                      <Car />
                      {data?.data?.amenities?.parking
                        ? "Parking"
                        : "No Parking"}
                    </Box>
                    <Box sx={iconStyle}>
                      <Sofa />
                      {data?.data?.furnished ? "Furnished" : "Not Furnished"}
                    </Box>
                  </Box>
                </AppCard>
              </Grid>
              <Grid item xs={12} md={4} lg={4}>
                <AppCard sx={{ p: { xs: 2.5, md: 3 } }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: "8px" }}>
                    <Heading sx={{ margin: 0, fontSize: "18px" }}>Contact Landlord</Heading>
                    <Box sx={{ background: "#D1EAE0", color: "#1F4D3A", borderRadius: "999px", padding: "3px 10px", fontSize: "12px", fontWeight: 800 }}>5 TR</Box>
                  </Box>
                  <Divider />
                  {!isLoggedIn ? (
                    <Box
                      sx={{
                        marginTop: 2,
                        padding: "20px",
                        borderRadius: "12px",
                        border: "1px dashed",
                        borderColor: "divider",
                        background: "background.default",
                        color: "text.secondary",
                        textAlign: "center",
                        lineHeight: 1.6,
                      }}
                    >
                      <Lock size={30} color="#1F4D3A" />
                      <Box sx={{ mt: 1 }}>
                        Landlord contact details are shared privately after
                        approval.
                      </Box>
                      <AppButton
                        fullWidth
                        sx={{ mt: 2 }}
                        onClick={() =>
                          navigate("/login", {
                            state: {
                              from: location.pathname,
                              openContact: true,
                            },
                          })
                        }
                      >
                        Log in to Reach Out
                      </AppButton>
                    </Box>
                  ) : !isTenant ? (
                    <Box
                      sx={{
                        marginTop: 2,
                        padding: "20px",
                        borderRadius: "12px",
                        border: "1px dashed",
                        borderColor: "divider",
                        background: "background.default",
                        color: "text.secondary",
                        textAlign: "center",
                        lineHeight: 1.6,
                      }}
                    >
                      Landlord contact requests are available to tenant
                      accounts only.
                    </Box>
                  ) : !existingEngagement ? (
                    <Box sx={{ mt: 2 }}>
                      <SubHeading sx={{ color: "text.secondary", mb: 2 }}>
                        Send a private message to request contact and address
                        details.
                      </SubHeading>
                      <AppButton
                        fullWidth
                        onClick={() => setContactModalOpen(true)}
                      >
                        Reach Out
                      </AppButton>
                    </Box>
                  ) : existingEngagement.status === "PENDING" ? (
                    <Box sx={{ mt: 2 }}>
                      <Box
                        sx={{
                          display: "inline-block",
                          background: "#FEF3C7",
                          color: "#92400E",
                          borderRadius: "999px",
                          padding: "6px 12px",
                          fontSize: "12px",
                          fontWeight: 800,
                          mb: 1.5,
                        }}
                      >
                        Request Pending
                      </Box>
                      <SubHeading sx={{ color: "text.secondary" }}>
                        Sent{" "}
                        {new Date(
                          existingEngagement.createdAt
                        ).toLocaleDateString()}
                      </SubHeading>
                      <Box sx={{ color: "text.secondary", mt: 1 }}>
                        Awaiting landlord response
                      </Box>
                    </Box>
                  ) : existingEngagement.status === "APPROVED" ? (
                    <Box sx={{ mt: 2 }}>
                      <Box
                        sx={{
                          display: "inline-block",
                          background: "#D1EAE0",
                          color: "#1F4D3A",
                          borderRadius: "999px",
                          padding: "6px 12px",
                          fontSize: "12px",
                          fontWeight: 800,
                          mb: 1.5,
                        }}
                      >
                        Approved
                      </Box>
                      <Box sx={{ display: "grid", gap: 1, mt: 1 }}>
                        <Box
                          sx={{
                            background: "#F0F7F4",
                            borderRadius: "10px",
                            p: "12px",
                            color: "#1F4D3A",
                            fontSize: "13px",
                            display: "flex",
                            gap: 1,
                          }}
                        >
                          <MapPin size={16} />
                          {existingEngagement.listing?.address ||
                            listing?.address ||
                            "Address unavailable"}
                        </Box>
                        <Box
                          sx={{
                            background: "background.default",
                            borderRadius: "10px",
                            p: "12px",
                            color: "text.secondary",
                            fontSize: "13px",
                            display: "flex",
                            gap: 1,
                          }}
                        >
                          <Phone size={16} />
                          {existingEngagement.listing?.phoneNumber ||
                            listing?.phoneNumber ||
                            "Phone unavailable"}
                        </Box>
                      </Box>
                    </Box>
                  ) : (
                    <Box sx={{ mt: 2 }}>
                      <Box
                        sx={{
                          display: "inline-block",
                          background: "#FEE2E2",
                          color: "#991B1B",
                          borderRadius: "999px",
                          padding: "6px 12px",
                          fontSize: "12px",
                          fontWeight: 800,
                          mb: 1.5,
                        }}
                      >
                        Not Approved
                      </Box>
                      <AppButton
                        fullWidth
                        variant="outlined"
                        onClick={() => setContactModalOpen(true)}
                      >
                        You may try again
                      </AppButton>
                    </Box>
                  )}
                </AppCard>
              </Grid>
            </Grid>
          </Box>
        </AppContainer>
      </Box>
      {listing && isTenant ? (
        <ContactModal
          open={contactModalOpen}
          onClose={() => setContactModalOpen(false)}
          listing={{
            id: listing.id || listing._id,
            name: listing.name,
            monthlyRent: listing.monthlyRent,
            imageUrls: images,
          }}
        />
      ) : null}
      <ImageLightbox
        images={images || []}
        initialIndex={lightboxIndex}
        open={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
      />
    </>
  );
};

export default ViewListing;
