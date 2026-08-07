import { useState } from "react";
import {
  Avatar,
  Grid,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import {
  toEntityArray,
  useGetProviderReviewsQuery,
  useRespondToReviewMutation,
} from "../../../../redux/api/providerApiSlice";
import AppButton from "../../../../components/ui/AppButton";
import AppCard from "../../../../components/ui/AppCard";

type ReviewsTabProps = {
  accommodationId: string;
};

const ReviewsTab = ({ accommodationId }: ReviewsTabProps) => {
  const [responseText, setResponseText] = useState<Record<string, string>>({});

  const { data: reviewsResponse } = useGetProviderReviewsQuery({ accommodationId });
  const [respondToReview, { isLoading: responding }] = useRespondToReviewMutation();

  const reviews: any[] = toEntityArray(reviewsResponse, ["reviews", "data"]);
  const summary = reviewsResponse?.data?.summary || reviewsResponse?.summary || {};
  const averageRating = summary.averageRating ?? reviewsResponse?.averageRating ?? null;
  const totalReviews = reviewsResponse?.total ?? reviews.length;

  const respondedCount = reviews.filter((r: any) => r?.providerResponse).length;

  const handleRespond = async (reviewId: string) => {
    const text = responseText[reviewId]?.trim();
    if (!text) return;
    await respondToReview({ id: reviewId, payload: { providerResponse: text } }).unwrap();
    setResponseText((prev) => ({ ...prev, [reviewId]: "" }));
  };

  const renderStars = (rating: number) => {
    const fullStars = Math.floor(Number(rating || 0));
    return "★".repeat(fullStars) + "☆".repeat(5 - fullStars);
  };

  return (
    <Stack spacing={3}>
      <Grid container spacing={2}>
        <Grid item xs={12} md={4}>
          <Paper variant="outlined" sx={{ p: 2, textAlign: "center" }}>
            <Typography variant="h4" fontWeight={800} color="#1F4D3A">
              {averageRating != null ? Number(averageRating).toFixed(1) : "-"}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Average Rating
            </Typography>
            <Typography sx={{ color: "#B8975A", mt: 0.5 }}>{renderStars(averageRating || 0)}</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper variant="outlined" sx={{ p: 2, textAlign: "center" }}>
            <Typography variant="h4" fontWeight={800}>
              {totalReviews}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Total Reviews
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper variant="outlined" sx={{ p: 2, textAlign: "center" }}>
            <Typography variant="h4" fontWeight={800} color="#1F4D3A">
              {respondedCount}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Responded
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {reviews.length === 0 ? (
        <AppCard elevation="flat" sx={{ p: 3, borderRadius: "16px" }}>
          <Typography>No reviews yet.</Typography>
        </AppCard>
      ) : (
        <Stack spacing={2}>
          {reviews.map((review: any) => (
            <AppCard key={review._id} elevation="flat" sx={{ p: 2, borderRadius: "16px" }}>
              <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1 }}>
                <Avatar sx={{ bgcolor: "#1F4D3A", width: 36, height: 36, fontSize: 14 }}>
                  {String(review?.guest?.username || review?.guest?.name || "G")[0]?.toUpperCase()}
                </Avatar>
                <Typography fontWeight={700}>
                  {review?.guest?.username || review?.guest?.name || "Guest"}
                </Typography>
              </Stack>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                {review?.booking?.room?.name || "Room"} · {String(review?.booking?.checkIn || "").slice(0, 10)} to {String(review?.booking?.checkOut || "").slice(0, 10)}
              </Typography>
              <Typography sx={{ color: "#B8975A", mb: 1 }}>{renderStars(review?.overallRating || 0)}</Typography>
              <Typography variant="body1" sx={{ mb: review?.providerResponse ? 1.5 : 0 }}>
                {review?.comment}
              </Typography>
              {review?.providerResponse ? (
                <Paper
                  variant="outlined"
                  sx={{
                    p: 1.5,
                    background: "#f0fdf4",
                    borderLeft: "4px solid #1F4D3A",
                  }}
                >
                  <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600, mb: 0.5 }}>
                    Your Response
                  </Typography>
                  <Typography variant="body2">{review.providerResponse}</Typography>
                </Paper>
              ) : (
                <Stack spacing={1} direction="row" alignItems="flex-start" sx={{ mt: 1 }}>
                  <TextField
                    multiline
                    minRows={2}
                    fullWidth
                    placeholder="Write a response..."
                    value={responseText[review._id] || ""}
                    onChange={(e) =>
                      setResponseText((prev) => ({ ...prev, [review._id]: e.target.value }))
                    }
                  />
                  <AppButton
                    variant="contained"
                    loading={responding}
                    disabled={!responseText[review._id]?.trim()}
                    onClick={() => handleRespond(review._id)}
                    sx={{ minWidth: 120 }}
                  >
                    Submit Response
                  </AppButton>
                </Stack>
              )}
            </AppCard>
          ))}
        </Stack>
      )}
    </Stack>
  );
};

export default ReviewsTab;
