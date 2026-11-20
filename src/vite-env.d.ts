/// <reference types="vite/client" />

declare module 'virtual:published-posts' {
  const posts: import('./content-parser').Post[];
  export default posts;
}

declare module 'virtual:image-sizes' {
  const sizes: Record<string, [width: number, height: number]>;
  export default sizes;
}
