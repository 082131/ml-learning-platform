/// <reference types="vite/client" />
declare module '*.module.css' {
  const classes: Record<string, string>;
  export default classes;
}
declare module '*.mdx' {
  import type { ComponentType } from 'react';
  import type { MDXComponents } from 'mdx/types';
  const Content: ComponentType<{ components?: MDXComponents }>;
  export default Content;
}
