#!/bin/sh
# Entware Manager router UI stability hotfix
# Targets only frontend assets. Does not restart services or change router/firewall config.
set -u

WEB="/opt/web_entware"
ASSET_REF="71e3b702344182f4e0db84808cfdfec105f04bbc"
BASE="https://raw.githubusercontent.com/osmanilcektu/entware-manager/${ASSET_REF}"
STAMP="$(date +%Y%m%d-%H%M%S 2>/dev/null || echo 20260914)"
BACKUP="/opt/backup-entware-ui-${STAMP}"
STAGE="/opt/tmp/entware-ui-hotfix-${STAMP}"
FILES="i18n.js modal.js theme.js lib/utils.js locales/ru.json locales/en.json locales/tr.json"

say() { printf '%s\n' "$*"; }
die() { say "HATA: $*" >&2; exit 1; }

[ -d "$WEB" ] || die "$WEB bulunamadı"
[ -f "$WEB/index.html" ] || die "$WEB/index.html bulunamadı"
command -v curl >/dev/null 2>&1 || die "curl bulunamadı"

mkdir -p "$BACKUP/lib" "$BACKUP/locales" "$STAGE/lib" "$STAGE/locales" || die "geçici dizin oluşturulamadı"
: > "$BACKUP/existed.list"

backup_one() {
    f="$1"
    if [ -f "$WEB/$f" ]; then
        echo "$f" >> "$BACKUP/existed.list"
        mkdir -p "$BACKUP/$(dirname "$f")" || return 1
        cp -p "$WEB/$f" "$BACKUP/$f" || return 1
    fi
}

restore_backup() {
    say "Geri yükleme yapılıyor: $BACKUP"
    for f in index.html $FILES; do
        if grep -Fxq "$f" "$BACKUP/existed.list" 2>/dev/null; then
            mkdir -p "$WEB/$(dirname "$f")" 2>/dev/null
            cp -p "$BACKUP/$f" "$WEB/$f" 2>/dev/null || true
        else
            rm -f "$WEB/$f" 2>/dev/null || true
        fi
    done
    sync 2>/dev/null || true
}

backup_one index.html || die "index.html yedeklenemedi"
for f in $FILES; do
    backup_one "$f" || die "$f yedeklenemedi"
done
printf '%s\n' "$BACKUP" > "$WEB/.last-ui-hotfix-backup"

say "Yedek: $BACKUP"
say "Dosyalar indiriliyor..."
for f in $FILES; do
    mkdir -p "$STAGE/$(dirname "$f")" || { restore_backup; die "stage dizini oluşturulamadı"; }
    curl -fL --connect-timeout 10 --max-time 45 -o "$STAGE/$f" "$BASE/$f" || {
        restore_backup
        die "$f indirilemedi; çalışan dosyalar geri yüklendi"
    }
    [ -s "$STAGE/$f" ] || {
        restore_backup
        die "$f boş geldi; çalışan dosyalar geri yüklendi"
    }
done

grep -q "window.I18n" "$STAGE/i18n.js" || { restore_backup; die "i18n.js doğrulaması başarısız"; }
grep -q "scriptLoadPromises" "$STAGE/lib/utils.js" || { restore_backup; die "utils.js doğrulaması başarısız"; }
grep -q "__ENTWARE_UI_STABILITY_INSTALLED" "$STAGE/theme.js" || { restore_backup; die "theme.js doğrulaması başarısız"; }
grep -q "const Modal" "$STAGE/modal.js" || { restore_backup; die "modal.js doğrulaması başarısız"; }
for f in locales/ru.json locales/en.json locales/tr.json; do
    grep -q '^[[:space:]]*{' "$STAGE/$f" || { restore_backup; die "$f doğrulaması başarısız"; }
done

grep -q '/entware-manager/i18n.js' "$WEB/index.html" || {
    restore_backup
    die "index.html içinde i18n.js etiketi yok; otomatik değişiklik yapılmadı"
}

sed \
    -e 's#theme\.js?v=[^\"]*#theme.js?v=20260914-stable2#g' \
    -e 's#modal\.js?v=[^\"]*#modal.js?v=20260914-stable2#g' \
    -e 's#lib/utils\.js?v=[^\"]*#lib/utils.js?v=20260914-stable2#g' \
    -e 's#i18n\.js?v=[^\"]*#i18n.js?v=20260914-stable2#g' \
    "$WEB/index.html" > "$STAGE/index.html" || {
        restore_backup
        die "index cache anahtarları hazırlanamadı"
    }
[ -s "$STAGE/index.html" ] || { restore_backup; die "yeni index.html boş"; }

say "Dosyalar uygulanıyor..."
for f in $FILES; do
    mkdir -p "$WEB/$(dirname "$f")" || { restore_backup; die "hedef dizin oluşturulamadı"; }
    cp "$STAGE/$f" "$WEB/$f.new" || { restore_backup; die "$f hazırlanamadı"; }
    chmod 0644 "$WEB/$f.new" 2>/dev/null || true
    mv -f "$WEB/$f.new" "$WEB/$f" || { restore_backup; die "$f etkinleştirilemedi"; }
done
cp "$STAGE/index.html" "$WEB/index.html.new" || { restore_backup; die "index hazırlanamadı"; }
chmod 0644 "$WEB/index.html.new" 2>/dev/null || true
mv -f "$WEB/index.html.new" "$WEB/index.html" || { restore_backup; die "index etkinleştirilemedi"; }

sync 2>/dev/null || true
rm -rf "$STAGE"

say ""
say "OK: UI stability hotfix uygulandı."
say "Dil tercihi korunur; servis/firewall ayarlarına dokunulmadı."
say "Geri dönüş yedeği: $BACKUP"
say "Paneli şu adresle aç:"
say "http://192.168.10.1:8087/entware-manager/?clean=${STAMP}"
