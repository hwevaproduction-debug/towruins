import { Button, Grid, Paper, Stack, Typography } from "@mui/material";
import { useUpdateAccommodationMutation } from "../../../../../redux/api/providerApiSlice";

type ReviewStepProps = {
  accommodationId: string;
  accommodation: any;
  rooms: any[];
  onPublish: () => void;
  onBack: () => void;
};

const ReviewStep = ({ accommodationId, accommodation, rooms, onPublish, onBack }: ReviewStepProps) => {
  const [updateAccommodation, { isLoading }] = useUpdateAccommodationMutation();

  return (
    <Stack spacing={2}>
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="body2" color="text.secondary">Accommodation</Typography>
            <Typography variant="h6">{accommodation?.name || "Untitled listing"}</Typography>
            <Typography>{accommodation?.type}</Typography>
            <Typography>{[accommodation?.city, accommodation?.province].filter(Boolean).join(", ")}</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="body2" color="text.secondary">Rooms</Typography>
            <Typography variant="h6">{rooms.length}</Typography>
            <Typography>{rooms.map((room) => room?.name).filter(Boolean).join(", ") || "No rooms"}</Typography>
          </Paper>
        </Grid>
      </Grid>
      {(() => {
        const canPublish = rooms && rooms.length > 0;
        return (
          <Stack direction="row" spacing={1}>
            <Button onClick={onBack}>Back</Button>
            <Button
              variant="contained"
              disabled={isLoading || !canPublish}
              onClick={async () => {
                if (!canPublish) return;
                await updateAccommodation({ id: accommodationId, payload: { isPublished: true } }).unwrap();
                onPublish();
              }}
            >
              {isLoading ? "Publishing..." : "Publish Listing"}
            </Button>
            {!canPublish && (
              <Typography color="error" sx={{ alignSelf: 'center', ml: 1 }}>
                Add at least one room before publishing this accommodation.
              </Typography>
            )}
          </Stack>
        );
      })()}
    </Stack>
  );
};

export default ReviewStep;
