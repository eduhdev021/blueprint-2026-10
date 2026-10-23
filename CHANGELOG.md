# Changelog

## 2026-10

Re-base do overlay para o Pterodactyl **1.15.2** (base anterior: arquivos entre v1.9 e v1.13).

### Corrigido

- `app/Http/Kernel.php`: o middleware global **`SetSecurityHeaders`** não é mais removido pelo overlay
  (regressão de segurança herdada do release `beta-2026-08`).
- `app/Transformers/Api/Client/ServerTransformer.php` e `resources/scripts/api/server/getServer.ts`:
  preservado o suporte a `new_server_identifiers` (`identifier`, `server_identifier`,
  `__deprecated_uuid_short`, `Identifier<'serv'>`). O campo `BlueprintFramework.egg_id` foi mantido,
  adicionado ao final do payload.
- `ServerRouter.tsx` / `DashboardRouter.tsx`: o Blueprint **não substitui mais** o roteamento do painel.
  `PermissionRoute`, `ErrorBoundary`, `ConflictStateRenderer`, `TransitionRouter` e o link de admin do
  servidor voltaram a funcionar. As rotas e links das extensões são injetados dentro do `Switch` e da
  `SubNavigation` originais.
- `Console.tsx`: addon `xterm-addon-unicode11` preservado (largura de emoji/caracteres especiais).
- `ServerRow.tsx`: estado "Under Maintenance" por nó preservado.
- `FileEditContainer.tsx`: rascunho automático de arquivo novo (sessionStorage) e tratamento de erro
  com `httpErrorToHuman` preservados.
- `DashboardContainer.tsx`: reset de paginação ao alternar "mostrar servidores de outros" preservado.
- `package.json` / `yarn.lock` / `.eslintrc.js`: **sem downgrade**. Restaurados aos do painel
  (i18next 25, react-i18next 16, styled-components ^5.3, css-loader 7, babel-loader 10, postcss 8.5…).
- `webpack.config.js`: base do painel + alias `@blueprint`, `symlinks: true`, `cacheDirectory` e
  `BuildCachePlugin`.
- `tsconfig.json`: base do painel (`"jsx": "react-jsx"`) + path `@blueprint/*`.
- O overlay não sobrescreve mais `README.md`, `LICENSE.md`, `SECURITY.md` e `CODE_OF_CONDUCT.md` do painel.

### Adicionado

- `blueprint.sh`: funções `panelversion()` e `checkpanelcompat()`.
  - aborta em Pterodactyl 2.x com mensagem explicativa;
  - avisa fora da faixa 1.11.0 – 1.15.2;
  - confirma a versão detectada durante a instalação.
- `blueprint -info`: nova linha `Pterodactyl: <versão>`.
- `resources/scripts/blueprint/extends/routers/*`: exports `BlueprintServerLinks`, `BlueprintServerRoutes`,
  `BlueprintAccountLinks`, `BlueprintAccountRoutes` (substituem `NavigationLinks` / `NavigationRouter`).
- CI (`.github/workflows/validate.yaml`): parser PHP, checagem TS/imports, `tsc --noEmit` comparado com
  o painel limpo e build de produção com webpack.

### Verificado

- Parser PHP: 44 arquivos, 0 erros · esbuild: 94 arquivos TS/TSX, 0 erros · imports internos: 0 quebrados.
- `tsc --noEmit`: 12 erros, exatamente os mesmos 12 do painel 1.15.2 sem o overlay (todos `TS7006`).
- `webpack --mode production`: build concluído, 2,57 MiB de JS, hooks do Blueprint presentes no bundle.
- Instalador testado nas faixas 1.10.4 / 1.15.x / 1.16.0 / 2.0.0-beta.2 / canary.

### Limitações

- Pterodactyl 2.0.0-beta.x não é suportado — exige um port dedicado (Laravel 13, Vite, frontend novo).
- Não há teste com banco real, Wings e extensões de terceiros; valide em staging antes de produção.
