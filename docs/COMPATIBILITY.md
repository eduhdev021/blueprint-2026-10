# Blueprint × Pterodactyl 1.15.2 — relatório de compatibilidade

**Versão gerada:** **2026-10**
**Base testada:** Pterodactyl **v1.15.2** (release de 21/10/2026, o `latest` estável)
**Blueprint de origem:** release oficial **beta-2026-08** (14/08/2026) — `BlueprintFramework/framework`
**Resultado:** overlay re-portado para a base do 1.15.2 e versionado como `2026-10` → `blueprint-2026-10.zip`

**Publicado em:** https://github.com/eduhdev021/blueprint-2026-10 — release `2026-10` com `release.zip` anexado
(`https://github.com/eduhdev021/blueprint-2026-10/releases/latest/download/release.zip`)

---

## 1. O diagnóstico (por que o release oficial não servia)

O `release.zip` do Blueprint não aplica patches no painel: ele **sobrescreve** os arquivos com cópias
editadas. O problema é que essas cópias foram tiradas de versões antigas do Pterodactyl (algumas de
**v1.9**, **v1.12**, **v1.13**). Instalar o release oficial num painel 1.15.2 **rebaixa** o painel.

| Arquivo do painel | Base usada pelo Blueprint | O que se perdia ao instalar |
|---|---|---|
| `app/Http/Kernel.php` | v1.12.0 | **`SetSecurityHeaders`** — middleware global de headers de segurança (CSP/X-Frame-Options), adicionado no painel em fev/2026. *Regressão de segurança.* |
| `app/Transformers/Api/Client/ServerTransformer.php` | v1.12.0 | Suporte a `new_server_identifiers` + campos `server_identifier` e `__deprecated_uuid_short` |
| `resources/scripts/api/server/getServer.ts` | ~v1.12.0 | Os mesmos campos no front (`Identifier<'serv'>`, `identifier`, `__deprecatedUuidShort`) |
| `resources/scripts/components/server/console/Console.tsx` | v1.12.0 | Addon **Unicode11** do xterm (largura correta de emoji/caracteres especiais) |
| `resources/scripts/components/dashboard/ServerRow.tsx` | v1.12.4 | Estado **"Under Maintenance"** por nó + badge amarelo |
| `resources/scripts/components/server/files/FileEditContainer.tsx` | v1.13.0 | **Rascunho automático** de arquivo novo (sessionStorage) e o tratamento de erro com `httpErrorToHuman` |
| `resources/scripts/components/dashboard/DashboardContainer.tsx` | v1.12.0 | Reset de página ao alternar "mostrar servidores de outros" |
| `resources/scripts/routers/ServerRouter.tsx` | v1.9.0 | **`PermissionRoute`, `ErrorBoundary`, `ConflictStateRenderer`, `TransitionRouter`, `Can`** e o link de admin do servidor — o roteamento inteiro era substituído |
| `resources/scripts/routers/DashboardRouter.tsx` | v1.12.x | Idem (404, Suspense, rotas de conta) |
| `package.json` + `yarn.lock` | v1.12.0 | **Downgrade de dependências**: i18next 25→21, react-i18next 16→11, styled-components ^5.3→5.2.1, babel-loader 10→8, css-loader 7→5, postcss-loader 8→5, style-loader 4→2, tailwind 3.0.24 fixo, e remoção do `xterm-addon-unicode11` |
| `webpack.config.js` | ~v1.4 | Config antiga: sem `namedExport`/`exportLocalsConvention` no css-loader (obrigatório no css-loader 7), `stats` diferente |
| `tsconfig.json` | v1.12.0 | `"jsx": "react-jsx"` → `"react"` |
| `.eslintrc.js` | v1.11.11 | Prettier desligado e regra `react/no-unknown-property` removida |

Além disso, o zip sobrescrevia `README.md`, `LICENSE.md`, `SECURITY.md` e `CODE_OF_CONDUCT.md` do painel.

> Nota importante: a **v1.15.2 não mudou nenhum arquivo do painel** em relação à v1.15.1 — ela é uma
> release de segurança (CVE-2026-109618/109619, "php2shell") que mexe só em Dockerfile/PHP. Ou seja:
> o problema nunca foi "o 1.15.2 é novo demais", e sim o overlay do Blueprint estar desatualizado.

---

## 2. O que foi feito

Rebase arquivo por arquivo: **base = arquivo original do 1.15.2**, e o Blueprint entra só com as suas
adições (imports, componentes, `id`s, aliases).

### Backend
- `app/Http/Kernel.php` — `SetSecurityHeaders` **preservado**; grupos de middleware do Blueprint (`blueprint`, `blueprint/api`, `blueprint/application-api`, `blueprint/client-api`) adicionados.
- `ServerTransformer.php` — lógica de `new_server_identifiers` **preservada**; campo `BlueprintFramework.egg_id` adicionado no fim do array.

