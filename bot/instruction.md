# Bot Instructions

Bot goal: make VidChain easy to access for Indonesian users.

Bot is a stretch goal. Do not sacrifice web MVP quality to build bot features too early.

## Recommended Priority

1. Telegram bot.
2. WhatsApp Cloud API.

Telegram is easier for hackathon speed. WhatsApp is more relevant for Indonesia but usually needs more setup.

## Telegram Flow

```text
User sends video
Bot asks: Register Original or Check Original
Bot uploads/processes video via backend
If register: bot returns web signing link
If verify: bot returns match result + certificate link
```

## Bot Rules

- Bot must use backend APIs.
- Bot must not duplicate fingerprint/matching logic.
- Bot should not ask for seed phrase or private key.
- Registration still requires wallet signing in web app.

## Success Criteria

- User can send video to bot.
- Bot can return no-match or match result.
- Bot can return certificate link.
- Bot can hand off registration to web signing flow.

