import { Fragment, useState } from "react";
import {
  Box,
  Button,
  Grid,
  MenuItem,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import {
  useCreateRoomMutation,
  useDeleteRoomMutation,
  useUpdateRoomMutation,
} from "../../../../redux/api/providerApiSlice";
import ImageUploader from "../wizard/ImageUploader";

type RoomsTabProps = {
  rooms: any[];
  accommodationId: string;
  onRoomCreated: () => void;
  onRoomUpdated: () => void;
  onRoomDeleted: () => void;
};

const emptyForm = {
  id: "",
  name: "",
  description: "",
  roomType: "DOUBLE",
  capacity: "2",
  basePricePerNight: "",
  bookingMode: "INSTANT",
  status: "AVAILABLE",
};

const getRoomId = (room: any) => room?._id || room?.id;

const RoomsTab = ({
  rooms,
  accommodationId,
  onRoomCreated,
  onRoomUpdated,
  onRoomDeleted,
}: RoomsTabProps) => {
  const [form, setForm] = useState(emptyForm);
  const [imagesRoomId, setImagesRoomId] = useState("");
  const [createRoom, { isLoading: creating }] = useCreateRoomMutation();
  const [updateRoom, { isLoading: updating }] = useUpdateRoomMutation();
  const [deleteRoom, { isLoading: deleting }] = useDeleteRoomMutation();

  const handleSubmit = async () => {
    const payload = {
      name: form.name,
      description: form.description || undefined,
      roomType: form.roomType,
      capacity: Number(form.capacity || 0),
      basePricePerNight: Number(form.basePricePerNight || 0),
      bookingMode: form.bookingMode,
      accommodationId,
    };

    if (form.id) {
      await updateRoom({ id: form.id, payload: { ...payload, status: form.status } }).unwrap();
      onRoomUpdated();
    } else {
      await createRoom(payload).unwrap();
      onRoomCreated();
    }

    setForm(emptyForm);
  };

  return (
    <Stack spacing={3}>
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          {form.id ? "Edit Room" : "Create Room"}
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <TextField fullWidth label="Name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField fullWidth select label="Type" value={form.roomType} onChange={(event) => setForm({ ...form, roomType: event.target.value })}>
              {["SINGLE", "DOUBLE", "TWIN", "SUITE", "DORMITORY", "STUDIO", "ENTIRE_UNIT"].map((type) => (
                <MenuItem key={type} value={type}>{type}</MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField fullWidth select label="Booking" value={form.bookingMode} onChange={(event) => setForm({ ...form, bookingMode: event.target.value })}>
              <MenuItem value="INSTANT">INSTANT</MenuItem>
              <MenuItem value="REQUEST">REQUEST</MenuItem>
            </TextField>
          </Grid>
          {form.id ? (
            <Grid item xs={12} md={3}>
              <TextField fullWidth select label="Status" value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}>
                {["AVAILABLE", "UNAVAILABLE", "MAINTENANCE"].map((status) => (
                  <MenuItem key={status} value={status}>{status}</MenuItem>
                ))}
              </TextField>
            </Grid>
          ) : null}
          <Grid item xs={12} md={3}>
            <TextField fullWidth type="number" label="Capacity" value={form.capacity} onChange={(event) => setForm({ ...form, capacity: event.target.value })} />
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField fullWidth type="number" label="Base price" value={form.basePricePerNight} onChange={(event) => setForm({ ...form, basePricePerNight: event.target.value })} />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField fullWidth label="Description" value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
          </Grid>
        </Grid>
        <Stack direction="row" spacing={1.5} sx={{ mt: 2 }}>
          <Button variant="contained" onClick={handleSubmit} disabled={!form.name || creating || updating}>
            {creating || updating ? "Saving..." : form.id ? "Update Room" : "Add Room"}
          </Button>
          {form.id ? <Button onClick={() => setForm(emptyForm)}>Cancel</Button> : null}
        </Stack>
      </Paper>

      <Paper variant="outlined">
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Image</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Capacity</TableCell>
              <TableCell>Price</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rooms.map((room) => {
              const roomId = getRoomId(room);
              const images = (room?.images || []).map((image: any) => ({
                id: image?.id || image?._id || image?.url,
                _id: image?._id || image?.id,
                url: image?.url,
                isCover: Boolean(image?.isCover),
              })).filter((image: any) => image.url);
              const coverUrl = images[0]?.url;

              return (
                <Fragment key={roomId}>
                  <TableRow>
                    <TableCell>
                      {coverUrl ? (
                        <Box component="img" src={coverUrl} alt="" sx={{ width: 40, height: 30, objectFit: "cover", borderRadius: 0.5 }} />
                      ) : (
                        <Box sx={{ width: 40, height: 30, bgcolor: "grey.200", borderRadius: 0.5 }} />
                      )}
                    </TableCell>
                    <TableCell>{room?.name}</TableCell>
                    <TableCell>{room?.roomType || "-"}</TableCell>
                    <TableCell>{room?.capacity || "-"}</TableCell>
                    <TableCell>{room?.basePricePerNight || room?.price || "-"}</TableCell>
                    <TableCell>{room?.status || "-"}</TableCell>
                    <TableCell align="right">
                      <Button size="small" onClick={() => setImagesRoomId((current) => current === roomId ? "" : roomId)}>
                        Images
                      </Button>
                      <Button size="small" onClick={() => setForm({
                        id: roomId,
                        name: room?.name || "",
                        description: room?.description || "",
                        roomType: room?.roomType || "DOUBLE",
                        capacity: String(room?.capacity || 2),
                        basePricePerNight: String(room?.basePricePerNight || ""),
                        bookingMode: room?.bookingMode || "INSTANT",
                        status: room?.status || "AVAILABLE",
                      })}>
                        Edit
                      </Button>
                      <Button
                        size="small"
                        color="error"
                        disabled={deleting}
                        onClick={async () => {
                          await deleteRoom(roomId).unwrap();
                          onRoomDeleted();
                        }}
                      >
                        Delete
                      </Button>
                    </TableCell>
                  </TableRow>
                  {imagesRoomId === roomId ? (
                    <TableRow>
                      <TableCell colSpan={7}>
                        <ImageUploader folder="rooms" entityId={roomId} existingImages={images} />
                      </TableCell>
                    </TableRow>
                  ) : null}
                </Fragment>
              );
            })}
            {!rooms.length ? (
              <TableRow>
                <TableCell colSpan={7}>
                  <Box sx={{ py: 3, textAlign: "center" }}>No rooms yet.</Box>
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </Paper>
    </Stack>
  );
};

export default RoomsTab;
