import serverless from 'serverless-http';
import Koa from 'koa';
import Router from '@koa/router';
import * as module from '{{import}}';
import {getMiddlewares} from '{{middlewaresPath}}';

const app = new Koa();
const router = new Router();

app.context.gitSha = '{{gitSha}}';
app.context.clientJs = '{{clientJs}}';

getMiddlewares(app).forEach(middleware => app.use(middleware));

for (let method in module) {
  let handler = module[method]();
  if (!Array.isArray(handler)) handler = [handler];
  if (method === 'destroy') method = 'del';
  router[method].apply(router, ['(.*)'].concat(handler));
}

app.use(router.routes());

exports.handler = serverless(app);