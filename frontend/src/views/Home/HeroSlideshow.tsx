import { useEffect, useState } from "react";
import { Box } from "@mui/material";

type HeroSlideshowProps = {
  images: string[];
};

const kenBurnsTo = [
  "scale(1.08) translate(-1%,-1%)",
  "scale(1.08) translate(1%,-1%)",
  "scale(1.08) translate(-1%,1%)",
  "scale(1.08) translate(1%,1%)",
];

const HeroSlideshow = ({ images }: HeroSlideshowProps) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [prevIndex, setPrevIndex] = useState<number | null>(null);
  const [greenFade, setGreenFade] = useState(true);
  const imageSignature = images.join("|");

  useEffect(() => {
    if (images.length <= 1) {
      return undefined;
    }

    const interval = window.setInterval(() => {
      setActiveIndex((currentIndex) => {
        setPrevIndex(currentIndex);
        return (currentIndex + 1) % images.length;
      });
    }, 6000);

    return () => window.clearInterval(interval);
  }, [images.length]);

  useEffect(() => {
    setActiveIndex(0);
    setPrevIndex(null);
  }, [imageSignature]);

  useEffect(() => {
    setGreenFade(false);

    const timeout = window.setTimeout(() => {
      setGreenFade(true);
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [activeIndex]);

  return (
    <Box sx={{ position: "absolute", inset: 0, overflow: "hidden", zIndex: 0 }}>
      {images.map((image, index) => {
        const variant = index % 4;
        const keyframeName = `kenburns-${variant}`;

        return (
          <Box
            key={image}
            data-previous={index === prevIndex ? "true" : undefined}
            sx={{
              position: "absolute",
              inset: 0,
              backgroundImage: `url(${image})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              willChange: "transform, opacity",
              transform: "translateZ(0)",
              opacity: index === activeIndex ? 1 : 0,
              transition: "opacity 1.5s ease-in-out",
              animation:
                index === activeIndex
                  ? `${keyframeName} 10s ease-in-out forwards`
                  : "none",
              [`@keyframes ${keyframeName}`]: {
                from: { transform: "scale(1) translate(0,0)" },
                to: { transform: kenBurnsTo[variant] },
              },
            }}
          />
        );
      })}
      {/* Layer 1 - dark vignette */}
      <Box
        sx={{
          position: "absolute",
          inset: 0,
          zIndex: 1,
          background:
            "linear-gradient(to top, rgba(15,20,30,0.88) 0%, rgba(15,20,30,0.28) 55%, rgba(15,20,30,0.12) 100%)",
        }}
      />
      {/* Layer 2 - green brand overlay */}
      <Box
        sx={{
          position: "absolute",
          inset: 0,
          zIndex: 2,
          background:
            "linear-gradient(135deg, rgba(31,77,58,0.50) 0%, rgba(31,77,58,0.22) 55%, rgba(31,77,58,0) 100%)",
          opacity: greenFade ? 1 : 0.65,
          transition: "opacity 2s ease",
        }}
      />
    </Box>
  );
};

export default HeroSlideshow;
