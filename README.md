# NaiveProxy Server Installer

Beginner-friendly Linux server installer for a private NaiveProxy server with a
normal-looking HTTPS website.

The guided CLI explains every question before changing your server. It installs
the Naive-enabled Caddy server, creates a realistic decoy website, configures a
systemd service, validates the result, and prints your client configuration.

## Requirements

- Debian 12+ or Ubuntu 22.04+ VPS with an `x86_64` CPU
- Root or `sudo` access
- A domain or subdomain you control
- Inbound TCP ports `80` and `443`
- Optional inbound UDP port `443` for QUIC / HTTP/3

## Step 1: Create Your DNS Record

Before installing, open your DNS provider and create an `A` record:

```text
Type: A
Name: notes
Value: your server IPv4 address
Proxy/CDN mode: DNS only
```

For example, if your domain is `example.com`, the result can be
`notes.example.com`.

If you use Cloudflare DNS, select the gray-cloud **DNS only** mode. Do not enable
the orange-cloud CDN proxy for the NaiveProxy domain.

## Step 2: Run The Installer

Connect to your VPS with SSH and paste:

```bash
sudo apt-get update
sudo apt-get install -y git
git clone --depth 1 https://github.com/DarkPoesidon/naiveproxy.git
cd naiveproxy
sudo bash install.sh
```

The wizard explains each step. For your first installation, accept the
recommended default whenever you are unsure.

## Recommended Answers

```text
Generate a strong username and password automatically?  Yes
Website mode:                                          1
Outbound mode:                                         1
Allow optional UDP port 443?                           Yes
```

Website mode `1` generates an immediately usable multi-asset decoy website.
Outbound mode `1` uses the stable direct route.

## Manage The Server

Open the interactive menu at any time:

```bash
sudo naive-server
```

Useful direct commands:

```bash
sudo naive-server status
sudo naive-server client
sudo naive-server validate
```

The menu can rotate credentials, change the decoy website, change outbound
routing, test the server, show logs, update Caddy, and uninstall the service.

## Naive Breeze Desktop Client

`clients/desktop` contains the guided GUI client for Windows. It imports the
`naive+https://...` link printed by the server installer, downloads the official
NaiveProxy engine on first connection, and can enable the Windows system proxy
without asking the user to edit configuration files.

Development and packaging commands are documented in
[`clients/desktop/README.md`](clients/desktop/README.md).

## Optional WARP Outbound

Cloudflare WARP outbound is available as an experimental menu option. It may
change the IP address seen by destination websites:

```text
NaiveProxy client -> your VPS -> WARP -> destination website
```

WARP does not hide your VPS inbound IP from users or network observers. Direct
outbound remains the recommended stable default. The manager keeps direct
outbound when its WARP SOCKS5 route check fails.

## Complete Guide

Read [docs/SERVER_INSTALL.md](docs/SERVER_INSTALL.md) for the full beginner
guide, installed file locations, firewall notes, and WARP details.

## Upstream Projects

This installer uses:

- [klzgrad/naiveproxy](https://github.com/klzgrad/naiveproxy)
- [klzgrad/forwardproxy](https://github.com/klzgrad/forwardproxy)
