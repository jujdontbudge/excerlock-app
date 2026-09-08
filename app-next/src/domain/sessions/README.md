# Walking sessions

This module owns the timestamp-driven walking-session machine and the renewable fifteen-minute lease.
Adapters provide verified or unverified observations; the machine emits bounded credit intervals and terminal
effects. A lapsed lease cannot be renewed. Product timers are armed through `ClockPort` outside this pure module.
