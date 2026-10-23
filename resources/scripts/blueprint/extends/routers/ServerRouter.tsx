import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import Can from '@/components/elements/Can';
import PermissionRoute from '@/components/elements/PermissionRoute';
import Spinner from '@/components/elements/Spinner';
import { useStoreState } from 'easy-peasy';
import { ServerContext } from '@/state/server';

import blueprintRoutes from './routes';
import { UiBadge } from '@blueprint/ui';

/**
 * Every extension that declares at least one server route.
 */
const blueprintExtensions = [...new Set(blueprintRoutes.server.map((route) => route.identifier))];

/**
 * Get the route egg IDs for each extension with server routes.
 *
 * An extension that does not restrict itself to specific eggs returns `['-1']`,
 * which means "always show".
 */
export const useExtensionEggs = () => {
  const [extensionEggs, setExtensionEggs] = useState<{ [x: string]: string[] }>(
    blueprintExtensions.reduce((prev, current) => ({ ...prev, [current]: ['-1'] }), {})
  );

  useEffect(() => {
    (async () => {
      const newEggs: { [x: string]: string[] } = {};
      for (const id of blueprintExtensions) {
        const resp = await fetch(`/api/client/extensions/blueprint/eggs?${new URLSearchParams({ id })}`);
        newEggs[id] = (await resp.json()) as string[];
      }
      setExtensionEggs(newEggs);
    })();
  }, []);

  return extensionEggs;
};

/**
 * Filter the routes an extension registered for this server, taking the
 * admin-only flag and the egg restriction into account.
 */
export const useVisibleBlueprintServerRoutes = () => {
  const rootAdmin = useStoreState((state) => state.user.data!.rootAdmin);
  const serverEgg = ServerContext.useStoreState((state) => state.server.data?.BlueprintFramework.eggId);
  const extensionEggs = useExtensionEggs();

  return blueprintRoutes.server
    .filter((route) => (route.adminOnly ? rootAdmin : true))
    .filter((route) => {
      const eggs = extensionEggs[route.identifier] || ['-1'];

      return eggs.includes('-1') ? true : eggs.find((id) => id === serverEgg?.toString());
    });
};

const AdminBadge = () => (
  <>
    <span className={'hidden'}>(</span>
    <UiBadge>ADMIN</UiBadge>
    <span className={'hidden'}>)</span>
  </>
);

/**
 * Navigation entries for blueprint extensions that registered server routes.
 * Rendered inside the panel's own `<SubNavigation>` block, next to the
 * Pterodactyl links, so upstream behaviour (permissions, admin link, ...) is kept.
 */
export const BlueprintServerLinks = ({ to }: { to: (value: string, url?: boolean) => string }) => {
  const routes = useVisibleBlueprintServerRoutes();

  if (routes.length < 1) {
    return null;
  }

  return (
    <>
      {routes
        .filter((route) => !!route.name)
        .map((route) =>
          route.permission ? (
            <Can key={route.path} action={route.permission} matchAny>
              <NavLink to={to(route.path, true)} exact={route.exact}>
                {route.name}
                {route.adminOnly ? <AdminBadge /> : undefined}
              </NavLink>
            </Can>
          ) : (
            <NavLink key={route.path} to={to(route.path, true)} exact={route.exact}>
              {route.name}
              {route.adminOnly ? <AdminBadge /> : undefined}
            </NavLink>
          )
        )}
    </>
  );
};

/**
 * Routes for blueprint extensions. Rendered inside the panel's own `<Switch>`
 * so that upstream's PermissionRoute, ErrorBoundary and conflict-state handling
 * keep working exactly as they do in a vanilla Pterodactyl install.
 */
export const BlueprintServerRoutes = ({ to }: { to: (value: string, url?: boolean) => string }) => {
  const routes = useVisibleBlueprintServerRoutes();

  return (
    <>
      {routes.map(({ path, permission, component: Component }) => (
        <PermissionRoute key={path} permission={permission} path={to(path)} exact>
          <Spinner.Suspense>
            <Component />
          </Spinner.Suspense>
        </PermissionRoute>
      ))}
    </>
  );
};
