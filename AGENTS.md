stay fully local on main directly (no worktrees) for this project.

don't overengineer, it's a single-person low-use non-critical application. don't skimp on tests or modularity, but adjust the level of _detailed_ planning and double-checking appropriately.

Visual mockups and diagrams are welcome; do not ask for permission before using them. The browser-based visual companion must run on the host, outside the workspace sandbox: launch its server with escalated permissions as a long-running foreground process, bind it to `0.0.0.0`, and keep the displayed URL on `localhost`. A server launched inside the sandbox is unreachable even with the same bind address.
