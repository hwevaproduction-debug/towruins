import { ChangeEvent, DragEvent, useState } from "react";
import { Box, Button, IconButton, LinearProgress, Stack, Typography } from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import {
  useAddAccommodationImageMutation,
  useAddRoomImageMutation,
  useDeleteAccommodationImageMutation,
  useDeleteRoomImageMutation,
} from "../../../../redux/api/providerApiSlice";
import { useGetR2SignedUrlMutation } from "../../../../redux/api/uploadApiSlice";

type ImageUploaderProps = {
  folder: "rooms" | "accommodations";
  entityId: string;
  onImageAdded?: (url: string) => void;
  existingImages?: Array<{ id: string; _id?: string; url: string; isCover: boolean }>;
};

const uploadWithProgress = (uploadUrl: string, file: File, onProgress: (progress: number) => void) =>
  new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error("Upload failed")));
    xhr.onerror = () => reject(new Error("Upload failed"));
    xhr.open("PUT", uploadUrl);
    xhr.setRequestHeader("Content-Type", file.type);
    xhr.send(file);
  });

const ImageUploader = ({ folder, entityId, onImageAdded, existingImages = [] }: ImageUploaderProps) => {
  const [progress, setProgress] = useState<Record<string, number>>({});
  const [localImages, setLocalImages] = useState(existingImages);
  const [getSignedUrl] = useGetR2SignedUrlMutation();
  const [addRoomImage] = useAddRoomImageMutation();
  const [addAccommodationImage] = useAddAccommodationImageMutation();
  const [deleteRoomImage] = useDeleteRoomImageMutation();
  const [deleteAccommodationImage] = useDeleteAccommodationImageMutation();

  const uploadFiles = async (files: FileList | File[]) => {
    for (const file of Array.from(files)) {
      if (!file.type.startsWith("image/")) continue;
      if (file.size > 10 * 1024 * 1024) continue;
      setProgress((current) => ({ ...current, [file.name]: 1 }));
      const signed = await getSignedUrl({ contentType: file.type, folder }).unwrap();
      await uploadWithProgress(signed.uploadUrl, file, (value) => setProgress((current) => ({ ...current, [file.name]: value })));
      const mutationPayload = { id: entityId, payload: { url: signed.publicUrl } };
      const created: any = folder === "rooms" ? await addRoomImage(mutationPayload).unwrap() : await addAccommodationImage(mutationPayload).unwrap();
      const image = created?.data?.roomImage || created?.data?.accommodationImage || { id: signed.publicUrl, url: signed.publicUrl, isCover: false };
      setLocalImages((current) => [...current, image]);
      onImageAdded?.(signed.publicUrl);
      setProgress((current) => ({ ...current, [file.name]: 100 }));
    }
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    uploadFiles(event.dataTransfer.files);
  };

  const handleSelect = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      uploadFiles(event.target.files);
      event.target.value = "";
    }
  };

  const handleDelete = async (image: any) => {
    const imageId = image?._id || image?.id;
    if (folder === "rooms") {
      await deleteRoomImage({ id: entityId, imageId }).unwrap();
    } else {
      await deleteAccommodationImage({ id: entityId, imageId }).unwrap();
    }
    setLocalImages((current) => current.filter((item: any) => (item?._id || item?.id) !== imageId));
  };

  return (
    <Stack spacing={2}>
      <Box
        onDragOver={(event) => event.preventDefault()}
        onDrop={handleDrop}
        sx={{ border: "1px dashed #90a4ae", borderRadius: 1, p: 3, textAlign: "center", bgcolor: "#fafafa" }}
      >
        <Typography sx={{ mb: 1 }}>Drop images here</Typography>
        <Button component="label" variant="outlined">
          Select Images
          <input hidden multiple type="file" accept="image/*" onChange={handleSelect} />
        </Button>
      </Box>
      {Object.entries(progress).map(([name, value]) => (
        <Box key={name}>
          <Typography variant="caption">{name}</Typography>
          <LinearProgress variant="determinate" value={value} />
        </Box>
      ))}
      <Box sx={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: 1.5 }}>
        {localImages.map((image: any) => (
          <Box key={image?._id || image?.id || image?.url} sx={{ position: "relative" }}>
            <Box component="img" src={image.url} alt="" sx={{ width: "100%", aspectRatio: "4 / 3", objectFit: "cover", borderRadius: 1 }} />
            <IconButton size="small" onClick={() => handleDelete(image)} sx={{ position: "absolute", top: 4, right: 4, bgcolor: "background.paper" }}>
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Box>
        ))}
      </Box>
    </Stack>
  );
};

export default ImageUploader;
