import { createRouter, createWebHashHistory } from "vue-router";
import store from "./store/index.js";
import Home from "./components/Home.vue";

import { auth } from "./firebase.js";

/**
 * Module exporting Auth Type enum
 * @module AuthEnum
 * @author JJ
 *
 * @notice Define an enum of all authentication requirements types possible for the routes.
 * @notice When performing checks and running router gaurd functions, check against this AuthType enum.
 * @notice The Enum object is frozen to prevent it from getting modified.
 *
 * @notice Auth types:
 * @notice public: All User can access route regardless of current auth status.
 * @notice public_only: Only accessible if user is not logged in. Example would be the login route.
 * @notice private: Accessible to users after authentication.
 */
const AuthType = Object.freeze({
  public: 1,
  public_only: 2,
  private: 3,
});

const router = createRouter({
  history: createWebHashHistory(),

  // Always scroll to top of view on first visit and no savedPosition, else reuse savedPosition
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) return savedPosition;
    else return { top: 0 };
  },

  /**
   * @notice
   * Routes uses lazily loaded components with route level code-splitting
   * this generates a separate chunk (about.[hash].js) for this route
   * which is lazy-loaded when the route is visited.
   */
  routes: [
    {
      path: "/",
      name: "home",
      component: Home,
      // Pass URL query parameters as prop to component
      props: (route) => route.query,
      meta: { Auth_requirements: AuthType.private },
    },
    {
      path: "/create",
      name: "create",
      props: (route) => route.query,
      component: () => import("./components/Create.vue"),
      meta: { Auth_requirements: AuthType.private },
    },
    {
      path: "/view",
      name: "view",
      props: (route) => route.query,
      component: () => import("./components/ViewNotes.vue"),
      meta: { Auth_requirements: AuthType.private },
    },
    {
      path: "/edit/:noteID",
      name: "edit",
      props: true,
      component: () => import("./components/Edit.vue"),
      meta: { Auth_requirements: AuthType.private },
    },
    {
      path: "/new",
      name: "new-user",
      component: () => import("./components/NewUser.vue"),
      meta: { Auth_requirements: AuthType.private },
    },
    {
      path: "/settings",
      name: "settings",
      component: () => import("./components/Settings.vue"),
      meta: { Auth_requirements: AuthType.private },
    },
    {
      path: "/invite",
      name: "invite-users",
      component: () => import("./components/InviteUsers.vue"),
      meta: { Auth_requirements: AuthType.private },
    },

    /* Public only routes */
    {
      path: "/login",
      name: "login",
      props: (route) => route.query,
      component: () => import("./components/Login.vue"),
      meta: { Auth_requirements: AuthType.public_only },
    },

    /* Public routes */
    {
      path: "/:pathMatch(.*)*",
      name: "404",
      component: () => import("./components/404.vue"),
      meta: { Auth_requirements: AuthType.public },
    },
  ],
});

/**
 * @function requiredAuth
 * @param {object} route Vue JS route "to" object
 * @returns {object} bool values of the auth status.
 */
function requiredAuth(route) {
  // Get auth requirements from first route object that matches with route navigated to
  const { Auth_requirements } = route.matched[0].meta;

  return {
    public: Auth_requirements === AuthType.public,
    public_only: Auth_requirements === AuthType.public_only,
    private: Auth_requirements === AuthType.private,
  };
}

/**
 * Checks if user's current auth status matches required auth status for the route being accessed
 * @function AuthChecker
 * @returns {null}
 */
function AuthChecker(to, from, next) {
  // Get current user from firebase
  const { currentUser } = auth;

  // Get AuthStatus required for accessing the route.
  const AuthType_required_is = requiredAuth(to);

  /**
   * Call next middleware provided by vue router with a route to go to.
   * Routing based on authentication status and user type / org status
   *
   * Definition of a new user is any user that does not already belong to an organization
   * Thus simply check if a user have the org value set in vuex's state
   * Any use of `!store.state.org` is treated as `newUser`
   * const newUser = !Boolean(store.state.org);
   */
  // If route is auth protected and user not logged in, redirect to login page
  if (AuthType_required_is.private && !currentUser) {
    const routeTo = { name: "login" };

    // If there is no route to redirect to, then leave this out
    if (to.path !== "/")
      routeTo.query = {
        // Instead of storing to.fullPath, create a new route object as fullPath will have query params stripped out
        redirect: JSON.stringify({ path: to.path, query: to.query }),
      };

    next(routeTo);
  }
  // If route is public only and user is logged in, redirect to default private route of home
  else if (AuthType_required_is.public_only && currentUser)
    next({ name: "home" });
  // If logged in and trying to go new-user even though user is not new, redirect to default private route of home
  else if (currentUser && to.name === "new-user" && store.state.org)
    return next({ name: "home" });
  // If logged in and trying to access none new-user routes despite being new, redirect to new-user
  else if (currentUser && to.name !== "new-user" && !store.state.org)
    return next({ name: "new-user" });
  // Else, just continue navigation as per user request.
  else next();
}

// Attach Router Gaurd Middleware function to run when navigation is made before the actual navigation.
router.beforeEach(AuthChecker);

export default router;