### Frontend
- `getServer.ts` — tipos/identificadores atuais preservados + `BlueprintFramework: { eggId }`.
- `Console.tsx`, `ServerRow.tsx`, `FileEditContainer.tsx`, `DashboardContainer.tsx` — arquivos do 1.15.2 + os componentes de injeção do Blueprint (`CommandRow`, `BeforeEntryName`…, `BeforeEdit/AfterEdit`, `Before/AfterContent`).
- **Routers (mudança de arquitetura):** o Blueprint não substitui mais o roteamento. Os componentes
  `@blueprint/extends/routers/{ServerRouter,DashboardRouter}.tsx` passam a exportar
  `BlueprintServerLinks` / `BlueprintServerRoutes` / `BlueprintAccountLinks` / `BlueprintAccountRoutes`,
  que são renderizados **dentro** do `Switch` e da `SubNavigation` originais do painel. Resultado:
  `PermissionRoute`, `ErrorBoundary`, `ConflictStateRenderer` e o link de admin continuam funcionando,
  e as rotas de extensões continuam sendo injetadas normalmente (`routes.ts` segue sendo gerado pelo `blueprint -install`).

### Build/config
- `package.json`, `yarn.lock`, `.eslintrc.js` → **restaurados aos do 1.15.2** (nenhum downgrade).
- `webpack.config.js` → original do 1.15.2 + apenas o que o Blueprint precisa: alias `@blueprint`,
  `symlinks: true` (extensões instaladas como symlink), `cacheDirectory` no babel e o `BuildCachePlugin`.
- `tsconfig.json` → original + path `@blueprint/*` (mantendo `"jsx": "react-jsx"`).

### Ferramenta
- `blueprint.sh`: novas funções `panelversion()` e `checkpanelcompat()`. A instalação agora
  - **aborta** em Pterodactyl **2.x** (com mensagem explicando o porquê);
  - avisa quando o painel é mais antigo que 1.11.0 ou mais novo que 1.15.2;
  - confirma "Pterodactyl 1.15.2 is supported by this Blueprint build".
- `blueprint -info` agora mostra a linha `Pterodactyl: <versão>`.
- O overlay não sobrescreve mais README/LICENSE/SECURITY/CODE_OF_CONDUCT do painel.

---

## 3. Verificação (executada, não "no papel")

| Checagem | Resultado |
|---|---|
| Parser PHP nos 44 arquivos `.php` do overlay | **0 erros** |
| Sintaxe (esbuild) nos 94 arquivos `.ts/.tsx` do overlay | **0 erros** |
| Resolução de todos os imports internos (`@/…`, `@blueprint/…`) | **0 imports quebrados** |
| `bash -n blueprint.sh` + testes das 6 faixas de versão | OK (2.x aborta, 1.15.2 libera) |
| `tsc --noEmit` painel 1.15.2 **+ overlay** | 12 erros — **todos TS7006 pré-existentes** |
| `tsc --noEmit` painel 1.15.2 **limpo** (controle) | 12 erros — **os mesmos 12** → overlay não introduz nenhum erro de tipo |
| `webpack --mode production` — build de produção do painel **com o overlay aplicado** | **`webpack 5.105.2 compiled successfully in 48370 ms`** — 2,57 MiB de JS, `manifest.json` e `.build-cache.json` gerados |
| Hooks do Blueprint presentes no bundle final | `BlueprintFramework` (3×), `extensions/blueprint/eggs` (1×), `SubNavigation` (4×) — as injeções realmente entraram no build |

---

## 3.1 Bateria de testes da versão 2026-10 (executada em 23/10/2026)

Ambiente: painel **v1.15.2** limpo (`git clone --branch v1.15.2`) + overlay `2026-10`, Node 20 (o painel
pede 22), dependências instaladas via `npm install --legacy-peer-deps` (1.300 pacotes).

