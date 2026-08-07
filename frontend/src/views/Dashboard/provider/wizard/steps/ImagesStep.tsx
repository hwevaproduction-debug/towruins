import { Button, Paper, Stack, Typography } from "@mui/material";
import ImageUploader from "../ImageUploader";

type ImagesStepProps = {
  accommodationId: string;
  rooms: any[];
  onNext: () => void;
  onBack: () => void;
};

const getRoomId = (room: any) => room?._id || room?.id;

const ImagesStep = ({ accommodationId, rooms, onNext, onBack }: ImagesStepProps) => (
  <Stack spacing={3}>
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Typography variant="h6" sx={{ mb: 2 }}>Accommodation Images</Typography>
      <ImageUploader folder="accommodations" entityId={accommodationId} />
    </Paper>
    {rooms.map((room) => (
      <Paper key={getRoomId(room)} variant="outlined" sx={{ p: 2 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>{room?.name}</Typography>
        <ImageUploader folder="rooms" entityId={getRoomId(room)} />
      </Paper>
    ))}
    <Stack direction="row" spacing={1}>
      <Button onClick={onBack}>Back</Button>
      <Button variant="contained" onClick={onNext}>Next</Button>
    </Stack>
  </Stack>
);

export default ImagesStep;
