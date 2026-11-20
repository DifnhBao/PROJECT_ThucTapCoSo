module.exports = function compile(source) {
  const done = this.async();
  const filename = this.resourcePath;
  import('typescript').then(({ default: ts }) => {
    done(null, ts.transpileModule(source, { fileName: filename, compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText);
  }).catch(done);
};