| # | Teste | Resultado |
|---|---|---|
| 1 | Parser PHP nos arquivos do overlay | **0 erros** (43 arquivos) |
| 2 | esbuild (sintaxe TS/TSX) | **0 erros** (94 arquivos) |
| 3 | Resolução de todos os imports internos | **0 quebrados** |
| 4 | `tsc --noEmit` — overlay vs painel limpo | **8 assinaturas de erro em ambos, conjuntos idênticos** → 0 introduzidos, 0 removidos |
| 5 | `webpack --mode production` | **`compiled successfully in 36237 ms`**, 17 chunks, 2,57 MiB de JS |
| 6 | Hooks do Blueprint no bundle final | `BlueprintFramework`, `extensions/blueprint/eggs` e `SubNavigation` presentes |
| 7 | Instalação simulada (`BLUEPRINT_ENVIRONMENT=ci`, stubs de `php`/`yarn`/`node 22`) | instalador **completa com SUCCESS**, marca `is_installed`, troca o placeholder `NOTINSTALLED→INSTALLED`, cria os 3 symlinks (`public/extensions/blueprint`, `public/assets/extensions/blueprint`, `.blueprint/lib`), copia o logo e chama `php artisan storage:link` + `queue:restart` |
| 8 | Mensagem de compatibilidade durante a instalação | `INFO: Pterodactyl 1.15.2 is supported by this Blueprint build.` |
| 9 | `blueprint -version` | `2026-10` |
| 10 | `blueprint -info` | `Version: 2026-10` · `Pterodactyl: 1.15.2` · `Extensions: 0` |
| 11 | Checagem de versão nas 6 faixas | 1.15.2 ✅ · 1.15.1 ✅ · 1.10.4 ⚠️ · 1.16.0 ⚠️ · **2.0.0-beta.2 ❌ aborta** · canary ⚠️ |
| 12 | Empacotamento | `zip` gera 412 arquivos / 4,5 MB, sem arquivos de desenvolvimento |

O que **não** dá pra testar aqui (sem PHP, sem MySQL, sem Wings): migrations + seeder reais,
`/admin/extensions` no navegador e o fluxo `blueprint -install` de uma extensão `.blueprint` de verdade.
Para isso, rode a CI do repositório (`.github/workflows/validate.yaml`) ou teste em staging.

---

## 4. Como aplicar

**Opção A — zip pronto (recomendado), painel já instalado:**

```bash
cd /var/www/pterodactyl
unzip -o blueprint-2026-10.zip             # envie o zip para o servidor antes
chmod +x blueprint.sh && bash blueprint.sh
```

**Opção C — direto do seu fork no GitHub (depois do push):**

```bash
cd /var/www/pterodactyl
wget "$(curl -s https://api.github.com/repos/SEU-USUARIO/SEU-REPO/releases/latest \
  | grep browser_download_url | grep release.zip | cut -d '\"' -f 4)" -O release.zip
unzip -o release.zip && chmod +x blueprint.sh && bash blueprint.sh
```

**Opção B — patch por cima de uma instalação Blueprint existente:**

```bash
cd /var/www/pterodactyl
patch -p1 -d . < blueprint-1.15.2.patch
yarn install && yarn run build:production
php artisan view:clear && php artisan config:cache && php artisan bp:cache
```

**Se você vai reinstalar do zero num painel 1.15.2**, use o zip compatível em vez do
`release.zip` oficial — o instalador é exatamente o mesmo (`bash blueprint.sh`).

---

## 5. Limitações e avisos

- **Pterodactyl 2.0.0-beta.x não é suportado.** É um rewrite completo (Laravel 13, Vite no lugar do
  webpack, frontend novo, 1.474 arquivos alterados). Portar o Blueprint para 2.x é um projeto à parte,
  não um patch. A checagem nova aborta a instalação nesses painéis em vez de corromper o panel.
- **`blueprint -upgrade` desfaz este rebase**: o updater faz `cp -r .update/repo/* .` com o release
  oficial. Para manter o rebase, aponte o upgrade para um fork seu:
  `blueprint -upgrade seu-usuario/framework 1.15.2-compat`.
- Validado por build limpo (`tsc` + `webpack`) e por análise estática — **não** foi testado num painel
  em produção com banco real, Wings e extensões instaladas. Antes de produção: tire snapshot e
  rode `php artisan bp:cache` depois do build.
- A validação foi feita no ambiente da sessão: Node **20** (o painel pede 22), `npm install` no lugar
  do `yarn`, sem PHP/Composer (por isso o backend foi checado por parser, não por `php -l`). O build
  passou mesmo assim; no seu servidor com Node 22 + `yarn install` o caminho é o oficial.
- Extensões que dependiam dos nomes antigos dos exports dos routers (`NavigationLinks`/`NavigationRouter`)
  precisariam de ajuste — na prática nenhuma usa isso, o `blueprint -install` só escreve em `routes.ts`.

---

## 6. Arquivos entregues

| Arquivo | O que é |
|---|---|
| `blueprint-2026-10.zip` | Release **2026-10** pronto pra instalar (412 arquivos, 4,5 MB) |
| `framework-repo/` | Repositório git já com commit + tag `2026-10`, pronto pra `git push` |
| `blueprint-2026-10.bundle` | Bundle git (push offline, sem depender do workspace) |
| `patch/blueprint-1.15.2.patch` | Diff completo (oficial → compatível), 22 arquivos |
| `blueprint-compat/` | A árvore aberta, para inspecionar/diffar |
| `tools/node/validate.mjs`, `tools/node/phpcheck.mjs` | Scripts de validação usados |
| `work/` | Scripts de rebase (`rebase_*.py`) e `sim_install.sh` (teste do instalador) |
