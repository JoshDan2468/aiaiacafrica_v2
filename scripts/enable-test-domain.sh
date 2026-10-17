#!/usr/bin/env bash
set -euo pipefail
domain=api-test.aiaiacafrica.com
directory=/opt/aiaiac-staging
if ! dig +short A "$domain" | grep -qx '162.35.8.152'; then
  echo 'Add api-test.aiaiacafrica.com A record pointing to 162.35.8.152 first.' >&2
  exit 1
fi
sudo -n certbot certonly --webroot -w /var/www/letsencrypt -d "$domain" \
  --non-interactive --agree-tos --register-unsafely-without-email
sudo -n install -m 644 "$directory/nginx-test-api.conf" /etc/nginx/sites-available/aiaiac-test
sudo -n nginx -t
sudo -n systemctl reload nginx
curl --fail --silent --show-error "https://$domain/api/ready" |
  python3 -c 'import json,sys; d=json.load(sys.stdin); assert d.get("success") and d.get("database")=="connected"; print("Test API HTTPS ready")'
