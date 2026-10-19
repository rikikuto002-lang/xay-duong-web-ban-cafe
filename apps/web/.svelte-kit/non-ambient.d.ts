
// this file is generated — do not edit it


declare module "svelte/elements" {
	export interface HTMLAttributes<T> {
		'data-sveltekit-keepfocus'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-noscroll'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-preload-code'?:
			| true
			| ''
			| 'eager'
			| 'viewport'
			| 'hover'
			| 'tap'
			| 'off'
			| undefined
			| null;
		'data-sveltekit-preload-data'?: true | '' | 'hover' | 'tap' | 'off' | undefined | null;
		'data-sveltekit-reload'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-replacestate'?: true | '' | 'off' | undefined | null;
	}
}

export {};


declare module "$app/types" {
	type MatcherParam<M> = M extends (param : string) => param is (infer U extends string) ? U : string;

	export interface AppTypes {
		RouteId(): "/" | "/account" | "/admin" | "/cart" | "/login" | "/orders";
		RouteParams(): {
			
		};
		LayoutParams(): {
			"/": Record<string, never>;
			"/account": Record<string, never>;
			"/admin": Record<string, never>;
			"/cart": Record<string, never>;
			"/login": Record<string, never>;
			"/orders": Record<string, never>
		};
		Pathname(): "/" | "/account" | "/admin" | "/cart" | "/login" | "/orders";
		ResolvedPathname(): `${"" | `/${string}`}${ReturnType<AppTypes['Pathname']>}`;
		Asset(): "/images/anh1.jpg" | "/images/anh2.jpg" | "/images/anh3.jpg" | "/images/anh4.jpg" | "/images/hero-cafe.png" | string & {};
	}
}