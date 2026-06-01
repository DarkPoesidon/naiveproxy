# Beginner Server Installation

This repository includes a guided Linux server installer for NaiveProxy. It is
intended for a fresh Debian or Ubuntu VPS and explains each choice before making
changes.

## Before You Start

You need:

1. A Debian 12+ or Ubuntu 22.04+ server with an `x86_64` CPU.
2. Root or `sudo` access.
3. A domain or subdomain you control, such as `notes.example.com`.
4. TCP ports `80` and `443` open in your VPS firewall.
5. Optional UDP port `443` if you later use HTTP/3 or QUIC.

Some VPS providers have a firewall or security-group page in their web
dashboard. The installer cannot change that external firewall for you. It
explains the required rules and can add local `ufw` rules when `ufw` is active.

Create an `A` DNS record before installation:

```text
Type: A
Name: notes
Value: your server IPv4 address
Proxy/CDN mode: DNS only
```

If your DNS provider is Cloudflare, use the gray-cloud **DNS only** mode. The
orange-cloud CDN proxy is not the same as Cloudflare WARP and should not sit in
front of the default NaiveProxy route.

## Run The Wizard

From the repository directory:

```bash
sudo bash install.sh
```

The installer asks for:

1. Your domain.
2. Your TLS certificate email.
3. Generated or custom private proxy credentials.
4. Your normal-looking website mode.
5. Direct, local SOCKS5, or experimental Cloudflare WARP outbound routing.
6. Final confirmation before starting the service.

For a first installation, choose the recommended default whenever you are
unsure.

## Normal-Looking Website

The website is important. Unauthenticated visitors and probes must see an
ordinary HTTPS website. Current NaiveProxy clients also fetch local CSS,
JavaScript, and image assets as browser-like preamble traffic.

The easiest safe choice is:

```text
1. Generate a ready-to-use small website
```

You can later change the site by running:

```bash
sudo naive-server
```

Then choose **Change normal-looking website**.

## Cloudflare WARP Outbound

WARP is optional and experimental. It may change the server IP address seen by
destination websites:

```text
NaiveProxy client -> your VPS -> WARP -> destination website
```

WARP does not hide your VPS inbound IP from users or network observers. Direct
outbound is the recommended stable default.

The manager enables WARP only after its local SOCKS5 endpoint passes a route
check. If WARP requires Cloudflare Zero Trust enrollment, complete that setup
and select Local proxy mode in your Cloudflare device profile before trying
again.

## Manage The Server

Open the menu:

```bash
sudo naive-server
```

Useful direct commands:

```bash
sudo naive-server status
sudo naive-server client
sudo naive-server validate
```

The validation command checks Caddy syntax, service state, DNS, the decoy
website, optional SOCKS5 routing, and an authenticated proxy request.

## Files Installed

```text
/usr/local/sbin/naive-server
/usr/local/bin/caddy-naive
/etc/naiveproxy/Caddyfile
/etc/naiveproxy/installer.env
/etc/systemd/system/naiveproxy-caddy.service
/var/www/naiveproxy/
/var/lib/naiveproxy/backups/
```

The credentials file is readable only by root. Configuration backups are
created before changes. Uninstall preserves the website files and backups.
