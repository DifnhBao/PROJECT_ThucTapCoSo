#!/usr/bin/env bash
set -euo pipefail
mkdir -p "$1"
for spec in 'gitleaks/gitleaks 8.30.1 gitleaks_8.30.1_linux_x64.tar.gz 551f6fc83ea457d62a0d98237cbad105af8d557003051f41f3e7ca7b3f2470eb' 'rhysd/actionlint 1.7.7 actionlint_1.7.7_linux_amd64.tar.gz 023070a287cd8cccd71515fedc843f1985bf96c436b7effaecce67290e7e0757'; do
  read -r repo version asset digest <<< "$spec"
  curl --fail --silent --show-error --location --retry 2 "https://github.com/$repo/releases/download/v$version/$asset" -o "$1/$asset"
  printf '%s  %s\n' "$digest" "$1/$asset" | sha256sum --check --status
  tar -xzf "$1/$asset" -C "$1"
done
