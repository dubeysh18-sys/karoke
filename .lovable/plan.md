

## Plan: MP4 Export with Faster Rendering

### Problem
1. Export produces `.webm` — user wants `.mp4`
2. Frame-by-frame `video.currentTime` seeking is extremely slow (each seek triggers a browser decode pipeline)

### Solution
Use the **WebCodecs API** (`VideoEncoder` + `AudioEncoder`) paired with the **`mp4-muxer`** library for native MP4 output. This also enables much faster rendering because we can encode frames as fast as the GPU can process them, without waiting for real-time `MediaRecorder` timing.

### Speed Improvements
- **Eliminate per-frame video seeking**: Pre-play the source video and capture frames via `createImageBitmap` at intervals, OR keep the seek approach but batch process without `MediaRecorder` real-time constraints
- **WebCodecs `VideoEncoder`**: Hardware-accelerated H.264 encoding — significantly faster than VP9/WebM software encoding
- **No real-time audio sync needed**: Audio is muxed directly from the decoded buffer, not streamed through `AudioContext` in real-time
- **Parallel encode**: Frames can be queued to the encoder without waiting for each to complete

### Install
- `mp4-muxer` (npm package)

### Changes: `src/components/ExportButton.tsx`
1. Import `Muxer, ArrayBufferTarget` from `mp4-muxer`
2. Replace the `MediaRecorder` flow with:
   - Create `VideoEncoder` with H.264 codec, 1080x1920, 30fps, ~8Mbps bitrate
   - Create `AudioEncoder` with AAC codec matching the source audio sample rate
   - Create `Muxer` with `fastStart: 'in-memory'` for proper MP4 seeking
3. For each frame: seek video → draw canvas → create `VideoFrame` from canvas → encode → frame.close()
4. Encode audio: extract PCM from `AudioBuffer` → feed as `AudioData` chunks to `AudioEncoder`
5. On completion: `muxer.finalize()` → create Blob `type: 'video/mp4'` → download as `karaoke-reel.mp4`
6. Add browser capability check: if `VideoEncoder` is undefined, show toast "Please use Chrome or Edge for MP4 export"
7. Yield to UI every 10 frames instead of 5 for less overhead

### Fallback
If WebCodecs is unavailable, display a toast error rather than silently failing.

