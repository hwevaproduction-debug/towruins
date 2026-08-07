// React Imports
import { useContext, useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
// Material UI Imports
import {
  Box,
  Avatar,
  IconButton,
  MenuItem,
  Menu,
  styled,
  MenuProps,
  Tooltip,
  Drawer,
  List,
  ListItemButton,
  ListItemText,
  Divider,
  Badge,
  useTheme,
} from "@mui/material";
// Component Imports
import SearchBar from "../SearchBar";
import AppButton from "../ui/AppButton";
import AppContainer from "../ui/AppContainer";
import NotificationBell from "./NotificationBell";
import { ColorModeContext } from "../../App";
// Hooks Imports
import useTypedSelector from "../../hooks/useTypedSelector";
// Redux Imports
import {
  selectedUserAvatar,
  selectedUserName,
  selectedUserRole,
  selectedUserToken,
  selectedIsEmailVerified,
  setUser,
} from "../../redux/auth/authSlice";
// Icons Imports
import { LogOut, User } from "lucide-react";
import MenuIcon from "@mui/icons-material/Menu";
import CloseIcon from "@mui/icons-material/Close";
import WbSunny from "@mui/icons-material/WbSunny";
import DarkMode from "@mui/icons-material/DarkMode";
import {
  selectedSearchText,
  setSearchText,
} from "../../redux/global/globalSlice";

const menuStyle = {
  cursor: "pointer",
  color: "text.secondary",
  position: "relative",
  py: 0.5,
  whiteSpace: "nowrap",
  transition: "color 0.2s cubic-bezier(0.4,0,0.2,1)",
  "&::after": {
    content: '""',
    position: "absolute",
    left: 0,
    bottom: 0,
    width: 0,
    height: "2px",
    background: "#B8975A",
    transition: "width 0.2s cubic-bezier(0.4,0,0.2,1)",
  },
  "&:hover": {
    color: "text.primary",
  },
  "&:hover::after": {
    width: "100%",
  },
};

const getActiveMenuStyle = (active: boolean) => ({
  ...menuStyle,
  ...(active
    ? {
        color: "text.primary",
        "&::after": {
          width: "100%",
        },
      }
    : {}),
});

const getMobileItemSx = (active: boolean) =>
  active
    ? {
        borderLeft: "4px solid #B8975A",
        color: "#B8975A",
        background: "rgba(184,151,90,0.08)",
        pl: 1.5,
      }
    : undefined;

const getInitials = (name?: string) => {
  if (!name) {
    return "U";
  }

  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
};

const HERO_PATHS = [
  "/",
  "/stays",
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/provider-signup",
];

const StyledMenu = styled((props: MenuProps) => (
  <Menu
    elevation={0}
    anchorOrigin={{
      vertical: "bottom",
      horizontal: "right",
    }}
    transformOrigin={{
      vertical: "top",
      horizontal: "right",
    }}
    {...props}
  />
))(({ theme }) => ({
  "& .MuiPaper-root": {
    borderRadius: 16,
    width: "100%",
    maxWidth: 260,
    background: theme.palette.background.paper,
    color: theme.palette.text.primary,
    border: `1px solid ${theme.palette.divider}`,
    boxShadow: "0 12px 40px rgba(31,41,55,0.14)",
    "& .MuiMenu-list": {
      padding: "10px 5px",
    },
    "& .MuiMenuItem-root": {
      "& .MuiSvgIcon-root": {
        fontSize: 18,
      },
    },
  },
}));

const Header = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const colorMode = useContext(ColorModeContext);
  const token = useTypedSelector(selectedUserToken);
  const avatar = useTypedSelector(selectedUserAvatar);
  const userName = useTypedSelector(selectedUserName);
  const userRole = useTypedSelector(selectedUserRole);
  const isEmailVerified = useTypedSelector(selectedIsEmailVerified);
  const searchText = useTypedSelector(selectedSearchText);
  const isAuthenticated = Boolean(token);

  const [anchorEl, setAnchorEl] = useState<Element | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const isHeroPage = HERO_PATHS.some(
    (p) => location.pathname === p || location.pathname.startsWith(p + "/")
  );
  const [scrolled, setScrolled] = useState(false);
  const headerIconColor =
    isHeroPage && !scrolled
      ? "#fff"
      : theme.palette.mode === "dark"
      ? "#E6EDF3"
      : "#1F2937";
  const isActive = (path: string) =>
    path === "/"
      ? location.pathname === "/"
      : location.pathname === path || location.pathname.startsWith(`${path}/`);

  const handleSearch = (event: any) => {
    let value = event.target.value.toLowerCase();
    dispatch(setSearchText(value));
    setSearchTerm(value);
  };

  const handleSubmit = (e: any) => {
    e.preventDefault();
    const urlParams = new URLSearchParams(window.location.search);
    urlParams.set("searchTerm", searchTerm);
    const searchQuery = urlParams.toString();
    navigate(`/search?${searchQuery}`);
  };

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const searchTextFromUrl = urlParams.get("searchTerm");
    if (searchTextFromUrl) {
      dispatch(setSearchText(searchTextFromUrl));
      setSearchTerm(searchTextFromUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [window.location.search]);

  useEffect(() => {
    if (!isHeroPage) {
      setScrolled(false);
      return;
    }
    const handleScroll = () => setScrolled(window.scrollY > 80);
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, [isHeroPage]);

  return (
    <header>
      <Box
        sx={{
          position: isHeroPage ? "fixed" : "sticky",
          top: 0,
          left: isHeroPage ? 0 : undefined,
          right: isHeroPage ? 0 : undefined,
          width: isHeroPage ? "100%" : undefined,
          zIndex: 1100,
          background:
            isHeroPage && !scrolled
              ? "rgba(15,20,30,0.42)"
              : theme.palette.mode === "dark"
              ? "rgba(13,17,23,0.94)"
              : "rgba(245,240,235,0.94)",
          backdropFilter: isHeroPage && !scrolled ? "blur(12px)" : "blur(16px)",
          borderBottom:
            isHeroPage && !scrolled
              ? "1px solid rgba(255,255,255,0.08)"
              : "1px solid rgba(184,151,90,0.18)",
          transition: "background 0.35s ease, backdrop-filter 0.35s ease, border-color 0.35s ease",
        }}
      >
        <AppContainer>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr auto", md: "160px 1fr 200px" },
              alignItems: "center",
              minHeight: "72px",
              py: { xs: 1, md: 1.5 },
              gap: 2,
            }}
          >
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                width: { xs: "100%", md: "auto" },
              }}
            >
              <Box
                onClick={() => navigate("/")}
                sx={{
                  display: "flex",
                  cursor: "pointer",
                  alignItems: "center",
                  transition: "transform 0.2s ease",
                  "&:hover": { transform: "scale(1.02)" },
                }}
              >
                <Box
                  component="img"
                  src="/app-logo.png"
                  alt="Town Ruins"
                  sx={{
                    height: { xs: 32, md: 40 },
                    width: "auto",
                    objectFit: "contain",
                    display: "block",
                    filter:
                      isHeroPage && !scrolled
                        ? "drop-shadow(0 2px 8px rgba(0,0,0,0.5))"
                        : undefined,
                  }}
                />
              </Box>
              <IconButton
                sx={{
                  display: "flex",
                  "@media (min-width:768px)": {
                    display: "none",
                  },
                }}
                onClick={() => setMobileOpen((prev) => !prev)}
                aria-label="toggle mobile navigation"
              >
                {mobileOpen ? <CloseIcon fontSize="small" /> : <MenuIcon fontSize="small" />}
              </IconButton>
            </Box>

            <Box
              sx={{
                display: { xs: "none", md: "flex" },
                flexDirection: "row",
                alignItems: "center",
                gap: 2,
              }}
            >
              <Box component="form" onSubmit={handleSubmit} sx={{ flexShrink: 0, width: "100%", maxWidth: 280 }}>
                <SearchBar
                  placeholder="Search locations, listings..."
                  searchText={searchText}
                  handleSearch={handleSearch}
                  value={searchTerm}
                  onChange={handleSearch}
                />
              </Box>

              <Box sx={{ display: "flex", gap: 2.5, alignItems: "center", flexWrap: "nowrap" }}>
                {[
                  { label: "Home", path: "/" },
                  { label: "About", path: "/about" },
                  { label: "Properties", path: "/search" },
                  { label: "Temporary Stays", path: "/stays" },
                ].map((item) => (
                  <Box
                    key={item.path}
                    sx={{
                      ...getActiveMenuStyle(isActive(item.path)),
                      ...(isHeroPage && !scrolled
                        ? {
                            color: "#fff",
                            textShadow: "0 1px 8px rgba(0,0,0,0.6)",
                          }
                        : {}),
                    }}
                    onClick={() => navigate(item.path)}
                  >
                    {item.label}
                  </Box>
                ))}
                {isAuthenticated && (
                  <Box
                    sx={{
                      ...getActiveMenuStyle(location.pathname.startsWith("/dashboard")),
                      color: "#B8975A",
                      fontWeight: 700,
                      ...(isHeroPage && !scrolled ? { color: "#B8975A" } : {}),
                    }}
                    onClick={() => {
                      if (userRole === "landlord") navigate("/dashboard/landlord");
                      else if (userRole === "tenant") navigate("/dashboard/tenant");
                      else if (userRole === "provider") navigate("/dashboard/provider");
                      else if (userRole === "admin" || userRole === "super_admin") navigate("/dashboard/admin");
                      else navigate("/");
                    }}
                  >
                    Dashboard
                  </Box>
                )}
              </Box>
            </Box>

            <Box
              sx={{
                display: { xs: "none", md: "flex" },
                alignItems: "center",
                justifyContent: "flex-end",
                gap: 1.5,
                "& > *": {
                  color: isHeroPage && !scrolled ? "#fff !important" : undefined,
                },
              }}
            >
              <Tooltip title={theme.palette.mode === "dark" ? "Switch to light mode" : "Switch to dark mode"}>
                <IconButton
                  onClick={colorMode.toggleColorMode}
                  aria-label="toggle color mode"
                  sx={{ color: "text.secondary" }}
                >
                  {theme.palette.mode === "dark" ? (
                    <WbSunny fontSize="small" />
                  ) : (
                    <DarkMode fontSize="small" />
                  )}
                </IconButton>
              </Tooltip>

              {isAuthenticated ? (
                <>
                  <NotificationBell iconColor={headerIconColor} />
                  <Box sx={{ cursor: "pointer" }}>
                    <IconButton
                      onClick={(e) => setAnchorEl(e.currentTarget)}
                      color="inherit"
                    >
                      <Badge badgeContent="" variant="dot" color="warning" invisible={isEmailVerified || !isAuthenticated}>
                        <Avatar
                          alt={userName || "User Avatar"}
                          src={avatar || undefined}
                          sx={{ bgcolor: "#B8975A", color: "#FFFFFF" }}
                        >
                          {getInitials(userName)}
                        </Avatar>
                      </Badge>
                    </IconButton>
                    <StyledMenu
                      onClick={() => setAnchorEl(null)}
                      anchorEl={anchorEl}
                      open={Boolean(anchorEl)}
                    >
                      <MenuItem
                        sx={{
                          "&:hover": {
                            background: "unset",
                            cursor: "unset",
                          },
                        }}
                      >
                        <Box
                          sx={{ display: "flex", alignItems: "center", gap: 1 }}
                        >
                          <Avatar
                            alt={userName || "User Avatar"}
                            src={avatar || undefined}
                            sx={{ bgcolor: "#B8975A", color: "#FFFFFF" }}
                          >
                            {getInitials(userName)}
                          </Avatar>
                          <Box>{userName}</Box>
                        </Box>
                      </MenuItem>
                      <MenuItem
                        sx={{
                          "&:hover": {
                            background: "unset",
                          },
                        }}
                      >
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            width: "100%",
                            gap: "3px",
                            marginTop: "5px",
                          }}
                        >
                          <Tooltip title="See Profile" placement="bottom">
                            <Box
                              sx={{
                                background: "rgba(31,77,58,0.08)",
                                borderTopLeftRadius: "12px",
                                borderBottomLeftRadius: "12px",
                                width: "100%",
                                padding: "6px 10px",
                                display: "flex",
                                alignItems: "center",
                                gap: 1,
                                "&:hover": {
                                  background: "rgba(31,77,58,0.14)",
                                },
                              }}
                              onClick={() => {
                                navigate("/profile");
                              }}
                            >
                              <User size={16} />
                              Profile
                            </Box>
                          </Tooltip>
                          <Tooltip title="Logout Profile" placement="bottom">
                            <Box
                              sx={{
                                background: "rgba(31,77,58,0.08)",
                                borderTopRightRadius: "12px",
                                borderBottomRightRadius: "12px",
                                width: "100%",
                                padding: "6px 10px",
                                display: "flex",
                                alignItems: "center",
                                gap: 1,
                                "&:hover": {
                                  background: "rgba(31,77,58,0.14)",
                                },
                              }}
                              onClick={() => {
                                dispatch(setUser(null));
                                localStorage.removeItem("user");
                                setAnchorEl(null);
                                navigate("/");
                              }}
                            >
                              <LogOut size={16} /> Logout
                            </Box>
                          </Tooltip>
                        </Box>
                      </MenuItem>
                    </StyledMenu>
                  </Box>
                </>
              ) : (
                <>
                  <Box sx={getActiveMenuStyle(isActive("/login"))} onClick={() => navigate("/login")}>
                    Log in
                  </Box>
                  <AppButton onClick={() => navigate("/signup")}>Sign up</AppButton>
                </>
              )}
            </Box>
          </Box>
        </AppContainer>
      </Box>
      <Drawer
        anchor="right"
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        PaperProps={{
          sx: {
            width: 280,
            pt: 2,
            px: 2,
            background: theme.palette.mode === "dark" ? "#161B22" : "#F5F0EB",
          },
        }}
      >
        <List>
          <Box sx={{ padding: "16px 16px 12px" }}>
            <Box
              component="img"
              src="/app-logo.png"
              alt="Town Ruins"
              sx={{ height: 32, width: "auto", objectFit: "contain", display: "block" }}
            />
          </Box>
          <ListItemButton
            sx={getMobileItemSx(isActive("/"))}
            onClick={() => {
              navigate("/");
              setMobileOpen(false);
            }}
          >
            <ListItemText primary="Home" />
          </ListItemButton>
          <ListItemButton
            sx={getMobileItemSx(isActive("/about"))}
            onClick={() => {
              navigate("/about");
              setMobileOpen(false);
            }}
          >
            <ListItemText primary="About" />
          </ListItemButton>
          <ListItemButton
            sx={getMobileItemSx(isActive("/search"))}
            onClick={() => {
              navigate("/search");
              setMobileOpen(false);
            }}
          >
            <ListItemText primary="Search / Properties" />
          </ListItemButton>
          <ListItemButton
            sx={getMobileItemSx(isActive("/stays"))}
            onClick={() => {
              navigate("/stays");
              setMobileOpen(false);
            }}
          >
            <ListItemText primary="Temporary Stays" />
          </ListItemButton>
          <ListItemButton onClick={colorMode.toggleColorMode}>
            <ListItemText
              primary={theme.palette.mode === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
            />
          </ListItemButton>

          {isAuthenticated ? (
            <>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "flex-start",
                  px: 0,
                  py: 1,
                }}
              >
                <NotificationBell />
              </Box>
              <ListItemButton
                sx={getMobileItemSx(
                  isActive("/dashboard/landlord") ||
                    isActive("/dashboard/tenant") ||
                    isActive("/dashboard/admin")
                )}
                onClick={() => {
                  if (userRole === "landlord") {
                    navigate("/dashboard/landlord");
                  } else if (userRole === "tenant") {
                    navigate("/dashboard/tenant");
                  } else if (userRole === "admin") {
                    navigate("/dashboard/admin");
                  } else {
                    navigate("/");
                  }
                  setMobileOpen(false);
                }}
              >
                <ListItemText primary="Dashboard" />
              </ListItemButton>
              <ListItemButton
                sx={getMobileItemSx(isActive("/profile"))}
                onClick={() => {
                  navigate("/profile");
                  setMobileOpen(false);
                }}
              >
                <ListItemText primary="Profile" />
              </ListItemButton>
              <Divider sx={{ my: 1 }} />
              <ListItemButton
                sx={getMobileItemSx(isActive("/login"))}
                onClick={() => {
                  dispatch(setUser(null));
                  localStorage.removeItem("user");
                  setMobileOpen(false);
                  navigate("/");
                }}
              >
                <ListItemText primary="Logout" />
              </ListItemButton>
            </>
          ) : (
            <>
              <Divider sx={{ my: 1 }} />
              <ListItemButton
                onClick={() => {
                  navigate("/login");
                  setMobileOpen(false);
                }}
              >
                <ListItemText primary="Login" />
              </ListItemButton>
            </>
          )}
        </List>
      </Drawer>
    </header>
  );
};

export default Header;
