import { useEffect, useState } from "react";
import { Box, Dialog, IconButton } from "@mui/material";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

interface ImageLightboxProps {
  images: string[];
  initialIndex?: number;
  open: boolean;
  onClose: () => void;
}

const ImageLightbox = ({
  images,
  initialIndex = 0,
  open,
  onClose,
}: ImageLightboxProps) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex || 0);
  const [zoomed, setZoomed] = useState(false);

  useEffect(() => {
    if (open) {
      setCurrentIndex(initialIndex || 0);
      setZoomed(false);
    }
  }, [initialIndex, open]);

  const goToPrevious = () => {
    if (!images.length) return;
    setCurrentIndex((index) => (index - 1 + images.length) % images.length);
    setZoomed(false);
  };

  const goToNext = () => {
    if (!images.length) return;
    setCurrentIndex((index) => (index + 1) % images.length);
    setZoomed(false);
  };

  useEffect(() => {
    if (!open) return undefined;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft") goToPrevious();
      if (event.key === "ArrowRight") goToNext();
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  const currentImage = images[currentIndex];

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullScreen
      PaperProps={{ sx: { background: "rgba(0,0,0,0.92)", boxShadow: "none" } }}
    >
      <IconButton
        onClick={onClose}
        aria-label="Close"
        sx={{
          position: "fixed",
          top: 16,
          right: 16,
          color: "#fff",
          zIndex: 3,
        }}
      >
        <X />
      </IconButton>
      <Box
        sx={{
          position: "fixed",
          top: 22,
          left: 22,
          color: "#fff",
          fontWeight: 700,
          zIndex: 3,
        }}
      >
        {images.length ? `${currentIndex + 1} / ${images.length}` : "0 / 0"}
      </Box>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          width: "100vw",
          overflow: "hidden",
        }}
      >
        {currentImage ? (
          <img
            src={currentImage}
            alt=""
            style={{
              maxWidth: "90vw",
              maxHeight: "85vh",
              objectFit: "contain",
              cursor: zoomed ? "zoom-out" : "zoom-in",
              transform: zoomed ? "scale(1.5)" : "scale(1)",
              transition: "transform 0.3s ease",
            }}
            onClick={() => setZoomed((value) => !value)}
          />
        ) : null}
      </Box>
      {images.length > 1 ? (
        <>
          <IconButton
            onClick={goToPrevious}
            aria-label="Previous image"
            sx={{
              position: "fixed",
              left: 16,
              top: "50%",
              transform: "translateY(-50%)",
              color: "#fff",
              background: "rgba(255,255,255,0.16)",
              zIndex: 3,
              "&:hover": { background: "rgba(255,255,255,0.24)" },
            }}
          >
            <ChevronLeft />
          </IconButton>
          <IconButton
            onClick={goToNext}
            aria-label="Next image"
            sx={{
              position: "fixed",
              right: 16,
              top: "50%",
              transform: "translateY(-50%)",
              color: "#fff",
              background: "rgba(255,255,255,0.16)",
              zIndex: 3,
              "&:hover": { background: "rgba(255,255,255,0.24)" },
            }}
          >
            <ChevronRight />
          </IconButton>
          <Box
            sx={{
              position: "fixed",
              bottom: 16,
              left: "50%",
              transform: "translateX(-50%)",
              display: "flex",
              gap: "8px",
              overflowX: "auto",
              overflowY: "auto",
              maxWidth: "90vw",
              zIndex: 3,
              p: 0.5,
            }}
          >
            {images.map((image, index) => (
              <Box
                component="img"
                key={`${image}-${index}`}
                src={image}
                alt=""
                onClick={() => {
                  setCurrentIndex(index);
                  setZoomed(false);
                }}
                sx={{
                  width: 64,
                  height: 48,
                  objectFit: "cover",
                  borderRadius: "6px",
                  cursor: "pointer",
                  border:
                    currentIndex === index
                      ? "2px solid #B8975A"
                      : "2px solid transparent",
                  flexShrink: 0,
                }}
              />
            ))}
          </Box>
        </>
      ) : null}
    </Dialog>
  );
};

export default ImageLightbox;
