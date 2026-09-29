#!/bin/bash
set -e
FONT=/usr/share/fonts/truetype/noto/NotoSans-Bold.ttf
SCENES=(media-generation-scene1-hero-0-817ac415-5a12-43a5-8a20-546a17117a8a
        media-generation-scene2-anomaly-0-3ec57661-30eb-4963-9927-9f22b5f5da0a
        media-generation-scene3-verify-0-10d0d7a0-7b17-41af-9c9f-442d0bf0355e
        media-generation-scene4-registry-0-f3a5604b-3ee8-4eae-9d80-420c37c89ab2)
CAPTIONS=("UnlockLens — token unlock transparency for Solana"
          "The chart promises more tokens than exist"
          "The burn\: verified live on mainnet"
          "One on-chain account per vesting schedule")
DURS=(18.72 17.328 11.04 15.912)
for i in 0 1 2 3; do
  n=$((i+1))
  FRAMES=$(python3 -c "print(round(${DURS[$i]}*30))")
  ffmpeg -y -v error -loop 1 -framerate 30 -t ${DURS[$i]} -i scenes/${SCENES[$i]}.webp \
    -vf "scale=2400:1350:force_original_aspect_ratio=increase,crop=2400:1350,zoompan=z='min(1+0.0006*in\,1.15)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=1:s=1920x1080:fps=30,drawtext=fontfile=$FONT:text='${CAPTIONS[$i]}':fontsize=46:fontcolor=white:borderw=2:bordercolor=black:x=(w-text_w)/2:y=h-130" \
    -frames:v $FRAMES -r 30 -c:v libx264 -preset medium -pix_fmt yuv420p seg_v$n.mp4
  echo "segment $n: $FRAMES frames"
done
printf "file 'seg_v1.mp4'\nfile 'seg_v2.mp4'\nfile 'seg_v3.mp4'\nfile 'seg_v4.mp4'\n" > vlist.txt
ffmpeg -y -v error -f concat -safe 0 -i vlist.txt -c copy video_only.mp4
ffmpeg -y -v error -i "concat:audio/seg1.mp3|audio/seg2.mp3|audio/seg3.mp3|audio/seg4.mp3" -c:a libmp3lame -q:a 3 audio_full.mp3
ffmpeg -y -v error -i video_only.mp4 -i audio_full.mp3 -c:v copy -c:a aac -b:a 160k -shortest unlocklens_pitch.mp4
echo "BUILD DONE"; ffprobe -v error -show_entries format=duration,size -of default=noprint_wrappers=1 unlocklens_pitch.mp4
