import React, { ReactNode, useEffect, useRef, useState, useTransition } from "react";


export type RouteBase<Prepared> = {
    /**
     * The function for rendering this route. The value that `prepare` returned
     * is passed as argument.
     */
    render: (prepared: Prepared) => JSX.Element;

    /**
     * A function that is called when the route becomes inactive. Mainly useful
     * to do cleanup work.
     */
    dispose?: (prepared: Prepared) => void;
};

/** The definition of a single route. */
export type Route<Prepared, QueryParams extends string[] = []> = RouteBase<Prepared> & {
    /**
     * A regex describing the route's path. If the regex matches the path, the
     * route is taken. Regex may contain capture groups. All captures are
     * passed to `prepare`.
     */
    path: string;

    /**
     * List of required query parameters. If these parameters are not present or
     * have an empty value, this route is not taken.
     *
     * Unfortunately, this field cannot be optional. And if the field is not
     * `[]`, you have to specify the type parameter of `Route` or `makeRoute`
     * explicitly to get an actual tuple type and thus a useful `queryParams`
     * type in `prepare`.
     */
    queryParams: QueryParams;

    /**
     * A function that is called as soon as the route becomes active. In
     * particular, called outside of a React rendering context.
     *
     * It is passed the route parameters which are simply the captures from the
     * path regex. This is the array returned by `RegExp.exec` but with the
     * first element (the whole match) removed.
     */
    prepare: (info: {
        pathParams: string[];
        queryParams: Record<QueryParams[number], string>;
    }) => Prepared;
};

/** A route used as fallback (if no other route matches) */
export type FallbackRoute<Prepared> = RouteBase<Prepared> & {
    /** Like `Route.prepare`, but without information about the URL. */
    prepare: () => Prepared;
};

/**
 * A route which has been matched and whose `prepare` function was already
 * called.
 */
export type MatchedRoute<Prepared> = RouteBase<Prepared> & {
    prepared: Prepared;
};

/**
 * A type-erased version of `Route`. Use `makeRoute` to obtain this.
 *
 * This looks a bit funny, but is essentially an encoding of existential types.
 * So what we need is an array of routes. But `Route` has a type parameter. We
 * could of course set the type to `Route<any>[]` and it would work, but with
 * two disadvantages: (a) in our code, we would have to deal with `any`s and
 * would lose type checking ability, and (b) user code could also lose type
 * checking ability. So the type we "need" is: `(∃ T: Route<T>)[]`.
 *
 * However, TS does not have existential types built-in. Luckily, there are
 * workarounds. We use "continuations" here. It's just two indirections through
 * callables. It makes our code below slightly less readable, but it's still
 * fine and at least we get proper type checking! For more information, see:
 *
 * - https://www.jalo.website/existential-types-in-typescript-through-continuations
 * - https://rubenpieters.github.io/
 *      programming/typescript/2018/07/13/existential-types-typescript.html
 * - https://stackoverflow.com/q/51815782/
 * - https://stackoverflow.com/a/46186356/
 * - https://unsafe-perform.io/posts/2020-02-21-existential-quantification-in-typescript
 */
export type RouteErased = <R, >(cont: <P, Q extends string[]>(r: Route<P, Q>) => R) => R;

/** A type-erased version of `FallbackRoute`. Use `makeFallbackRoute` to obtain this. */
export type FallbackRouteErased = <R, >(cont: <P, >(r: FallbackRoute<P>) => R) => R;

/** A type-erased version of `MatchedRoute`. */
export type MatchedRouteErased = <R, >(cont: <P, >(r: MatchedRoute<P>) => R) => R;


/** Creates the internal representation of the given route. */
export function makeRoute<P, Q extends string[] = []>(route: Route<P, Q>): RouteErased {
    return e => e(route);
}

/** Creates the internal representation of the given fallback route. */
export function makeFallbackRoute<P>(route: FallbackRoute<P>): FallbackRouteErased {
    return e => e(route);
}


type Listener = () => void;

