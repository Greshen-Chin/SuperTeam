export async function sha256File(file: File) {
  const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function sha256Text(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function perceptualHashFromImage(file: File) {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  canvas.width = 8;
  canvas.height = 8;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Browser tidak dapat membaca gambar untuk fingerprint.");

  context.drawImage(bitmap, 0, 0, 8, 8);
  const pixels = context.getImageData(0, 0, 8, 8).data;
  const grayscale = Array.from({ length: 64 }, (_, index) => {
    const offset = index * 4;
    return pixels[offset] * 0.299 + pixels[offset + 1] * 0.587 + pixels[offset + 2] * 0.114;
  });
  const average = grayscale.reduce((total, value) => total + value, 0) / grayscale.length;
  return grayscale.map((value) => (value >= average ? "1" : "0")).join("");
}

export async function demoVideoPHash(file: File) {
  const hash = await sha256File(file);
  return Array.from({ length: 64 }, (_, index) => (parseInt(hash[index % hash.length], 16) > 7 ? "1" : "0")).join("");
}
