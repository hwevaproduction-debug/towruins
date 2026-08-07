import { styled } from "@mui/material/styles";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell, { tableCellClasses } from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import AppCard from "../ui/AppCard";

export const StyledTableCell = styled(TableCell)(({ theme }) => ({
  [`&.${tableCellClasses.head}`]: {
    backgroundColor: theme.palette.background.paper,
    color: theme.palette.text.secondary,
  },
  [`&.${tableCellClasses.body}`]: {
    fontSize: 14,
  },
}));

export const StyledTableRow = styled(TableRow)(({ theme }) => ({
  "&:last-child td, &:last-child th": {
    border: 0,
  },
}));

interface MUITableProps {
  tableHead: string[];
  children: React.ReactNode;
}

const MUITable: React.FC<MUITableProps> = ({ tableHead, children }) => {
  return (
    <AppCard sx={{ width: "100%", overflow: "hidden" }}>
      <TableContainer sx={{ width: "100%", overflowX: "auto" }}>
        <Table sx={{ minWidth: 600, width: "100%" }} aria-label="customized table">
          <TableHead>
            <TableRow>
              {tableHead.map((header, index) => (
                <StyledTableCell align="left" key={index}>
                  {header}
                </StyledTableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>{children}</TableBody>
        </Table>
      </TableContainer>
    </AppCard>
  );
};

export default MUITable;
