#!/usr/bin/env bash
set -euo pipefail

root_dir="$(cd "$(dirname "$0")" && pwd)"
out_dir="$root_dir/contact-sheets"
mkdir -p "$out_dir"

build_sheet() {
  local source_dir="$1"
  local output_name="$2"
  local title="$3"
  local metrics="$4"
  local montage_path="$out_dir/.${output_name}-montage.png"
  local header_path="$out_dir/.${output_name}-header.png"
  local output_path="$out_dir/${output_name}.png"

  magick montage "$source_dir"/*.png \
    -thumbnail '360x778>' \
    -background '#171717' \
    -fill '#FFFFFF' \
    -font '/System/Library/Fonts/SFNS.ttf' \
    -pointsize 18 \
    -set label '%t' \
    -tile 5x \
    -geometry '360x778+18+28' \
    "$montage_path"

  local width
  width="$(magick identify -format '%w' "$montage_path")"
  magick -size "${width}x180" xc:'#1E1E1E' \
    -fill '#FFFFFF' -font '/System/Library/Fonts/SFNS.ttf' -pointsize 42 -gravity northwest \
    -annotate +36+34 "$title" \
    -fill '#B8B8B8' -font '/System/Library/Fonts/SFNS.ttf' -pointsize 24 \
    -annotate +36+102 "$metrics" \
    "$header_path"

  magick "$header_path" "$montage_path" -append "$output_path"
  rm "$montage_path" "$header_path"
}

build_sheet "$root_dir/fitness/01-dawg" "fitness-01-dawg" \
  "Fitness #1 — DAWG" 'Aug 2026 est.: $200k revenue / 50k downloads = $4.00 RPD · 46 onboarding screens'
build_sheet "$root_dir/fitness/02-lock-in" "fitness-02-lock-in" \
  "Fitness #2 — Lock In" 'Aug 2026 est.: $150k revenue / 65k downloads = $2.31 RPD · 42 onboarding screens'
build_sheet "$root_dir/fitness/03-otterlife" "fitness-03-otterlife" \
  "Fitness #3 — OtterLife" 'Aug 2026 est.: $150k revenue / 150k downloads = $1.00 RPD · 43 onboarding screens'
build_sheet "$root_dir/screen-time/01-opal" "screen-time-01-opal" \
  "Broader blocker reference — Opal" 'Aug 2026 est.: $650k revenue / 200k downloads = $3.25 RPD · 50 onboarding screens'
build_sheet "$root_dir/screen-time/02-appblock" "screen-time-02-appblock" \
  "Broader blocker reference — AppBlock" 'Aug 2026 est.: $150k revenue / 50k downloads = $3.00 RPD · 37 onboarding screens'
build_sheet "$root_dir/screen-time/03-one-sec" "screen-time-03-one-sec" \
  "Fitness lock #1 — one sec" 'Aug 2026 est.: $100k revenue / 45k downloads = $2.22 RPD · 20 onboarding screens'
build_sheet "$root_dir/fitness-lock/02-unrot" "fitness-lock-02-unrot" \
  "Fitness lock #2 — Unrot" 'Aug 2026 est.: $65k revenue / 35k downloads = $1.86 RPD · 51 onboarding screens'
build_sheet "$root_dir/fitness-lock/03-blank-spaces" "fitness-lock-03-blank-spaces" \
  "Fitness lock #3 — Blank Spaces" 'Aug 2026 est.: $100k revenue / 55k downloads = $1.82 RPD · 23 onboarding screens'
