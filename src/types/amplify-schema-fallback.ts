// Docker production builds do not have the sibling TourGuideApp schema checkout.
// CI and local typecheck still use the real generated schema through tsconfig paths.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Schema = any;
