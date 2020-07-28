import serverless from 'serverless-http';
import Koa from 'koa';
import * as module from '{{import}}';
import {getMiddlewares} from '{{middlewaresPath}}';

const app = new Koa();

process.env.GIT_SHA = '{{gitSha}}';

getMiddlewares(app).forEach(middleware => app.use(middleware));

app.use(async (ctx, next) => {
  if (!ctx.time) {
    ctx.time = +new Date();
    console.log('New measurement handler: ', ctx.time / 1000);
  }

  let handler = (ctx) => { ctx.status = 404; }

  switch (ctx.request.method) {
    case 'GET':
      if (typeof module.get !== 'undefined') handler = module.get();
    case 'POST':
      if (typeof module.post !== 'undefined') handler = module.post();
    case 'PUT':
      if (typeof module.put !== 'undefined') handler = module.put();
    case 'DELETE':
      if (typeof module.destroy !== 'undefined') handler = module.destroy();
    case 'OPTIONS':
      if (typeof module.options !== 'undefined') handler = module.options();
    case 'PATCH':
      if (typeof module.patch !== 'undefined') handler = module.patch();
    case 'HEAD':
      if (typeof module.head !== 'undefined') handler = module.head();
    default:
      if (typeof module.all !== 'undefined') handler = module.all();
  }

  const result = await handler(ctx, next);

  const time = +new Date();
  console.log('Timestamp end: ', (time - ctx.time) / 1000);

  return result;
});

exports.handler = serverless(app);