# VidChain

**Proof-of-origin untuk kreator short-form video Indonesia.**

VidChain membantu kreator membuktikan asal-usul video viral, dance trend, meme, dan konten brand di TikTok, Instagram Reels, YouTube Shorts, Facebook, dan platform lain. Produk ini menggunakan **video fingerprinting** untuk mengenali repost/re-encode dan **Solana timestamped proof** untuk membuat bukti registrasi yang publik, portable, dan tamper-resistant.

## Track

**Consumer Apps**

Flow utama untuk user:

```text
Upload video -> Register proof -> Share certificate -> Verify repost
```

## Core Problem

Kreator Indonesia sering kehilangan atribusi ketika kontennya viral. Video bisa diunduh, dikompres, di-reupload, diedit ringan, dipakai brand, atau masuk ke game/meme culture tanpa kredit yang jelas.

Platform seperti TikTok dan YouTube punya timestamp/copyright system, tetapi sistem tersebut platform-specific dan tidak portable lintas TikTok, Instagram, YouTube, WhatsApp, brand, agency, dan game.

VidChain tidak menggantikan hukum hak cipta, notaris, atau pengadilan. VidChain membuat **digital evidence layer**: bukti waktu, fingerprint video, creator wallet/identity, dan certificate publik yang bisa dipakai untuk atribusi, dispute, takedown report, dan licensing conversation.

## MVP Goal

MVP hackathon harus menjawab satu pertanyaan dengan jelas:

> Kalau seseorang mengupload video yang sudah dikompres atau direpost, bisakah VidChain menemukan original creator yang sudah register lebih dulu?

## Must Have

- Register original video.
- Generate SHA-256 dan visual fingerprint.
- Register proof ke Solana Devnet.
- Simpan metadata di database.
- Public certificate page.
- Verify repost/re-encoded video.
- Confidence score dan original certificate link.
- Demo dataset: original, compressed copy, unrelated video.

## Out Of Scope Untuk MVP

- Full NFT marketplace.
- Token launch.
- Crypto investment/yield.
- Complex dispute court.
- Klaim sebagai notaris legal resmi.
- Revenue-share automation.

## Repository Structure

Struktur ini sengaja dibuat sebagai placeholder agar tiap workstream punya instruksi sendiri.

```text
README.md
WORKFLOW.md

frontend/
  instruction.md

backend/
  instruction.md

fingerprinting/
  instruction.md

blockchain/
  instruction.md

bot/
  instruction.md

shared/
  instruction.md
```

## Workstream Instructions

- [Frontend Instructions](frontend/instruction.md)
- [Backend Instructions](backend/instruction.md)
- [Fingerprinting Instructions](fingerprinting/instruction.md)
- [Blockchain Instructions](blockchain/instruction.md)
- [Bot Instructions](bot/instruction.md)
- [Shared Contracts & Patterns](shared/instruction.md)
- [Workflow](WORKFLOW.md)

## Suggested Stack

- Frontend: Next.js, React, TypeScript, Tailwind CSS, Solana Wallet Adapter.
- Backend: Node.js, Fastify or Next.js API Routes, PostgreSQL/Supabase, Zod.
- Core logic: TypeScript package for fingerprinting, matching, proof, certificate.
- Blockchain: Solana Devnet, Anchor, `@solana/web3.js`.
- Storage: IPFS/Pinata/Web3.Storage for metadata or optional media.
- Bot: Telegram Bot API first, WhatsApp Cloud API later.

## Success Criteria

VidChain MVP is ready for submission when:

- user can register an original video,
- Solana proof is created on Devnet,
- certificate page is public,
- re-encoded video can be verified,
- unrelated video returns no match,
- demo works in under 3 minutes,
- GitHub repo is public,
- project website is live,
- demo video and pitch deck are ready.

