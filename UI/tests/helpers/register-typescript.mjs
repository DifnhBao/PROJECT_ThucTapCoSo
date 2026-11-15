// Test-only loader using the existing TypeScript dependency; no generated files.
import fs from "node:fs";
import { registerHooks } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from 'node:path';
import ts from "typescript";

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (context.parentURL?.startsWith('file:') && (specifier.startsWith('@/') || specifier.startsWith('.'))) {
      const target = specifier.startsWith('@/')
        ? fileURLToPath(new URL('../../' + specifier.slice(2), import.meta.url))
        : path.resolve(path.dirname(fileURLToPath(context.parentURL)), specifier);
      for (const candidate of [target, target + '.ts', target + '.tsx', path.join(target, 'index.ts')]) {
        if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return { url: pathToFileURL(candidate).href, shortCircuit: true };
      }
    }
    return nextResolve(specifier, context);
  },
  load(url, context, nextLoad) {
    if (!url.startsWith("file:") || !/\.tsx?$/.test(url) || url.includes("/node_modules/")) {
      return nextLoad(url, context);
    }
    const filename = fileURLToPath(url);
    const { outputText } = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
      fileName: filename,
      compilerOptions: {
        target: ts.ScriptTarget.ES2020,
        module: ts.ModuleKind.ESNext,
        jsx: ts.JsxEmit.ReactJSX,
        esModuleInterop: true,
      },
    });
    return { format: "module", source: outputText, shortCircuit: true };
  },
});
