import compose from 'koa-compose';
import * as module from '/Users/nikolaionken/dev/baseline/api/src/routes/Users/nikolaionken/dev/baseline/api/src/routes/v1/subscription/webhook.js';
import {getMiddlewares} from '../middleware';
import {IncomingMessage} from 'http';
import URL from 'url';

class Request extends IncomingMessage {
  constructor({ method, url, headers, body, remoteAddress }) {
    super({
      encrypted: true,
      readable: false,
      remoteAddress,
      address: () => ({ port: 443 }),
      end: Function.prototype,
      destroy: Function.prototype
    });

    if (typeof headers['content-length'] === 'undefined') {
      headers['content-length'] = Buffer.byteLength(body);
    }

    Object.assign(this, {
      ip: remoteAddress,
      complete: true,
      httpVersion: '1.1',
      httpVersionMajor: '1',
      httpVersionMinor: '1',
      method,
      headers,
      body,
      url,
    });

    this._read = () => {
      this.push(body);
      this.push(null);
    };
  }
}

function requestMethod(event) {
  return event.requestContext.http.method;
}

function requestRemoteAddress(event) {
  return event.requestContext.http.sourceIp;
}

function requestHeaders(event) {
  const initialHeader = Array.isArray(event.cookies)
    ? { cookie: event.cookies.join('; ') }
    : {};

  return Object.keys(event.headers).reduce((headers, key) => {
    headers[key.toLowerCase()] = event.headers[key];
    return headers;
  }, initialHeader);
}

function requestBody(event) {
  const type = typeof event.body;

  if (Buffer.isBuffer(event.body)) {
    return event.body;
  } else if (type === 'string') {
    return Buffer.from(event.body, event.isBase64Encoded ? 'base64' : 'utf8');
  } else if (type === 'object') {
    return Buffer.from(JSON.stringify(event.body));
  }

  throw new Error(`Unexpected event.body type: ${typeof event.body}`);
}

function requestUrl(event) {
  return URL.format({
    pathname: event.rawPath,
    search: event.rawQueryString,
  });
}

function cleanupEvent(event = {}) {
  event.requestContext = event.requestContext || {};
  event.body = event.body || '';
  event.headers = event.headers || {};
  return event;
}

function cleanupRequest(event, options = {}) {
  const method = requestMethod(event);
  const remoteAddress = requestRemoteAddress(event);
  const headers = requestHeaders(event);
  const body = requestBody(event);
  const url = requestUrl(event);

  if (typeof options.requestId === 'string' && options.requestId.length > 0) {
    const header = options.requestId.toLowerCase();
    headers[header] = headers[header] || event.requestContext.requestId;
  }

  return new Request({
    method,
    headers,
    body,
    remoteAddress,
    url,
  });
}

exports.handler = async function (event) {
  event = cleanupEvent(event);
console.log(event, 1)
  let handler = (ctx) => { ctx.status = 404; }

  const ctx = {
    status: 200,
    body: 'Hi!',
    request: cleanupRequest(event)
  };

  switch (ctx.request.method) {
    case 'GET':
      if (typeof module.get !== 'undefined') handler = module.get();
    break;
    case 'POST':
      if (typeof module.post !== 'undefined') handler = module.post();
    break;
    case 'PUT':
      if (typeof module.put !== 'undefined') handler = module.put();
    break;
    case 'DELETE':
      if (typeof module.destroy !== 'undefined') handler = module.destroy();
    break;
    case 'OPTIONS':
      if (typeof module.options !== 'undefined') handler = module.options();
    break;
    case 'PATCH':
      if (typeof module.patch !== 'undefined') handler = module.patch();
    break;
    case 'HEAD':
      if (typeof module.head !== 'undefined') handler = module.head();
    break;
  }

  let middlewares = getMiddlewares();
  middlewares = Array.isArray(middlewares) ? middlewares : [middlewares];
  await compose(middlewares.concat(handler))(ctx);

  return {
    statusCode: ctx.status,
    body: typeof ctx.body === 'object' ? JSON.stringify(ctx.body) : ctx.body
  }
}
