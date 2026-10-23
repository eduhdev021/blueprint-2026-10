#!/bin/bash
# ---------------------------------------------------------------------------
# rescue-extension.sh
#
# Remove uma extensão Blueprint que deixou o painel quebrado e restaura a base
# do painel a partir do release.zip do Blueprint 2026-10.
#
# Uso:
#   bash rescue-extension.sh nebula
#   bash rescue-extension.sh            # assume "nebula"
#
# Rode dentro de /var/www/pterodactyl (ou passe o caminho em $PANEL).
# ---------------------------------------------------------------------------
set -uo pipefail

EXT="${1:-nebula}"
PANEL="${PANEL:-/var/www/pterodactyl}"
RELEASE_URL="${RELEASE_URL:-https://github.com/eduhdev021/blueprint-2026-10/releases/latest/download/release.zip}"

CAP="$(printf '%s' "${EXT:0:1}" | tr '[:lower:]' '[:upper:]')${EXT:1}"

cd "$PANEL" || { echo "ERRO: $PANEL não encontrado"; exit 1; }
echo "==> painel: $PANEL"
echo "==> extensão: $EXT (prefixo capitalizado: $CAP)"

# 0. sai da manutenção e limpa lock eventual
echo "==> [0/7] saindo do modo manutenção / limpando lock"
rm -f .blueprint/lockfile .blueprint/.lock 2>/dev/null
php artisan up > /dev/null 2>&1 || true

# 1. tira da lista de extensões ativas
echo "==> [1/7] removendo '$EXT' da lista de extensões ativas"
if [ -f .blueprint/extensions/blueprint/private/db/installed_extensions ]; then
    sed -i "s~|$EXT,~~g" .blueprint/extensions/blueprint/private/db/installed_extensions
fi

# 2. remove diretórios, symlinks, rotas, controllers e assets da extensão
echo "==> [2/7] removendo arquivos e symlinks da extensão"
rm -rf \
    ".blueprint/extensions/$EXT" \
    "resources/scripts/blueprint/extensions/$EXT" \
    "resources/views/blueprint/extensions/$EXT" \
    "app/BlueprintFramework/Extensions/$EXT" \
    "app/Console/Commands/BlueprintFramework/Extensions/$CAP" \
    "app/BlueprintFramework/Schedules/${CAP}Schedules.php" \
    "routes/blueprint/application/$EXT.php" \
    "routes/blueprint/client/$EXT.php" \
    "routes/blueprint/web/$EXT.php" \
    "public/extensions/$EXT" \
    "public/assets/extensions/$EXT" \
    "storage/extensions/$EXT" \
    "storage/.extensions/$EXT" \
    "public/fs/$EXT"

# 3. remove imports de CSS/admin que a extensão tenha adicionado
echo "==> [3/7] limpando imports de css"
rm -f "resources/scripts/blueprint/css/imported/$EXT.css"
sed -i "s~@import url(./imported/$EXT.css);~~g" "resources/scripts/blueprint/css/extensions.css" 2>/dev/null
sed -i "s~@import url(/assets/extensions/$EXT/admin.style.css);~~g" ".blueprint/extensions/blueprint/assets/admin.extensions.css" 2>/dev/null

# 4. symlinks órfãos apontando para a extensão
echo "==> [4/7] removendo symlinks órfãos"
find app resources routes public storage -maxdepth 6 -type l ! -exec test -e {} \; -print -delete 2>/dev/null

# 5. restaura a base (overlay do Blueprint 2026-10 + arquivos do painel 1.15.2 que ele toca)
echo "==> [5/7] restaurando a base a partir do release.zip"
if [ ! -f release.zip ]; then
    echo "    baixando release.zip.."
    wget -q "$RELEASE_URL" -O release.zip || { echo "ERRO: falha no download"; exit 1; }
fi
mkdir -p .rescue-backup
tar czf ".rescue-backup/panel-$(date +%Y%m%d-%H%M%S).tgz" \
    app resources routes public/assets 2>/dev/null || true
unzip -oq release.zip

# 6. rebuild do bundle
echo "==> [6/7] rebuild do bundle (isso demora ~1 min)"
rm -rf node_modules/.cache
yarn run build:production || { echo "ERRO: build falhou — veja a saída acima"; exit 1; }

# 7. caches, permissões e volta ao ar
echo "==> [7/7] caches, permissões e saída da manutenção"
php artisan view:clear      > /dev/null 2>&1 || true
php artisan route:clear     > /dev/null 2>&1 || true
php artisan config:cache    > /dev/null 2>&1 || true
php artisan cache:clear     > /dev/null 2>&1 || true
php artisan bp:cache        > /dev/null 2>&1 || true
php artisan queue:restart   > /dev/null 2>&1 || true
chown -R www-data:www-data . 2>/dev/null || true
php artisan up              > /dev/null 2>&1 || true

echo
echo "==> PRONTO. Extensão '$EXT' removida e base restaurada."
echo
echo "Backup do estado anterior em: .rescue-backup/"
echo "Se quiser, revise arquivos alterados nas últimas 3h que o script não conhecia:"
echo "  find app resources routes public -newermt '-3 hours' -type f \\"
echo "    -not -path '*/node_modules/*' -not -path '*/public/assets/*'"
