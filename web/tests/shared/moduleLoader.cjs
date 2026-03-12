const fs = require('fs');
const path = require('path');
const Module = require('module');
const esbuild = require('esbuild');

function loadModule(moduleRelativePath) {
  const basePath = path.resolve(__dirname, '..', '..', 'src', 'shared');
  const normalized = moduleRelativePath.replace(/\\/g, '/').replace(/^\.?\//, '');
  const requested = path.resolve(basePath, normalized);
  const absPath = fs.existsSync(requested)
    ? requested
    : fs.existsSync(`${requested}.ts`)
      ? `${requested}.ts`
      : `${requested}.js`;
  if (!fs.existsSync(absPath)) {
    throw new Error(`Module not found: ${absPath}`);
  }

  const source = fs.readFileSync(absPath, 'utf8');
  const transformed = esbuild.transformSync(source, {
    loader: absPath.endsWith('.ts') ? 'ts' : 'js',
    format: 'cjs',
    target: 'node18',
    sourcemap: false,
    sourcefile: absPath,
  });

  const loadedModule = new Module(absPath, module.parent);
  loadedModule.filename = absPath;
  loadedModule.paths = Module._nodeModulePaths(path.dirname(absPath));
  loadedModule._compile(transformed.code, absPath);
  return loadedModule.exports;
}

module.exports = {
  loadModule,
};
