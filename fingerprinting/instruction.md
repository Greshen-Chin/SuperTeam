# Fingerprinting Instructions

Fingerprinting goal: detect the same video even after compression, re-encoding, or light edits.

## Responsibilities

- Generate exact file hash.
- Generate visual fingerprint.
- Compare uploaded video against registered proofs.
- Return match type and confidence score.

## MVP Algorithm

1. Generate SHA-256 file hash.
2. Extract frame every 1-2 seconds.
3. Resize frame to a small grayscale thumbnail.
4. Generate perceptual hash per frame.
5. Compare frame hash sequence with Hamming distance.
6. Return match type and confidence score.

## Match Types

```text
exact
visual
sequence
none
```

## Matching Strategy

Use multiple strategies in order:

```text
exactHashMatchStrategy
frameHashMatchStrategy
sequenceMatchStrategy
poseMatchStrategy // stretch
```

Start with exact hash and frame hash. Add sequence matching after register and verify flow works.

## Confidence Score

Recommended interpretation:

```text
1.00      exact file match
0.85-0.99 likely same video
0.65-0.84 possible match
<0.65     no reliable match
```

Do not claim theft. Use wording like:

```text
Likely Match Found
Possible Match
No Registered Origin Found
```

## Demo Dataset

Prepare:

- original video,
- compressed/re-encoded copy,
- trimmed copy if sequence matching is ready,
- unrelated video.

## Stretch: Dance Motion Fingerprint

If the MVP is already stable:

- use MediaPipe Pose or MoveNet,
- extract body keypoints,
- compare motion sequences,
- use Dynamic Time Warping for timing differences.

Do not start here. Pose detection is powerful, but it can consume the whole hackathon if the core product is not ready.

## Success Criteria

- Exact same video returns exact match.
- Compressed/re-encoded video returns visual match.
- Unrelated video returns no match.
- Function outputs are typed and reusable by frontend/backend/bot.

