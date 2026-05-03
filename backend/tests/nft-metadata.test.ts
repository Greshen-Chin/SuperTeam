import { describe, it, expect } from "vitest";
import { buildNftMetadata } from "../src/nft-metadata.js";
import type { NftMetadataInput } from "../src/nft-metadata.js";

const base: NftMetadataInput = {
  proofId: "proof_abc123",
  title: "My Video",
  description: "A test description",
  creatorWallet: "CREAToRWaLLeTaBcDeFgH12345678",
  sha256: "deadbeef".repeat(8),
  fingerprintRoot: "rootdeadbeef",
  registeredAt: "2025-01-01T00:00:00.000Z"
};

describe("buildNftMetadata", () => {
  it("sets name, symbol, and description", () => {
    const meta = buildNftMetadata(base);
    expect(meta.name).toBe("VidChain Proof — My Video");
    expect(meta.symbol).toBe("VIDPROOF");
    expect(meta.description).toBe("A test description");
  });

  it("uses fallback description when not provided", () => {
    const meta = buildNftMetadata({ ...base, description: undefined });
    expect(meta.description).toContain("My Video");
  });

  it("includes all four required attributes", () => {
    const meta = buildNftMetadata(base);
    const traitTypes = meta.attributes.map((a) => a.trait_type);
    expect(traitTypes).toContain("SHA-256");
    expect(traitTypes).toContain("Fingerprint Root");
    expect(traitTypes).toContain("Creator Wallet");
    expect(traitTypes).toContain("Registered At");
  });

  it("sets sha256 and fingerprintRoot attribute values", () => {
    const meta = buildNftMetadata(base);
    const sha = meta.attributes.find((a) => a.trait_type === "SHA-256");
    expect(sha?.value).toBe(base.sha256);
    const fpRoot = meta.attributes.find((a) => a.trait_type === "Fingerprint Root");
    expect(fpRoot?.value).toBe(base.fingerprintRoot);
  });

  it("sets external_url to certificate path", () => {
    const meta = buildNftMetadata(base);
    expect(meta.external_url).toContain(base.proofId);
  });

  it("sets animation_url and file when ipfsVideoUri provided", () => {
    const meta = buildNftMetadata({ ...base, ipfsVideoUri: "ipfs://Qm123/video.mp4" });
    expect(meta.animation_url).toBe("ipfs://Qm123/video.mp4");
    expect(meta.properties.files[0]?.uri).toBe("ipfs://Qm123/video.mp4");
  });

  it("omits animation_url and files when no ipfsVideoUri", () => {
    const meta = buildNftMetadata(base);
    expect(meta.animation_url).toBeUndefined();
    expect(meta.properties.files).toHaveLength(0);
  });

  it("uses ipfsThumbnailUri as image when provided", () => {
    const meta = buildNftMetadata({ ...base, ipfsThumbnailUri: "ipfs://Qm123/thumb.jpg" });
    expect(meta.image).toBe("ipfs://Qm123/thumb.jpg");
  });

  it("falls back to default image when no thumbnail", () => {
    const meta = buildNftMetadata(base);
    expect(meta.image).toMatch(/vidchain/i);
  });

  it("sets creator wallet in properties.creators with 100% share", () => {
    const meta = buildNftMetadata(base);
    expect(meta.properties.creators[0]?.address).toBe(base.creatorWallet);
    expect(meta.properties.creators[0]?.share).toBe(100);
  });
});
