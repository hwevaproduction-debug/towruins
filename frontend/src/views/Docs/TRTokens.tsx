import { Box, Table, TableBody, TableCell, TableHead, TableRow } from "@mui/material";
import AppCard from "../../components/ui/AppCard";
import AppContainer from "../../components/ui/AppContainer";

const TRTokens = () => (
  <Box>
    <Box
      sx={{
        background: "linear-gradient(135deg, #1F2937 0%, #1F4D3A 100%)",
        pt: { xs: 12, md: 14 },
        pb: { xs: 6, md: 8 },
        textAlign: "center",
        px: 2,
      }}
    >
      <Box
        sx={{
          fontSize: "11px",
          fontWeight: 700,
          letterSpacing: "0.15em",
          color: "#B8975A",
          textTransform: "uppercase",
          mb: 2,
        }}
      >
        Platform Currency
      </Box>
      <Box
        component="h1"
        sx={{ fontSize: { xs: "2rem", md: "3rem" }, fontWeight: 800, color: "#fff", m: 0 }}
      >
        TR Tokens — The Town Ruins Platform Currency
      </Box>
      <Box
        sx={{
          mt: 2,
          color: "rgba(255,255,255,0.75)",
          maxWidth: "600px",
          mx: "auto",
          fontSize: { xs: "1rem", md: "1.125rem" },
          lineHeight: 1.6,
        }}
      >
        Earn tokens by engaging with tenants. Spend them on premium platform actions.
      </Box>
    </Box>

    <AppContainer sx={{ py: { xs: 6, md: 8 }, display: "grid", gap: 3 }}>
      <AppCard sx={{ p: 3 }}>
        <Box sx={{ fontWeight: 800, fontSize: "20px", mb: 1.5 }}>What Are TR Tokens?</Box>
        <Box sx={{ color: "text.secondary", lineHeight: 1.75 }}>
          TR Tokens are the Town Ruins platform currency. They are used for premium interactions between landlords
          and tenants. They are <strong>not real money</strong>, <strong>cannot be withdrawn</strong>, and are{" "}
          <strong>non-transferable</strong> between accounts. Every new account receives a welcome bonus of tokens
          to get started.
        </Box>
      </AppCard>

      <AppCard sx={{ p: 3 }}>
        <Box sx={{ fontWeight: 800, fontSize: "20px", mb: 1.5 }}>How You Earn Tokens</Box>
        <Box component="ul" sx={{ color: "text.secondary", lineHeight: 1.75, pl: 3, m: 0 }}>
          <Box component="li" sx={{ mb: 1 }}>
            <strong>Welcome bonus:</strong> received automatically when you create a new account
          </Box>
          <Box component="li" sx={{ mb: 1 }}>
            <strong>Purchase tokens:</strong> buy token bundles from your dashboard wallet at any time
          </Box>
        </Box>
      </AppCard>

      <AppCard sx={{ p: 3 }}>
        <Box sx={{ fontWeight: 800, fontSize: "20px", mb: 1.5 }}>How You Spend Tokens</Box>
        <Box component="ul" sx={{ color: "text.secondary", lineHeight: 1.75, pl: 3, m: 0 }}>
          <Box component="li" sx={{ mb: 1 }}>
            <strong>Contact a landlord:</strong> tenants are charged tokens when the landlord approves their contact request — not at the moment of sending
          </Box>
          <Box component="li" sx={{ mb: 1 }}>
            <strong>Restore an expired listing:</strong> landlords spend tokens to reactivate a listing that has
            expired (cost depends on number of days selected)
          </Box>
        </Box>
      </AppCard>

      <AppCard sx={{ p: 3 }}>
        <Box sx={{ fontWeight: 800, fontSize: "20px", mb: 2 }}>Token Actions</Box>
        <Table>
          <TableHead>
            <TableRow>
              {["Action", "Tokens", "Direction", "Who"].map((heading) => (
                <TableCell key={heading} sx={{ fontWeight: 800 }}>
                  {heading}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            <TableRow>
              <TableCell>Welcome bonus (new account)</TableCell>
              <TableCell>100 TR</TableCell>
              <TableCell>Earn</TableCell>
              <TableCell>All users</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Contact a landlord</TableCell>
              <TableCell>5 TR</TableCell>
              <TableCell>Spend</TableCell>
              <TableCell>Tenant</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Restore an expired listing</TableCell>
              <TableCell>Varies by days</TableCell>
              <TableCell>Spend</TableCell>
              <TableCell>Landlord</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Purchase token bundle (Starter)</TableCell>
              <TableCell>50 TR</TableCell>
              <TableCell>Earn</TableCell>
              <TableCell>All users</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Purchase token bundle (Standard)</TableCell>
              <TableCell>100 TR</TableCell>
              <TableCell>Earn</TableCell>
              <TableCell>All users</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Purchase token bundle (Value)</TableCell>
              <TableCell>300 TR</TableCell>
              <TableCell>Earn</TableCell>
              <TableCell>All users</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </AppCard>

      <AppCard sx={{ p: 3 }}>
        <Box sx={{ fontWeight: 800, fontSize: "20px", mb: 2 }}>Purchase Tiers</Box>
        <Table>
          <TableHead>
            <TableRow>
              {["Bundle", "Tokens", "Price"].map((heading) => (
                <TableCell key={heading} sx={{ fontWeight: 800 }}>
                  {heading}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            <TableRow>
              <TableCell>Starter</TableCell>
              <TableCell>50 TR</TableCell>
              <TableCell>$5 USD</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Standard</TableCell>
              <TableCell>100 TR</TableCell>
              <TableCell>$10 USD</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Value</TableCell>
              <TableCell>300 TR</TableCell>
              <TableCell>$25 USD</TableCell>
            </TableRow>
          </TableBody>
        </Table>
        <Box sx={{ color: "text.secondary", lineHeight: 1.75, mt: 2 }}>
          Buy token bundles via EcoCash from your dashboard wallet.
        </Box>
      </AppCard>

      <AppCard sx={{ p: 3 }}>
        <Box sx={{ fontWeight: 800, fontSize: "20px", mb: 1.5 }}>Your Wallet</Box>
        <Box sx={{ color: "text.secondary", lineHeight: 1.75 }}>
          Your token balance is shown in the wallet card on your dashboard sidebar. Click the wallet card to see
          your full transaction history. Every credit and debit is recorded with a label and timestamp. Your
          balance is synced in real time after every action.
        </Box>
      </AppCard>

      <AppCard sx={{ p: 3 }}>
        <Box sx={{ fontWeight: 800, fontSize: "20px", mb: 1.5 }}>Token Expiry</Box>
        <Box sx={{ color: "text.secondary", lineHeight: 1.75 }}>
          TR Tokens do not expire. Your balance carries over indefinitely until you spend it.
        </Box>
      </AppCard>

      <AppCard sx={{ p: 3 }}>
        <Box sx={{ fontWeight: 800, fontSize: "20px", mb: 2 }}>FAQ</Box>
        <Box component="ul" sx={{ color: "text.secondary", lineHeight: 1.75, pl: 3, m: 0 }}>
          <Box component="li" sx={{ mb: 2 }}>
            <strong>Q: Do tokens expire?</strong>
            <br />
            A: No. Your token balance never expires.
          </Box>
          <Box component="li" sx={{ mb: 2 }}>
            <strong>Q: Can I transfer tokens to another account?</strong>
            <br />
            A: No. Tokens are tied to your account and cannot be transferred.
          </Box>
          <Box component="li" sx={{ mb: 2 }}>
            <strong>Q: What happens to my tokens if I delete my account?</strong>
            <br />
            A: Tokens are permanently lost when an account is deleted.
          </Box>
          <Box component="li" sx={{ mb: 2 }}>
            <strong>Q: Can I get a refund on purchased tokens?</strong>
            <br />
            A: Token purchases are non-refundable.
          </Box>
          <Box component="li" sx={{ mb: 2 }}>
            <strong>Q: What if I run out of tokens?</strong>
            <br />
            A: Purchase more from your dashboard wallet.
          </Box>
          <Box component="li" sx={{ mb: 2 }}>
            <strong>Q: Are tokens the same as the listing fee?</strong>
            <br />
            A: No. Listing activation uses TR Tokens. Money is only used to buy token bundles, while tokens power
            premium platform actions.
          </Box>
        </Box>
      </AppCard>
    </AppContainer>
  </Box>
);

export default TRTokens;
