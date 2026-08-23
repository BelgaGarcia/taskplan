#!/bin/sh
set -eu
api_url="${TASKPLAN_API_URL:-http://localhost:3000/api}"
release="${TASKPLAN_RELEASE:-local}"
printf 'window.__taskplanConfig = { apiUrl: "%s", release: "%s" };\n' "$api_url" "$release" > /usr/share/nginx/html/assets/runtime-config.js
