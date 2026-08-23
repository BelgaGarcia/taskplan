#!/bin/sh
set -eu
release="${TASKPLAN_RELEASE:-local}"
printf 'window.__taskplanConfig = { apiUrl: "/api", release: "%s" };\n' "$release" > /usr/share/nginx/html/assets/runtime-config.js
