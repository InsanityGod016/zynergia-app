#!/usr/bin/env bash

# Resolve the Google Play upload key from Codemagic's existing secret groups.
# This script intentionally prints only the matching variable names and alias;
# keystore bytes and passwords never leave the process environment.

expected_sha1='D4:36:FC:6F:1F:A3:02:6C:CE:FE:ED:F9:52:CC:14:0F:AD:6D:BB:02'
expected_sha256='FC:E3:53:CE:FC:CF:E9:B0:F4:35:EA:6B:95:30:5B:A5:B7:F3:3A:D1:B8:F9:99:49:60:C5:F7:6E:A7:91:64:C6'
resolved_keystore='/tmp/zynergia-upload.keystore'

keystore_variables=(
  ANDROID_ACTIVE_UPLOAD_KEYSTORE
  ANDROID_PLAY_UPLOAD_KEYSTORE
  ANDROID_PLAY_UPLOAD_KEYSTORE_ANDROID
  ANDROID_RESET_KEYSTORE
  ANDROID_NEW_KEYSTORE
  ANDROID_KEYSTORE
)

password_variables=(
  ANDROID_ACTIVE_UPLOAD_KEYSTORE_PASSWORD
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
