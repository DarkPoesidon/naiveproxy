#!/usr/bin/env bash
set -Eeuo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
MANAGER_SOURCE="$SCRIPT_DIR/server/naive-server"
MANAGER_TARGET="/usr/local/sbin/naive-server"

if [[ ${EUID:-$(id -u)} -ne 0 ]]; then
  echo "Please run this installer as root:"
  echo "  sudo bash install.sh"
  exit 1
fi

if [[ ! -f "$MANAGER_SOURCE" ]]; then
  echo "Installer file is missing: $MANAGER_SOURCE"
  echo "Download the complete repository and try again."
  exit 1
fi

install -m 0755 "$MANAGER_SOURCE" "$MANAGER_TARGET"

echo
echo "NaiveProxy beginner installer is ready."
echo "The next screen explains every choice before changing your server."
echo
exec "$MANAGER_TARGET" install
