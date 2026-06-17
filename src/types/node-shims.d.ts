declare module "node:fs/promises" {
  export function readFile(path: string, encoding: string): Promise<string>;
  export function writeFile(path: string, data: string, encoding: string): Promise<void>;
  export function mkdir(path: string, options?: { recursive?: boolean }): Promise<void>;
  export function copyFile(source: string, destination: string): Promise<void>;
}

declare module "node:path" {
  export function dirname(path: string): string;
  export function resolve(...paths: string[]): string;
  export function join(...paths: string[]): string;
  export function basename(path: string): string;

  const pathNamespace: {
    dirname: typeof dirname;
    resolve: typeof resolve;
    join: typeof join;
    basename: typeof basename;
  };

  export default pathNamespace;
}

declare module "node:url" {
  export function fileURLToPath(url: string | URL): string;
}

declare const process: {
  argv: string[];
  exit(code?: number): never;
  exitCode?: number;
};
