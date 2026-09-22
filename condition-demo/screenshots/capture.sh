#!/usr/bin/env zsh
# Capture every scenario/phase at iPhone geometry (402x874 CSS px) through chrome-devtools-axi.
# Usage: from the repo root: zsh condition-demo/screenshots/capture.sh
set -u
X=/Users/johansardar/.local/bin/chrome-devtools-axi
OUT=condition-demo/screenshots
$X open "file://$PWD/condition-demo/index.html" >/dev/null 2>&1; sleep 1.2
$X resize 402 874 >/dev/null 2>&1; sleep 0.6
shot() { # $1 scenario $2 phase $3 local-seconds $4 file [$5 copy mode]
  $X eval "() => { demo.select('$1'); demo.set('copy','${5:-device}'); demo.pause(); return JSON.stringify(demo.jump('$2', $3)) }" 2>/dev/null | sed -n 1p | cut -c1-220
  sleep 0.35
  $X screenshot "$OUT/$4.png" >/dev/null 2>&1 && echo "  -> $4.png"
}
shot walk-state walking 2.2 01-walk-state-1-walking
shot walk-state blocked 0.8 01-walk-state-2-stopped-blocked
shot walk-state blocked 0.8 01-walk-state-2b-blocked-preview-copy preview
# hold interaction: hold = walking at once, release = blocked at once, auto loop resumes after 3 s
$X eval "() => { demo.select('walk-state'); demo.set('copy','device'); demo.pause(); demo.jump('blocked', 1); demo.hold(); return JSON.stringify(demo.tick(0.8)) }" 2>/dev/null | sed -n 1p | cut -c1-220; sleep 0.3; $X screenshot "$OUT/01-walk-state-3-hold-walking.png" >/dev/null 2>&1; echo "  -> hold-walking"
$X eval "() => { demo.release(); return JSON.stringify(demo.tick(0.6)) }" 2>/dev/null | sed -n 1p | cut -c1-220; sleep 0.3; $X screenshot "$OUT/01-walk-state-4-released-blocked.png" >/dev/null 2>&1; echo "  -> released-blocked"
$X eval "() => { return JSON.stringify(demo.tick(3.2)) }" 2>/dev/null | sed -n 1p | cut -c1-220; echo "  (auto loop resumed)"
# treadmill variant
$X eval "() => { demo.select('walk-state'); demo.set('place','treadmill'); demo.pause(); return demo.state().phase }" >/dev/null 2>&1
shot walk-state prop 1.0 01b-walk-state-treadmill-1-prop
shot walk-state scan 1.8 01b-walk-state-treadmill-2-scan
shot walk-state walking 2.5 01b-walk-state-treadmill-3-walking
shot walk-state blocked 0.8 01b-walk-state-treadmill-4-stopped-blocked
$X eval "() => { demo.set('place','outside'); return 1 }" >/dev/null 2>&1
shot walk-steps walking 3.5 02-walk-steps-1-walking
shot walk-steps unlocked 1.2 02-walk-steps-2-unlocked
shot walk-minutes walking 3.5 03-walk-minutes-1-walking
shot walk-minutes unlocked 1.2 03-walk-minutes-2-unlocked
shot gym-arrival approach 2.0 04-gym-arrival-1-approach
shot gym-arrival confirming 1.5 04-gym-arrival-2-confirming
shot gym-arrival unlocked 1.4 04-gym-arrival-3-unlocked
shot gym-arrival leave 1.2 04-gym-arrival-4-leave-still-open
shot gym-minutes approach 2.0 05-gym-minutes-1-approach
shot gym-minutes confirming 1.5 05-gym-minutes-2-confirming
shot gym-minutes counting 3.0 05-gym-minutes-3-counting-unlocked-while-there
shot gym-minutes unlocked 1.2 05-gym-minutes-4-goal-reached
shot gym-minutes leave 1.2 05-gym-minutes-5-leave-still-open
# schedule window variant + desktop review view
$X eval "() => { demo.select('walk-steps'); demo.set('schedule','window'); demo.pause(); return JSON.stringify(demo.jump('walking', 3.5)) }" 2>/dev/null | sed -n 1p | cut -c1-200; sleep 0.3; $X screenshot "$OUT/06-schedule-window-9am-9pm.png" >/dev/null 2>&1; echo "  -> schedule window"
$X eval "() => { demo.set('schedule','allDay'); demo.select('walk-state'); demo.play(); return 1 }" >/dev/null 2>&1
$X resize 1280 900 >/dev/null 2>&1; sleep 0.8
$X eval "() => { demo.pause(); demo.jump('stopped', 1.2); return 1 }" >/dev/null 2>&1; sleep 0.3
$X screenshot "$OUT/00-desktop-review-rail.png" >/dev/null 2>&1; echo "  -> desktop"
$X eval "() => { demo.play(); return 1 }" >/dev/null 2>&1
echo done
