import glob from 'glob';
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
const rollupPkgPath = require.resolve('rollup/package.json'); 
const rollupDir = path.dirname(rollupPkgPath);
const rollupPkg = require(rollupPkgPath);
const binPath = path.join(rollupDir, rollupPkg.bin.rollup);

function sanitize(path) {
  return path.replace(/[^a-zA-Z0-9]+/g, '-');
}

function buildLamda(routeDir, distDir, middlewarePath, fileName) {
  let globPattern = path.join(routeDir, '**/!(*.test|*.client|*.build|*.html).js');
  if (fileName) {
    globPattern = path.join(routeDir, fileName);
  }

  const routes = [];

  glob(globPattern, async function (er, files) {
    files.forEach((file) => {
      const parts = path.parse(path.relative(routeDir, file));
      
      const runtime = fs.readFileSync(path.join(__dirname, 'lib', 'runtime.js'), 'utf-8');      
      
      const output = runtime
        .replace('{{import}}', `./${parts.base}`)
        .replace('{{middlewaresPath}}', middlewarePath);

      let route = parts.dir;
      let basename = parts.base;
      if (basename !== 'index.js') {
        route = path.join(route, parts.name);
        basename = 'index.js';
      }
      
      const fileName = `${parts.name}.build.js`;
      let filePath = sanitize(route);
      if (!filePath) filePath = 'root';

      fs.writeFileSync(path.join(routeDir, parts.dir, fileName), output);
      
      const args = [
        path.join(routeDir, parts.dir, fileName),
        '--file', path.join(distDir, filePath, 'index.js'),
        '--config', path.join(__dirname, 'rollup.config.js')
      ];
      
      const parcel = spawnSync(binPath, args);
      
      if (parcel.status === 1) {
        console.log(`Error generating: ${path.join(route, 'index.js')}`);
        console.log(parcel.stderr.toString())
      } else {
        console.log(`Written output to: ${path.join(distDir, route, 'index.js')}`)
      }

      fs.unlinkSync(path.join(routeDir, parts.dir, fileName));

      routes.push({
        id: route ? route.replace(/[^a-zA-Z0-9]+/g, "-") : 'root',
        path: `/${route}`,
        buildDir: path.join(distDir, filePath),
        fileSize: `${(fs.statSync(path.join(distDir, filePath, 'index.js')).size / 1000000).toFixed(2)} MB`
      });

    });
    
    fs.writeFileSync(path.join(distDir, 'routes.json'), JSON.stringify(routes, null, 2), 'utf8');

    console.table(routes)
  });
}

export {
  buildLamda
}