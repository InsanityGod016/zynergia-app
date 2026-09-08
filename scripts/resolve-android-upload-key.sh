#!/usr/bin/env bash

# Resolve the Google Play upload key from Codemagic's existing secret groups.
# This script intentionally prints only the matching variable names and alias;
# keystore bytes and passwords never leave the process environment.

expected_sha1='1A:27:A7:5C:C3:40:56:EA:A6:C9:C7:87:DA:D9:9A:52:77:44:3F:E5'
expected_sha256='E3:06:AF:9A:30:99:7C:C3:FE:47:30:5B:9E:16:9E:C9:A0:DA:89:B8:5F:29:61:DC:C1:A4:62:6F:F1:1A:CD:BA'
resolved_keystore='/tmp/zynergia-upload.keystore'

keystore_variables=(
  ANDROID_PLAY_UPLOAD_KEYSTORE
  ANDROID_PLAY_UPLOAD_KEYSTORE_ANDROID
  ANDROID_RESET_KEYSTORE
  ANDROID_NEW_KEYSTORE
  ANDROID_KEYSTORE
)

password_variables=(
  ANDROID_KEYSTORE_PASSWORD
  ANDROID_KEY_PASSWORD
  ANDROID_NEW_PASSWORD
)

rm -f "$resolved_keystore" /tmp/zynergia-candidate-*.keystore /tmp/zynergia-candidate.pem

for keystore_variable in "${keystore_variables[@]}"; do
  encoded_keystore="${!keystore_variable-}"
  [ -n "$encoded_keystore" ] || continue

  candidate_file="/tmp/zynergia-candidate-${keystore_variable}.keystore"
  if ! printf '%s' "$encoded_keystore" | base64 --decode > "$candidate_file" 2>/dev/null; then
    rm -f "$candidate_file"
    continue
  fi
  chmod 600 "$candidate_file"

  for password_variable in "${password_variables[@]}"; do
    candidate_password="${!password_variable-}"
    [ -n "$candidate_password" ] || continue

    listing=$(keytool -list -keystore "$candidate_file" -storepass "$candidate_password" 2>/dev/null) || continue
    aliases=$(printf '%s\n' "$listing" | awk -F, '/PrivateKeyEntry/{sub(/^[[:space:]]+/, "", $1); print $1}')

    configured_alias="${ANDROID_KEY_ALIAS-}"
    if [ -n "$configured_alias" ]; then
      aliases=$(printf '%s\n%s\n' "$configured_alias" "$aliases" | awk 'NF && !seen[$0]++')
    fi

    while IFS= read -r candidate_alias; do
      [ -n "$candidate_alias" ] || continue
      if ! keytool -exportcert -rfc \
        -keystore "$candidate_file" \
        -storepass "$candidate_password" \
        -alias "$candidate_alias" > /tmp/zynergia-candidate.pem 2>/dev/null; then
        continue
      fi

      actual_sha1=$(openssl x509 -in /tmp/zynergia-candidate.pem -noout -fingerprint -sha1 | cut -d= -f2)
      actual_sha256=$(openssl x509 -in /tmp/zynergia-candidate.pem -noout -fingerprint -sha256 | cut -d= -f2)

      if [ "$actual_sha1" = "$expected_sha1" ] && [ "$actual_sha256" = "$expected_sha256" ]; then
        cp "$candidate_file" "$resolved_keystore"
        chmod 600 "$resolved_keystore"
        export ANDROID_RESOLVED_KEYSTORE="$resolved_keystore"
        export ANDROID_RESOLVED_KEYSTORE_PASSWORD="$candidate_password"
        export ANDROID_RESOLVED_KEY_ALIAS="$candidate_alias"
        rm -f /tmp/zynergia-candidate-*.keystore /tmp/zynergia-candidate.pem
        echo "Android upload key verified from ${keystore_variable}/${password_variable} (alias: ${candidate_alias})."
        return 0 2>/dev/null || exit 0
      fi
    done <<< "$aliases"
  done
done

rm -f /tmp/zynergia-candidate-*.keystore /tmp/zynergia-candidate.pem
echo "No configured Codemagic keystore/password pair matches the active Google Play upload certificate."
return 1 2>/dev/null || exit 1
