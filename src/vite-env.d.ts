/// <reference types="vite/client" />

declare module 'virtual:published-posts' {
  const posts: import('./content-parser').Post[];
  export default posts;
}
