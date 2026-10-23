import React from 'react';
import { NavLink, Route } from 'react-router-dom';
import { useStoreState } from 'easy-peasy';

import blueprintRoutes from './routes';
import { UiBadge } from '@blueprint/ui';

/**
 * Filter the account routes an extension registered, taking the admin-only
 * flag into account.
 */
export const useVisibleBlueprintAccountRoutes = () => {
  const rootAdmin = useStoreState((state) => state.user.data!.rootAdmin);

  return blueprintRoutes.account.filter((route) => (route.adminOnly ? rootAdmin : true));
};

const AdminBadge = () => (
  <>
    <span className={'hidden'}>(</span>
    <UiBadge>ADMIN</UiBadge>
    <span className={'hidden'}>)</span>
  </>
);

/**
 * Account navigation entries for blueprint extensions. Rendered inside the
 * panel's own `<SubNavigation>` block so upstream behaviour is preserved.
 */
export const BlueprintAccountLinks = () => {
  const routes = useVisibleBlueprintAccountRoutes();

  if (routes.length < 1) {
    return null;
  }

  return (
    <>
      {routes
        .filter((route) => !!route.name)
        .map(({ path, name, exact = false, adminOnly }) => (
          <NavLink key={path} to={`/account/${path}`.replace('//', '/')} exact={exact}>
            {name}
            {adminOnly ? <AdminBadge /> : undefined}
          </NavLink>
        ))}
    </>
  );
};

/**
 * Account routes for blueprint extensions. Rendered inside the panel's own
 * `<Switch>` so the 404 screen and Suspense boundaries keep working.
 */
export const BlueprintAccountRoutes = () => {
  const routes = useVisibleBlueprintAccountRoutes();

  return (
    <>
      {routes.map(({ path, component: Component }) => (
        <Route key={path} path={`/account/${path}`.replace('//', '/')} exact>
          <Component />
        </Route>
      ))}
    </>
  );
};
