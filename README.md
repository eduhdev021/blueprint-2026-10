# Blueprint 2026-10 — re-base para Pterodactyl 1.15.2

Este repositório é um **fork de distribuição** do [Blueprint Framework](https://github.com/BlueprintFramework/framework)
com o overlay re-portado para a base do **Pterodactyl v1.15.2**.

Ele existe porque o release oficial `beta-2026-08` sobrescreve arquivos do painel com cópias de
versões antigas (v1.9 a v1.13) e, num painel 1.15.2, isso **rebaixa** recursos e remove o middleware
`SetSecurityHeaders`. O diagnóstico completo está em [`COMPATIBILITY.md`](COMPATIBILITY.md).

## Compatibilidade

| Pterodactyl | Situação |
|---|---|
| 1.15.2 | ✅ versão-alvo, testada (build de produção) |
| 1.15.0 – 1.15.1 | ✅ mesma base de código do frontend |
| 1.11.0 – 1.14.x | ⚠️ funciona, mas sem garantia |
| < 1.11.0 | ⚠️ aviso do instalador, não recomendado |
| 2.0.0-beta.x | ❌ aborta a instalação (rewrite completo: Laravel 13, Vite, frontend novo) |

## Instalar

Baixe o `release.zip` da [última release](../../releases/latest) e siga o guia normal:

```bash
cd /var/www/pterodactyl
wget <url-do-release.zip> -O release.zip
unzip -o release.zip
chmod +x blueprint.sh && bash blueprint.sh
```

## Atualizar (upgrade)

Como este fork é servido por `blueprint -upgrade`, aponte o updater para cá:

```bash
blueprint -upgrade <owner>/<repo> <branch>
```

O `-upgrade` do Blueprint faz `cp -r .update/repo/* .` — por isso a **raiz deste repositório é
exatamente o conteúdo do `release.zip`**, e não a árvore de desenvolvimento do projeto original.

## Estrutura

```
app/             backend que se sobrepõe ao do painel (BlueprintFramework, controllers, transformers)
blueprint/       dist/assets/extensões do framework
database/        migrations e seeders do Blueprint
resources/       frontend (React/TS) + views Blade que se sobrepõem ao painel
routes/          rotas do Blueprint
scripts/         CLI (comandos, libs, updater) usada pelo blueprint.sh
blueprint.sh     instalador + CLI
.github/         CI (não é copiado para o painel pelo updater)
```

## Build local

```bash
# validação estática (PHP + TS)
node tools/validate.mjs
node tools/phpcheck.mjs $(find . -name '*.php')

# build de produção do painel com este overlay
git clone --depth 1 --branch v1.15.2 https://github.com/pterodactyl/panel.git /tmp/panel
cp -a . /tmp/panel/
cd /tmp/panel && yarn install && yarn run build:production
```

## Licença e créditos

Bluepr​int Framework © 2023-2026 Emma ([prpl.wtf](https://prpl.wtf)) e contribuidores — veja
[`LICENSE.md`](LICENSE.md) do projeto original. Este fork apenas reaplica o mesmo código sobre uma
base mais nova do painel. Considere [doar para o projeto](https://hcb.hackclub.com/blueprint/donations).
