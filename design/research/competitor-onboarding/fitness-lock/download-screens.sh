#!/usr/bin/env bash
set -euo pipefail

root_dir="$(cd "$(dirname "$0")" && pwd)"

tail -n +2 "$root_dir/screens.tsv" | while IFS=$'\t' read -r _category _rank _app_id _app_slug _sequence _flow_id _flow_name _screen_id _position _timestamp image_url local_path; do
  destination="$root_dir/$local_path"
  mkdir -p "$(dirname "$destination")"
  if [[ ! -s "$destination" ]]; then
    curl --fail --location --silent --show-error "$image_url" --output "$destination"
  fi
done

