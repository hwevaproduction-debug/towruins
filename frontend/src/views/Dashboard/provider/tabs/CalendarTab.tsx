import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import {
  toEntityArray,
  useBlockRoomDatesMutation,
  useDeleteRoomBlockMutation,
  useGetRoomCalendarQuery,
  useListRoomBlocksQuery,
} from "../../../../redux/api/providerApiSlice";
import AppButton from "../../../../components/ui/AppButton";
import AppCard from "../../../../components/ui/AppCard";
import ConfirmDialog from "../components/ConfirmDialog";

type CalendarTabProps = {
  rooms: any[];
};

const getRoomId = (room: any) => room?._id || room?.id;
const toDateString = (year: number, month: number, day: number) =>
  `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

const dateInRange = (date: string, start: string, end: string) =>
  date >= start.slice(0, 10) && date < end.slice(0, 10);

const CalendarTab = ({ rooms }: CalendarTabProps) => {
  const now = new Date();
  const [selectedRoomId, setSelectedRoomId] = useState("");
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [dragStart, setDragStart] = useState("");
  const [dragEnd, setDragEnd] = useState("");
  const [reason, setReason] = useState("");
  const [blockDialogOpen, setBlockDialogOpen] = useState(false);
  const [blockToDelete, setBlockToDelete] = useState<any>(null);
  const { data } = useGetRoomCalendarQuery({ roomId: selectedRoomId, year, month }, { skip: !selectedRoomId });
  const { data: blocksResponse } = useListRoomBlocksQuery(selectedRoomId, { skip: !selectedRoomId });
  const [blockRoomDates] = useBlockRoomDatesMutation();
  const [deleteRoomBlock, { isLoading: deletingBlock }] = useDeleteRoomBlockMutation();
  const calendar = data?.data || data || {};
  const blocks: any[] = toEntityArray(blocksResponse, ["availabilityBlocks", "blocks", "data"]);
  const unavailableDates = new Set(calendar?.unavailableDates || []);
  const daysInMonth = new Date(year, month, 0).getDate();
  const firstOffset = new Date(year, month - 1, 1).getDay();

  useEffect(() => {
    setSelectedRoomId((current) => current || getRoomId(rooms[0]) || "");
  }, [rooms]);

  const blockedDates = useMemo(() => {
    const dates = new Map<string, any>();
    blocks.forEach((block) => {
      for (let day = 1; day <= daysInMonth; day += 1) {
        const date = toDateString(year, month, day);
        if (dateInRange(date, String(block.startDate), String(block.endDate))) {
          dates.set(date, block);
        }
      }
    });
    return dates;
  }, [blocks, daysInMonth, month, year]);

  const moveMonth = (delta: number) => {
    const date = new Date(year, month - 1 + delta, 1);
    setYear(date.getFullYear());
    setMonth(date.getMonth() + 1);
  };

  const resetBlockSelection = () => {
    setBlockDialogOpen(false);
    setDragStart("");
    setDragEnd("");
    setReason("");
  };

  return (
    <Stack spacing={2}>
      <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems={{ md: "center" }}>
        <TextField select label="Room" value={selectedRoomId} onChange={(event) => setSelectedRoomId(event.target.value)} sx={{ minWidth: 260 }}>
          {rooms.map((room) => <MenuItem key={getRoomId(room)} value={getRoomId(room)}>{room?.name}</MenuItem>)}
        </TextField>
        <AppButton variant="outlined" size="small" onClick={() => moveMonth(-1)}>Previous</AppButton>
        <Typography variant="h6">{year}-{String(month).padStart(2, "0")}</Typography>
        <AppButton variant="outlined" size="small" onClick={() => moveMonth(1)}>Next</AppButton>
      </Stack>

      <Box sx={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: 1 }}>
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => <Typography key={day} fontWeight={700}>{day}</Typography>)}
        {Array.from({ length: firstOffset }).map((_, index) => <Box key={`empty-${index}`} />)}
        {Array.from({ length: daysInMonth }).map((_, index) => {
          const day = index + 1;
          const date = toDateString(year, month, day);
          const block = blockedDates.get(date);
          const unavailable = unavailableDates.has(date);
          const selected = dragStart && (date === dragStart || (dragEnd && date >= [dragStart, dragEnd].sort()[0] && date <= [dragStart, dragEnd].sort()[1]));
          return (
            <AppCard
              key={date}
              elevation="flat"
              onClick={() => {
                if (block) {
                  setBlockToDelete(block);
                  return;
                }
                if (unavailable) {
                  return;
                }
                if (!dragStart) {
                  setDragStart(date);
                  setDragEnd(date);
                  return;
                }
                setDragEnd(date);
                setBlockDialogOpen(true);
              }}
              sx={{ p: 1, minHeight: 86, cursor: block || !unavailable ? "pointer" : "default", bgcolor: block ? "rgba(253, 231, 231, 0.6)" : unavailable ? "rgba(232, 234, 246, 0.4)" : selected ? "rgba(187, 222, 251, 0.4)" : "background.paper" }}
            >
              <Typography fontWeight={700}>{day}</Typography>
              {!unavailable ? <Typography variant="caption">${calendar?.pricingByDate?.[date] || ""}</Typography> : null}
              {block ? <Typography variant="caption" display="block">Blocked</Typography> : unavailable ? <Typography variant="caption" display="block">Booked</Typography> : null}
            </AppCard>
          );
        })}
      </Box>

      <Stack direction="row" spacing={2}>
        <Typography><Box component="span" sx={{ display: "inline-block", width: 12, height: 12, bgcolor: "background.paper", border: "1px solid", borderColor: "divider", mr: 0.75 }} />Available</Typography>
        <Typography><Box component="span" sx={{ display: "inline-block", width: 12, height: 12, bgcolor: "rgba(232, 234, 246, 0.4)", mr: 0.75 }} />Booked</Typography>
        <Typography><Box component="span" sx={{ display: "inline-block", width: 12, height: 12, bgcolor: "rgba(253, 231, 231, 0.6)", mr: 0.75 }} />Blocked</Typography>
      </Stack>

      <Dialog open={blockDialogOpen} onClose={resetBlockSelection} fullWidth maxWidth="xs">
        <DialogTitle>Block Selected Dates</DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 2 }}>{[dragStart, dragEnd].sort()[0]} to {[dragStart, dragEnd].sort()[1]}</Typography>
          <TextField fullWidth label="Reason" value={reason} onChange={(event) => setReason(event.target.value)} />
        </DialogContent>
        <DialogActions>
          <AppButton onClick={resetBlockSelection}>Cancel</AppButton>
          <AppButton
            variant="contained"
            onClick={async () => {
              const [startDate, endDate] = [dragStart, dragEnd].sort();
              const end = new Date(`${endDate}T00:00:00Z`);
              end.setUTCDate(end.getUTCDate() + 1);
              await blockRoomDates({ roomId: selectedRoomId, payload: { startDate, endDate: end.toISOString().slice(0, 10), reason } }).unwrap();
              resetBlockSelection();
            }}
          >
            Block
          </AppButton>
        </DialogActions>
      </Dialog>

      <ConfirmDialog
        open={Boolean(blockToDelete)}
        title="Delete Block"
        message="Remove this blocked date range?"
        loading={deletingBlock}
        onClose={() => setBlockToDelete(null)}
        onConfirm={async () => {
          await deleteRoomBlock({ roomId: selectedRoomId, blockId: blockToDelete?._id || blockToDelete?.id }).unwrap();
          setBlockToDelete(null);
        }}
      />
    </Stack>
  );
};

export default CalendarTab;
