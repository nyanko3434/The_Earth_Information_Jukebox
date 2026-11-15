#!/usr/bin/env bash
# Generates the synthetic test clips for the dev harness, next to this script.
# They are git-ignored. Existing clips are kept unless --force is given.
#
#   bash src/analysis/dev/make-clips.sh [--force]
#
# standin.mp4 (test tone)
#   0-8 s    frame fades black -> white -> black   meanLuma 0 -> 1 -> 0, tone 110 -> 880 -> 110 Hz, pan centre
#   8-14 s   white square crosses, left to right   motion above 0, meanLuma about 0.03, pan -0.85 -> +0.85
#   14-20 s  static colour bars                    motion 0, hue and sat per cell, pan about -0.3
#
# flashes.mp4 (lightning sonifier), on a dim static map with a bright static date box
#   The flashes are lightning yellow: the sonifier answers to a rise in yellow, not in brightness.
#   1, 2, 3, 4 s   single flashes: top-left, top-right, bottom-left, bottom-right
#   5 s            a white flash, centre (must not sound)
#   6 s, 7 s       a large flash (full loudness), then a small one (3 px, about 0.6), both centre
#   8-10 s         40 flashes in 2 s (the note cap should hold)
#   12-14.5 s      six dots that appear and stay (one note each, on appearing)
#   16.67 s        the video's keyframe: the bright dots flicker, and one or two may sound again
#
# oceantest.mp4 (ocean sonifier), in the colours of the ocean clip's colorbar
#   whole clip  grey "land" over the north-east (that voice stays silent) and a
#               bright red band along the bottom, where the colorbar is (never sounds)
#   0-6 s       west red (warm), east blue (cold), still   west voices 110 Hz and louder, east 880 Hz; no shimmer
#   6-12 s      the same, swapped                          west 880 Hz, east 110 Hz and louder; no shimmer
#   12-18 s     green everywhere (370 Hz), with a bright   shimmer in tropics-west and south-west only
#               bar crossing the west half below the north
set -euo pipefail
cd "$(dirname "$0")"
force="${1:-}"
encode=(-an -c:v libx264 -crf 23 -preset slow -movflags +faststart)

wanted() { [[ "$force" == "--force" || ! -f "$1" ]]; }

if wanted standin.mp4; then
  ffmpeg -y -hide_banner -loglevel error \
    -f lavfi -i "color=c=white:s=640x320:r=30:d=8,fade=t=in:st=0:d=4,fade=t=out:st=4:d=4" \
    -f lavfi -i "color=c=black:s=640x320:r=30:d=6" \
    -f lavfi -i "color=c=white:s=80x80:r=30:d=6" \
    -f lavfi -i "smptebars=s=640x320:r=30:d=6" \
    -filter_complex "[1][2]overlay=x='(W-w)*t/6':y='(H-h)/2'[box];[0][box][3]concat=n=3:v=1:a=0,format=yuv420p" \
    "${encode[@]}" standin.mp4
  echo "wrote standin.mp4"
fi

if wanted flashes.mp4; then
  box() { # x y w h colour, then an enable expression
    printf ",drawbox=x=%s:y=%s:w=%s:h=%s:c=%s:t=fill:enable='%s'" "$1" "$2" "$3" "$4" "$5" "$6"
  }
  # Static content, which must never sound: two dim "continents" and a date box.
  f="drawbox=x=90:y=70:w=150:h=120:c=0x1c2c30:t=fill"
  f+=",drawbox=x=380:y=110:w=190:h=140:c=0x1c2c30:t=fill"
  f+=",drawbox=x=10:y=292:w=100:h=18:c=white:t=fill"
  yellow=0xffcc00
  f+=$(box 60 40 16 16 $yellow "between(t,1,1.2)")
  f+=$(box 564 40 16 16 $yellow "between(t,2,2.2)")
  f+=$(box 60 264 16 16 $yellow "between(t,3,3.2)")
  f+=$(box 564 264 16 16 $yellow "between(t,4,4.2)")
  f+=$(box 300 140 40 40 white "between(t,5,5.2)")
  f+=$(box 296 136 48 48 $yellow "between(t,6,6.2)")
  f+=$(box 313 153 3 3 $yellow "between(t,7,7.2)")
  seed=7
  for i in $(seq 0 39); do
    seed=$(( (seed * 1103515245 + 12345) % 2147483648 )); x=$(( 20 + (seed / 65536) % 584 ))
    seed=$(( (seed * 1103515245 + 12345) % 2147483648 )); y=$(( 20 + (seed / 65536) % 250 ))
    start=$(awk "BEGIN { printf \"%.2f\", 8 + $i * 0.05 }")
    end=$(awk "BEGIN { printf \"%.2f\", 8 + $i * 0.05 + 0.15 }")
    f+=$(box "$x" "$y" 16 16 $yellow "between(t,$start,$end)")
  done
  f+=$(box 150 60 14 14 0xffe080 "gte(t,12)")
  f+=$(box 470 90 14 14 0xffe080 "gte(t,12.5)")
  f+=$(box 240 150 14 14 0xffe080 "gte(t,13)")
  f+=$(box 400 190 14 14 0xffe080 "gte(t,13.5)")
  f+=$(box 110 240 14 14 0xffe080 "gte(t,14)")
  f+=$(box 540 250 14 14 0xffe080 "gte(t,14.5)")
  ffmpeg -y -hide_banner -loglevel error \
    -f lavfi -i "color=c=0x0a1428:s=640x320:r=30:d=18" \
    -vf "$f,format=yuv420p" "${encode[@]}" flashes.mp4
  echo "wrote flashes.mp4"
fi

if wanted oceantest.mp4; then
  half() { # x colour, then an enable expression: one half of the map, above the bottom band
    printf ",drawbox=x=%s:y=0:w=320:h=270:c=%s:t=fill:enable='%s'" "$1" "$2" "$3"
  }
  warm=0xCC3914 cold=0x1F67CC mild=0x24B239
  f="null"
  f+=$(half 0 $warm "lt(t,6)")
  f+=$(half 320 $cold "lt(t,6)")
  f+=$(half 0 $cold "gte(t,6)*lt(t,12)")
  f+=$(half 320 $warm "gte(t,6)*lt(t,12)")
  f+=$(half 0 $mild "gte(t,12)")
  f+=$(half 320 $mild "gte(t,12)")
  f+=",drawbox=x=320:y=0:w=320:h=110:c=0x404040:t=fill"
  f+=",drawbox=x=0:y=270:w=640:h=50:c=0xFF2020:t=fill"
  ffmpeg -y -hide_banner -loglevel error \
    -f lavfi -i "color=c=black:s=640x320:r=30:d=18" \
    -f lavfi -i "color=c=0x33FF52:s=20x160:r=30:d=18" \
    -filter_complex "[0]${f}[map];[map][1]overlay=x='(W/2-w)*mod(t,2)/2':y=110:enable='gte(t,12)',format=yuv420p" \
    "${encode[@]}" oceantest.mp4
  echo "wrote oceantest.mp4"
fi
