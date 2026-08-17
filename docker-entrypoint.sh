#!/bin/sh
set -eu
api_url="${TASKPLAN_API_URL:-http://localhost:3000/api}"
printf '{ "apiUrl": "%s" }\n' "$api_url" > /usr/share/nginx/html/assets/runtime-config.json