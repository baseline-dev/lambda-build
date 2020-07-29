import glob from 'glob';
import { promises as fs } from 'fs';
import path, { resolve } from 'path';
import spawn from 'await-spawn';

const rollupPkgPath = require.resolve('rollup/package.json');
const rollupDir = path.dirname(rollupPkgPath);
const rollupPkg = require(rollupPkgPath);
const binPath = path.join(rollupDir, rollupPkg.bin.rollup);

function sanitize(path) {
  return path.replace(/[^a-zA-Z0-9]+/g, '-');
}

var concurrent = async (xs, f, n = Infinity) => {
  const finished = Symbol();
  let results = [];
  let promises = xs.slice(0, n).map(f), others = xs.slice(n);
  while (promises.length) {
    const result = await Promise.race(promises.map(promise => promise.then((result) => { promise[finished] = true; return result; })));
    promises = promises.filter(promise => !promise[finished]);
    promises.push(...others.splice(0, n - promises.length).map(f));
    results = results.concat(result);
  }
  return results;
};

function buildLamda(routeDir, distDir, middlewarePath, gitSha = '', fileName) {
  let globPattern = path.join(routeDir, '**/!(*.test|*.client|*.build|*.html|*.md).js');
  if (fileName) {
    globPattern = path.join(routeDir, fileName);
  }

  function build(file) {
    return new Promise(async (resolve, reject) => {
      try {
        console.log(`Building: ${file}`);

        // Checking if there is a client.js
        let clientJavaScript = '';
        try {
          const clientFile = path.join(path.dirname(file), `${path.parse(file).name}.client.js`);
          await fs.stat(clientFile);
          clientJavaScript = path.relative(routeDir, clientFile);
        } catch(e) {}
        
        const parts = path.parse(path.relative(routeDir, file));

        const runtime = await fs.readFile(path.join(__dirname, 'lib', 'runtime.js'), 'utf-8');

        const output = runtime
          .replace('{{import}}', `./${parts.base}`)
          .replace('{{middlewaresPath}}', middlewarePath)
          .replace('{{clientJs}}', clientJavaScript)
          .replace('{{gitSha}}', gitSha);

        let route = parts.dir;
        let basename = parts.base;
        if (basename !== 'index.js') {
          route = path.join(route, parts.name);
          basename = 'index.js';
        }

        const fileName = `${parts.name}.build.js`;
        let filePath = sanitize(route);
        if (!filePath) filePath = 'root';

        await fs.writeFile(path.join(routeDir, parts.dir, fileName), output);

        const args = [
          path.join(routeDir, parts.dir, fileName),
          '--file', path.join(distDir, filePath, 'index.js'),
          '--config', path.join(__dirname, 'rollup.config.js')
        ];

        const parcel = await spawn(binPath, args);

        if (parcel.status === 1) {
          console.log(`Error generating: ${path.join(route, 'index.js')}`);
          console.log(parcel.stderr.toString())
        } else {
          console.log(`Written output to: ${path.join(distDir, route, 'index.js')}`)
        }

        await fs.unlink(path.join(routeDir, parts.dir, fileName));

        const stat = await fs.stat(path.join(distDir, filePath, 'index.js'));

        resolve({
          id: route ? route.replace(/[^a-zA-Z0-9]+/g, "-") : 'root',
          path: `/${route}`,
          buildDir: path.join(distDir, filePath),
          fileSize: `${(stat.size / 1000000).toFixed(2)} MB`
        });
      } catch (e) {
        reject(e);
      }
    });
  }

  glob(globPattern, async function (er, files) {
    const routes = await concurrent(files, build, 5);
    
    await fs.writeFile(path.join(distDir, 'routes.json'), JSON.stringify(routes, null, 2), 'utf8');

    console.table(routes)
  });
}

export {
  buildLamda
}