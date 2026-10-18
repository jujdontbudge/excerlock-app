#!/bin/zsh
set -eu
setopt extendedglob
umask 077
script_path=${1:A}
marker=${2:?Use a unique completion marker}
[[ "$marker" == [A-Za-z0-9_-]## ]] || { print -u2 'Unsafe marker'; exit 1; }
[[ -f "$script_path" ]] || { print -u2 'Script missing'; exit 1; }
tmux has-session -t gui
pane=$(tmux display-message -p -t gui '#{pane_id}')
command_name=$(tmux display-message -p -t "$pane" '#{pane_current_command}')
[[ "$command_name" == zsh || "$command_name" == bash ]] || { print -u2 'GUI pane is busy; refusing to send commands'; exit 1; }
command_text="/bin/zsh ${(q)script_path} > ~/device-test/gui-${marker}.log 2>&1; print DONE-${marker} >> ~/device-test/gui-done.txt"
tmux send-keys -t "$pane" -l "$command_text"
tmux send-keys -t "$pane" Enter
