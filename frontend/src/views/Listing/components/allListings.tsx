// React Imports
import { useState } from "react";
import { useNavigate } from "react-router-dom";
// MUI Imports
import {
  Box,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from "@mui/material";
// Redux Imports
import {
  useDeleteListingMutation,
  useGetListingQuery,
} from "../../../redux/api/listingApiSlice";
import { selectedUserId } from "../../../redux/auth/authSlice";
// Hook Imports
import useTypedSelector from "../../../hooks/useTypedSelector";
import { Home, Pencil, Trash2 } from "lucide-react";
// Utils Imports
import { convertToFormattedDate } from "../../../utils";
// Component Imports
import { Heading, SubHeading } from "../../../components/Heading";
import OverlayLoader from "../../../components/Spinner/OverlayLoader";
import ToastAlert from "../../../components/ToastAlert/ToastAlert";
import DotLoader from "../../../components/Spinner/dotLoader";
import AppContainer from "../../../components/ui/AppContainer";
import AppCard from "../../../components/ui/AppCard";
import AppButton from "../../../components/ui/AppButton";
import { studentAccommodationBadgeSx } from "../../../styles/listingBadges";

const getListingStatusBadge = (status: string) => {
  if (status === "pending_payment") {
    return (
      <Box
        sx={{
          background: "#fef3c7",
          color: "#92400e",
          borderRadius: "999px",
          padding: "6px 12px",
          fontSize: "12px",
          display: "inline-block",
          whiteSpace: "nowrap",
        }}
      >
        Pending Payment
      </Box>
    );
  }

  if (status === "early_access") {
    return (
      <Box
        sx={{
          background: "#FDF8F0",
          color: "#9E7E45",
          borderRadius: "999px",
          padding: "6px 12px",
          fontSize: "12px",
          display: "inline-block",
          whiteSpace: "nowrap",
        }}
      >
        Early Access
      </Box>
    );
  }

  if (status === "active") {
    return (
      <Box
        sx={{
          background: "#D1EAE0",
          color: "#1F4D3A",
          borderRadius: "999px",
          padding: "6px 12px",
          fontSize: "12px",
          display: "inline-block",
          whiteSpace: "nowrap",
        }}
      >
        Active
      </Box>
    );
  }

  return (
    <Box
      sx={{
        background: "#f1f5f9",
        color: "#64748b",
        borderRadius: "999px",
        padding: "6px 12px",
        fontSize: "12px",
        display: "inline-block",
        whiteSpace: "nowrap",
      }}
    >
      Inactive
    </Box>
  );
};

const AllListings = () => {
  const navigate = useNavigate();
  const userId = useTypedSelector(selectedUserId);

  const [selectedListing, setSelectedListing] = useState<any>({});
  const [toast, setToast] = useState({
    message: "",
    appearence: false,
    type: "",
  });
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    listingId: string;
  }>({ open: false, listingId: "" });

  const handleCloseToast = () => {
    setToast({ ...toast, appearence: false });
  };

  const { data, isLoading, isSuccess } = useGetListingQuery(userId);

  const [deleteListing, { isLoading: isDeleting }] = useDeleteListingMutation();

  const DeleteListingHandler = async (id: string) => {
    try {
      const listing: any = await deleteListing(id);
      if (listing?.data === null) {
        setToast({
          ...toast,
          message: "Listing Deleted Successfully",
          appearence: true,
          type: "success",
        });
      }
      if (listing?.error) {
        setToast({
          ...toast,
          message: listing?.error?.message,
          appearence: true,
          type: "error",
        });
      }
    } catch (error) {
      console.error("Delete Listing Error", error);
      setToast({
        ...toast,
        message: "Something went wrong",
        appearence: true,
        type: "error",
      });
    }
  };

  return (
    <Box sx={{ mt: { xs: 5, md: 6 } }}>
      {isLoading && <OverlayLoader />}
      <AppContainer>
        <Box
          sx={{
            background: "linear-gradient(135deg, #1F2937 0%, #1F4D3A 100%)",
            borderRadius: "20px",
            p: { xs: 3, md: 4 },
            mb: 4,
            color: "#fff",
          }}
        >
          <Box sx={{ fontSize: { xs: "1.5rem", md: "2rem" }, fontWeight: 800 }}>
            Your Listings
          </Box>
          <Box sx={{ opacity: 0.75, mt: 0.5 }}>
            Manage and track your property listings.
          </Box>
        </Box>
          {isSuccess && data?.data?.length === 0 ? (
            <AppCard
              sx={{
                display: "flex",
                alignItems: "center",
                width: "100%",
                p: { xs: 3, md: 4 },
                margin: "20px 0",
                justifyContent: "center",
                flexDirection: "column",
                textAlign: "center",
              }}
            >
              <Home size={40} color="#B8975A" />
              <Heading sx={{ fontSize: "22px", mt: 1.5 }}>
                No listings yet
              </Heading>
              <SubHeading sx={{ color: "text.secondary", mt: 0.5, mb: 2 }}>
                You haven't created any listings. Get started by creating your
                first property listing.
              </SubHeading>
              <AppButton
                onClick={() => {
                  navigate("/create-listing");
                }}
              >
                Create your first listing
              </AppButton>
            </AppCard>
          ) : (
            <>
              {data?.data?.map((item: any) => {
                return (
                  <AppCard
                    sx={{
                      width: "100%",
                      p: { xs: 2, md: 2.5 },
                      my: { xs: 2, md: 2.5 },
                      borderRadius: "16px",
                      transition: "transform 0.2s ease, box-shadow 0.2s ease",
                      "&:hover": {
                        transform: "translateY(-2px)",
                        boxShadow: "0 12px 32px rgba(31,41,55,0.12)",
                      },
                    }}
                    key={item?._id}
                  >
                    <Box
                      sx={{
                        display: "flex",
                        gap: 2,
                        flexDirection: { xs: "column", sm: "row" },
                      }}
                    >
                      <Box sx={{ width: { xs: "100%", sm: "160px" } }}>
                        <img
                          src={item?.imageUrls[0]}
                          width="100%"
                          height={140}
                          alt="listing"
                          style={{ borderRadius: "12px", objectFit: "cover" }}
                        />
                      </Box>
                      <Box sx={{ flex: 1 }}>
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 2,
                            minHeight: { xs: "auto", sm: "110px" },
                            flexDirection: { xs: "column", sm: "row" },
                          }}
                        >
                          <Box sx={{ width: "100%" }}>
                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 1,
                                flexWrap: "wrap",
                              }}
                            >
                              <Box
                                sx={{
                                  fontSize: "18px",
                                  fontWeight: 600,
                                  color: "text.primary",
                                  "&:hover": {
                                    cursor: "pointer",
                                    color: "#B8975A",
                                  },
                                }}
                                onClick={() => {
                                  navigate(`/listing/${item?._id}`);
                                }}
                              >
                                {item?.name}
                              </Box>
                              {getListingStatusBadge(item?.status)}
                              {item?.studentAccommodation ? (
                                <Box sx={studentAccommodationBadgeSx}>
                                  Student Accommodation
                                </Box>
                              ) : null}
                            </Box>
                            <Box
                              sx={{
                                color: "text.secondary",
                                marginTop: "8px",
                              }}
                            >
                              {item?.description?.length > 125
                                ? item?.description?.substring(0, 125) + "..."
                                : item?.description}
                            </Box>
                          </Box>
                          <Box
                            sx={{
                              display: "flex",
                              flexDirection: "column",
                              gap: 1,
                              width: { xs: "100%", sm: "auto" },
                            }}
                          >
                            {item?.status === "pending_payment" ? (
                              <AppButton
                                variant="contained"
                                onClick={() => {
                                  navigate(`/listings/${item?._id}/pay`);
                                }}
                              >
                                Activate with TR Tokens
                              </AppButton>
                            ) : item?.status === "inactive" ? (
                              <AppButton
                                variant="contained"
                                sx={{
                                  background: "#6b7280",
                                  "&:hover": { background: "#4b5563" },
                                }}
                                onClick={() => {
                                  navigate(`/listings/${item?._id}/pay`);
                                }}
                              >
                                Revive (Restore with TR Tokens)
                              </AppButton>
                            ) : (
                              <>
                                <AppButton
                                  variant="outlined"
                                  color="error"
                                  startIcon={
                                    selectedListing === item?._id &&
                                    isDeleting ? null : (
                                      <Trash2 size={16} />
                                    )
                                  }
                                  disabled={isDeleting}
                                  onClick={() => {
                                    setSelectedListing(item?._id);
                                    setConfirmDialog({
                                      open: true,
                                      listingId: item?._id,
                                    });
                                  }}
                                >
                                  {selectedListing === item?._id && isDeleting ? (
                                    <Box
                                      sx={{
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        marginTop: "7px",
                                        height: "20px",
                                      }}
                                    >
                                      <DotLoader color="#f44336" size={12} />
                                    </Box>
                                  ) : (
                                    "Delete"
                                  )}
                                </AppButton>

                                <AppButton
                                  variant="outlined"
                                  startIcon={<Pencil size={16} />}
                                  onClick={() => {
                                    navigate(`/listings/${item?._id}`);
                                  }}
                                >
                                  Edit
                                </AppButton>
                              </>
                            )}
                          </Box>
                        </Box>
                        <Box
                            sx={{
                              display: "flex",
                              justifyContent: { xs: "flex-start", sm: "flex-end" },
                              gap: 1,
                            marginTop: "5px",
                            alignItems: "center",
                            flexWrap: "wrap",
                          }}
                        >
                          <Box>Date:</Box>
                          <Box sx={{ fontWeight: 600 }}>
                            {convertToFormattedDate(item?.publishedAt ?? item?.createdAt)}
                          </Box>
                          <Box>
                            <Box
                              sx={{
                                background: "#B8975A",
                                fontSize: "12px",
                                color: "#fff",
                                borderRadius: "999px",
                                padding: "6px 12px",
                                display: "inline-block",
                              }}
                            >
                              Rent
                            </Box>
                          </Box>{" "}
                        </Box>
                      </Box>
                    </Box>
                  </AppCard>
                );
              })}
            </>
          )}
      </AppContainer>
      <ToastAlert
        appearence={toast.appearence}
        type={toast.type}
        message={toast.message}
        handleClose={handleCloseToast}
      />
      <Dialog
        open={confirmDialog.open}
        onClose={() => setConfirmDialog({ open: false, listingId: "" })}
      >
        <DialogTitle>Delete Listing</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Delete this listing? This cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <AppButton
            variant="outlined"
            onClick={() => setConfirmDialog({ open: false, listingId: "" })}
          >
            Cancel
          </AppButton>
          <AppButton
            color="error"
            onClick={() => {
              DeleteListingHandler(confirmDialog.listingId);
              setConfirmDialog({ open: false, listingId: "" });
            }}
          >
            Delete
          </AppButton>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AllListings;
