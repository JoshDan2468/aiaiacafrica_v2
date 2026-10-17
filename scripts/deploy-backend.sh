#!/usr/bin/env bash
set -euo pipefail
environment=${1:?environment required}
directory=${2:?directory required}
release=${3:?release required}
image=${4:?digest required}
readiness=${5:?readiness URL required}
[[ "$environment" == test || "$environment" == production ]]
[[ "$image" =~ ^docker.io/[a-z0-9_-]+/[a-z0-9._-]+@sha256:[a-f0-9]{64}$ ]]
[[ "$readiness" =~ ^https://[a-zA-Z0-9.-]+/api/ready$ ]]
case "$environment:$directory" in
  test:/opt/aiaiac-staging|test:/opt/aiaiac-test|production:/opt/aiaiac-production) ;;
  *) echo 'Environment/directory mismatch' >&2; exit 1 ;;
esac
[[ "$release" == "$directory/releases/"* ]]
cd "$directory"
test -f .env && test -f deploy/backend.env && test -f "$release/compose.yaml"
exec 9>.deploy.lock
flock -n 9 || { echo 'Another deployment is running' >&2; exit 1; }
docker_cmd=(docker)
if ! docker info >/dev/null 2>&1; then
  docker_cmd=(sudo -n env "BACKEND_IMAGE_REF=$image" docker)
fi
"${docker_cmd[@]}" info >/dev/null
unset COMPOSE_FILE COMPOSE_PROJECT_NAME
export BACKEND_IMAGE_REF="$image"
compose=("${docker_cmd[@]}" compose --project-directory "$directory" --env-file "$directory/.env" -f "$release/compose.yaml")
"${compose[@]}" config --quiet
# Inspect rendered configuration without printing provider or database credentials.
profile=$("${compose[@]}" config --format json | python3 -c '
import json,sys
d=json.load(sys.stdin); b=d["services"]["backend"]; p=b["ports"][0]
assert p.get("host_ip")=="127.0.0.1", "API must remain loopback-only"
print(d["name"],p["published"],b["environment"].get("NODE_ENV","development"))
')
read -r project port node_env <<< "$profile"
case "$environment:$project" in
  test:aiaiac-staging|test:aiaiac-test|production:aiaiac-production) ;;
  *) echo 'Set the matching COMPOSE_PROJECT_NAME in server .env' >&2; exit 1 ;;
esac
if [[ "$environment" == production ]]; then
  [[ "$node_env" == production ]] || { echo 'Production requires NODE_ENV=production' >&2; exit 1; }
  [[ "$port" == 5001 ]] || { echo 'Production requires separate loopback port 5001' >&2; exit 1; }
else
  [[ "$port" == 5000 ]] || { echo 'Test requires loopback port 5000' >&2; exit 1; }
fi
mkdir -p backups
chmod 700 backups
stamp=$(date -u +%Y%m%dT%H%M%SZ)
if "${compose[@]}" ps --status running --services | grep -qx postgres; then
  backup="backups/$stamp.sql.gz"
  umask 077
  "${compose[@]}" exec -T postgres pg_dump -U aiaiac -d aiaiac | gzip > "$backup"
  gzip -t "$backup"
elif [[ "$environment" == production ]]; then
  echo 'Provision production and its baseline backup before CI deployment' >&2
  exit 1
fi
cp compose.yaml "$release/previous-compose.yaml"
cp .env "$release/previous.env"
chmod 600 "$release/previous.env"
"${compose[@]}" pull
"${compose[@]}" up -d --no-build --wait --wait-timeout 900
container=$("${compose[@]}" ps -q backend)
expected=$("${docker_cmd[@]}" image inspect "$image" --format '{{.Id}}')
actual=$("${docker_cmd[@]}" inspect "$container" --format '{{.Image}}')
[[ "$expected" == "$actual" ]]
check_ready() {
  curl --fail --silent --show-error --retry 5 --retry-delay 3 --retry-all-errors --max-time 20 "$1" |
    python3 -c 'import json,sys; d=json.load(sys.stdin); assert d.get("success") is True and d.get("database")=="connected", d'
}
check_ready "http://127.0.0.1:$port/api/ready"
check_ready "$readiness"
# Save release only after health succeeds. Never automatically reverse migrations.
cp "$release/compose.yaml" compose.yaml
env_tmp=$(mktemp "$directory/.env.XXXXXX")
grep -v '^BACKEND_IMAGE_REF=' .env > "$env_tmp" || true
printf '\nBACKEND_IMAGE_REF=%s\n' "$image" >> "$env_tmp"
chmod 600 "$env_tmp"
mv "$env_tmp" .env
printf '%s\n' "$image" > deployed-image.txt
echo "Deployment verified: $environment $image"