/** Routing definition */
interface Config {
    /** The fallback route. Used when no routes in `routes` match. */
    fallback: FallbackRouteErased;

    /** All routes. They are matched in order, with the first matching one "winning". */
    routes: RouteErased[];

    /**
     * A component that is rendered as child of `<Router>` to indicate the
     * transition from one route to another. The `isPending` props is `true` if
     * the app is currently transitioning from one route to another.
     */
    LoadingIndicator?: (props: { isPending: boolean }) => JSX.Element;

    /** If set to `true`, debug messages are logged via `console.debug`. Default: `false`. */
    debug?: boolean;
}

/** Props of the `<Link>` component. */
type LinkProps = {
    to: string;
} & Omit<React.ComponentPropsWithoutRef<"a">, "href">;

/** Props of the `<Router>` component. */
type RouterProps = {
    initialRoute: MatchedRouteErased;
    children: ReactNode;
};

export type RouterLib = {
    /**
     * Matches the given full href against all routes, returning the first
     * matched route or throwing an error if no route matches.
     */
    matchRoute: (href: string) => MatchedRouteErased;

    /**
     * Like `matchRoute(window.location.href)`. Intended to be called before
     * `React.render` to obtain the initial route for the application.
     */
    matchInitialRoute: () => MatchedRouteErased;

    /** Hook to obtain a reference to the router. */
    useRouter: () => RouterControl;

    /**
     * An internal link, using the defined routes. Should be used instead of
     * `<a>`. Has to be mounted below a `<Router>`!
     *
     * This component reacts to clicks and prevents any default action (e.g. the
     * browser navigating to that link). Instead, our router is notified of the new
     * route and renders appropriately.
     */
    Link: (props: LinkProps) => JSX.Element;

    /**
     * Renders the currently matched route. Has to be used somewhere inside of a
     * `<Router>`.
     */
    ActiveRoute: () => JSX.Element;

    /** Provides the required context for `<Link>` and `<ActiveRoute>` components. */
    Router: (props: RouterProps) => JSX.Element;
};

/** Obtained via `useRouter`, allowing you to perform some routing-related actions. */
export interface RouterControl {
    /** Navigates to a new URI, just like creating a `<Link to={uri}>` and clicking it. */
    goto(uri: string): void;

    /**
     * Adds a listener function that is called whenever a route transition is
     * initiated. Neither the location nor the matched route has to change: the
     * listener is also called when a navigation to the current location is
     * initiated.
     *
     * Returns a function that removes the listener. Call the function at an
     * appropriate time to prevent memory leaks.
     */
    addListener(listener: Listener): () => void;
}

