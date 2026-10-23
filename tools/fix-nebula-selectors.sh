#!/bin/bash
# ---------------------------------------------------------------------------
# fix-nebula-selectors.sh
#
# Reescreve os seletores do tema Nebula que usam o hash do styled-components
# (.Componente___StyledX-sc-<hash>-<index>) para seletores por atributo
# ([class*="Componente___StyledX-sc-"]), que continuam funcionando em qualquer
# build do painel (1.15.0, 1.15.1, 1.15.2, próximos patches).
#
# Não mexe no banco, não mexe no painel: só nos arquivos da extensão.
#
# Uso:
#   bash fix-nebula-selectors.sh            # aplica (idempotente)
#   EXT=nebula bash fix-nebula-selectors.sh # outro identifier
#
# Rode dentro de /var/www/pterodactyl (ou passe PANEL=/caminho).
# ---------------------------------------------------------------------------
set -uo pipefail

EXT="${EXT:-nebula}"
PANEL="${PANEL:-/var/www/pterodactyl}"

cd "$PANEL" || { echo "ERRO: $PANEL não encontrado"; exit 1; }

TARGETS=(
    ".blueprint/extensions/$EXT"
    "resources/views/blueprint/extensions/$EXT"
    "public/extensions/$EXT"
)

echo "==> painel: $PANEL"
echo "==> extensão: $EXT"
echo

command -v python3 > /dev/null || { echo "ERRO: python3 é necessário"; exit 1; }

python3 - "$EXT" <<'PY'
import re, os, sys

ext = sys.argv[1]

# .Componente___StyledX-sc-<hash>-<index>[.<classe-gerada>]  ->  [class*="Componente___StyledX-sc-"]
PAT = re.compile(r'\.([A-Za-z0-9]+___Styled[A-Za-z0-9]+)-sc-[a-z0-9]+-[0-9]+(?:\.[A-Za-z][A-Za-z0-9]{3,8}(?:-d)?)?')

roots = [f'.blueprint/extensions/{ext}',
         f'resources/views/blueprint/extensions/{ext}',
         f'public/extensions/{ext}']

seen = set()
total = files = 0

for root in roots:
    if not os.path.isdir(root):
        continue
    for dirpath, dirnames, filenames in os.walk(root, followlinks=True):
        for name in filenames:
            if not name.endswith(('.css', '.js', '.php')):
                continue
            path = os.path.join(dirpath, name)
            real = os.path.realpath(path)
            if real in seen:          # symlink -> já processado
                continue
            seen.add(real)
            try:
                src = open(real, encoding='utf8', errors='surrogateescape').read()
            except Exception:
                continue
            new, n = PAT.subn(lambda m: f'[class*="{m.group(1)}-sc-"]', src)
            if n:
                open(real, 'w', encoding='utf8', errors='surrogateescape').write(new)
                files += 1
                total += n
                print(f'    {n:4d} seletores  {path}')

print()
if total == 0:
    print('Nada para fazer: nenhum seletor com hash encontrado (já aplicado?).')
else:
    print(f'{total} seletores reescritos em {files} arquivos.')
PY

echo
echo "==> limpando caches do painel"
php artisan view:clear  > /dev/null 2>&1 || true
php artisan config:clear > /dev/null 2>&1 || true
php artisan cache:clear > /dev/null 2>&1 || true
php artisan bp:cache    > /dev/null 2>&1 || true

echo
echo "==> PRONTO."
echo "    No navegador: Ctrl+Shift+R (hard reload) para descartar o CSS em cache."
echo "    Se o CSS não mudar: sudo systemctl restart php8.3-fpm   (ajuste a versão)"
