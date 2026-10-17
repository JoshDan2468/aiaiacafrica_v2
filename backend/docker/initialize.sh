#!/bin/sh
set -eu
mkdir -p /data/evidence /data/audit /certs
chown 1000:1000 /data/evidence /data/audit
chmod 0700 /data/evidence /data/audit
# Generate only once; never replace a trusted database identity on a normal restart.
if [ ! -f /certs/server.crt ]; then
  umask 077
  openssl req -x509 -newkey rsa:3072 -nodes -days 3650 -keyout /certs/ca.key -out /certs/ca.crt -subj '/CN=AIAIAC database CA'
  openssl req -newkey rsa:3072 -nodes -keyout /certs/server.key -out /certs/server.csr -subj '/CN=postgres'
  printf 'subjectAltName=DNS:postgres\nextendedKeyUsage=serverAuth\n' > /certs/server.ext
  openssl x509 -req -in /certs/server.csr -CA /certs/ca.crt -CAkey /certs/ca.key -CAcreateserial -out /certs/server.crt -days 825 -extfile /certs/server.ext
fi
chown 999:999 /certs/server.key
chmod 0600 /certs/server.key /certs/ca.key
chmod 0644 /certs/ca.crt /certs/server.crt