export const makeRouter = <C extends Config, >(config: C): RouterLib => {
    // Helper to log debug messages if `config.debug` is true.
    const debugLog = (...args: any[]) => {
        if (config.debug) {
            console.debug("[rauta] ", ...args);
        }
    };

    const useRouterImpl = (caller: string): RouterControl => {
        const context = React.useContext(Context);
        if (context === null) {
            throw new Error(`${caller} used without a parent <Router>! That's not allowed.`);
        }

        return {
            goto: (uri: string): void => {
                const href = new URL(uri, document.baseURI).href;
                const newRoute = matchRoute(href);
                context.setActiveRoute(newRoute);
                history.pushState(null, "", href);
                newRoute(r => debugLog(`Setting active route for '${href}' to: `, r));
            },

            addListener: (listener: () => void): () => void => {
                const obj = { listener };
                context.listeners.push(obj);
                return () => {
                    context.listeners = context.listeners.filter(l => l !== obj);
                };
            },
        };
    };

    const Link = ({ to, children, onClick, ...props }: LinkProps) => {
        const router = useRouterImpl("<Link>");

        const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
            // We only want to react to simple mouse clicks.
            if (e.ctrlKey || e.metaKey || e.altKey || e.shiftKey || e.button !== 0) {
                return;
            }

            e.preventDefault();
            router.goto(to);

            // If the caller specified a handler, we will call it as well.
            if (onClick) {
                onClick(e);
            }
        };

        return <a href={to} onClick={handleClick} {...props}>{children}</a>;
    };

    const matchRoute = (href: string): MatchedRouteErased => {
        const tryMatchSingleRoute = <P, Q extends string[]>(
            route: Route<P, Q>,
        ): MatchedRoute<P> | null => {
            // Use the route's regex to check whether the current path matches.
            // We modify the regex to make sure the whole path matches and that
            // a trailing slash is always optional.
            const regex = new RegExp(`^${route.path}/?$`, "u");
            const params = regex.exec(currentPath);
            if (params === null) {
                return null;
            }

            // For each required query parameter, retrieve it from the URL and
            // return `null` if it's not present.
            const queryParams: Record<string, string> = {};
            for (const key of route.queryParams) {
                const v = url.searchParams.get(key);
                if (v === null || v.trim() === "") {
                    return null;
                } else {
                    queryParams[key] = v;
                }
            }

            const prepared = route.prepare({ pathParams: params.slice(1), queryParams });
            return { render: route.render, dispose: route.dispose, prepared };
        };

        const url = new URL(href);
        const currentPath = decodeURI(url.pathname);
        for (const route of config.routes) {
            const matched: MatchedRouteErased | null = route(r => {
                const matched = tryMatchSingleRoute(r);
                return matched === null ? null : f => f(matched);
            });

            if (matched !== null) {
                return matched;
            }
        }

        return config.fallback(route => {
            const prepared = route.prepare();
            return f => f({ prepared, render: route.render, dispose: route.dispose });
        });
    };

    const matchInitialRoute = (): MatchedRouteErased => matchRoute(window.location.href);

    type ContextData = {
        activeRoute: MatchedRouteErased;
        setActiveRoute: (newRoute: MatchedRouteErased) => void;
        listeners: { listener: Listener }[];
    };

    const Context = React.createContext<ContextData | null>(null);

    const useRouter = (): RouterControl => useRouterImpl("`useRouter`");

    /** Provides the required context for `<Link>` and `<ActiveRoute>` components. */
    const Router = ({ initialRoute, children }: RouterProps) => {
        const listeners = useRef<{ listener: Listener }[]>([]);
        const [activeRoute, setActiveRouteRaw] = useState<MatchedRouteErased>(() => initialRoute);
        const [isPending, startTransition] = useTransition();

        const setActiveRoute = (newRoute: MatchedRouteErased) => {
            startTransition(() => {
                setActiveRouteRaw(() => newRoute);
                for (const { listener } of listeners.current) {
                    listener();
                }
            });
        };

        // We need to listen to `popstate` events.
        useEffect(() => {
            const onPopState = () => {
                const newRoute = matchRoute(window.location.href);
                setActiveRoute(newRoute);
                newRoute(r => debugLog(
                    "Reacting to 'popstate' event: setting active route for"
                        + `'${window.location.href}' to: `,
                    r,
                ));
            };

            window.addEventListener("popstate", onPopState);
            return () => window.removeEventListener("popstate", onPopState);
        }, []);

        // Dispose of routes when they are no longer needed.
        useEffect(() => () => {
            activeRoute(r => {
                if (r.dispose) {
                    debugLog("Disposing of route: ", r);
                    r.dispose(r.prepared);
                }
            });
        }, [activeRoute]);

        const contextData = {
            setActiveRoute,
            activeRoute,
            listeners: listeners.current,
        };

        return (
            <Context.Provider value={contextData}>
                {config.LoadingIndicator && <config.LoadingIndicator isPending={isPending} />}
                {children}
            </Context.Provider>
        );
    };

    const ActiveRoute = () => {
        const context = React.useContext(Context);
        if (context === null) {
            throw new Error("<ActiveRoute> used without a parent <Router>! That's not allowed.");
        }

        return context.activeRoute(r => r.render(r.prepared));
    };

    return {
        Link,
        matchRoute,
        matchInitialRoute,
        useRouter,
        ActiveRoute,
        Router,
    };
};

