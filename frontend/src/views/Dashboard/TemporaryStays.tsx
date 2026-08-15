import React, { useState } from "react";
import { Box, Button, TextField, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, CircularProgress, Dialog } from "@mui/material";
import AppCard from "../../components/ui/AppCard";
import { useGetTemporaryStaysQuery, usePublishTemporaryStayMutation, useUnpublishTemporaryStayMutation, useDeleteTemporaryStayMutation } from "../../redux/api/adminStayApiSlice";
import AdminTemporaryStayForm from "./components/AdminTemporaryStayForm";

const TemporaryStays: React.FC = () => {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const { data, isLoading, refetch } = useGetTemporaryStaysQuery({ search, page, limit: 20 });
  const [publish] = usePublishTemporaryStayMutation();
  const [unpublish] = useUnpublishTemporaryStayMutation();
  const [remove] = useDeleteTemporaryStayMutation();
  const [createOpen, setCreateOpen] = useState(false);

  const rows = data?.data || [];

  return (
    <AppCard title="Temporary Stays">
      <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
        <TextField value={search} onChange={(e) => setSearch(e.target.value)} size="small" placeholder="Search stays" />
        <Button onClick={() => refetch()} variant="contained">Search</Button>
        <Button variant="contained" color="primary" onClick={() => setCreateOpen(true)}>Create Temporary Stay</Button>
      </Box>

      {isLoading ? (
        <CircularProgress />
      ) : (
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Title</TableCell>
                <TableCell>Provider</TableCell>
                <TableCell>Location</TableCell>
                <TableCell>Price</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row: any) => (
                <TableRow key={row._id}>
                  <TableCell>{row.name}</TableCell>
                  <TableCell>{row.provider?.username || "-"}</TableCell>
                  <TableCell>{row.accommodation?.name || "-"}</TableCell>
                  <TableCell>{row.basePricePerNight ?? "-"}</TableCell>
                  <TableCell>{row.status}</TableCell>
                  <TableCell>
                    <Button size="small" onClick={() => publish(row._id)}>Publish</Button>
                    <Button size="small" onClick={() => unpublish(row._id)}>Unpublish</Button>
                    <Button size="small" color="error" onClick={() => remove(row._id)}>Delete</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="md" fullWidth>
        <AdminTemporaryStayForm onClose={() => setCreateOpen(false)} onCreated={() => refetch()} />
      </Dialog>
    </AppCard>
  );
};

export default TemporaryStays;
