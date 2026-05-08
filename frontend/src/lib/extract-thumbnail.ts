export async function extractThumbnail(videoFile: File): Promise<File> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    const url = URL.createObjectURL(videoFile);
    video.src = url;
    video.muted = true;
    video.playsInline = true;
    video.preload = "metadata";

    video.addEventListener("loadeddata", () => {
      video.currentTime = Math.min(1, video.duration * 0.1);
    });

    video.addEventListener("seeked", () => {
      try {
        const canvas = document.createElement("canvas");
        const MAX = 640;
        const ratio = Math.min(MAX / video.videoWidth, MAX / video.videoHeight, 1);
        canvas.width = Math.round(video.videoWidth * ratio);
        canvas.height = Math.round(video.videoHeight * ratio);
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Canvas 2D context unavailable.");
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(
          (blob) => {
            URL.revokeObjectURL(url);
            if (!blob) { reject(new Error("Thumbnail extraction failed.")); return; }
            resolve(new File([blob], "thumbnail.jpg", { type: "image/jpeg" }));
          },
          "image/jpeg",
          0.82
        );
      } catch (err) {
        URL.revokeObjectURL(url);
        reject(err);
      }
    });

    video.addEventListener("error", () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not load video for thumbnail extraction."));
    });

    video.load();
  });
}
