// node_modules/hono/dist/utils/html.js
var HtmlEscapedCallbackPhase = {
	Stringify: 1,
	BeforeStream: 2,
	Stream: 3
};
var raw = (value, callbacks) => {
	const escapedString = new String(value);
	escapedString.isEscaped = true;
	escapedString.callbacks = callbacks;
	return escapedString;
};
var resolveCallback = async (str, phase, preserveCallbacks, context, buffer) => {
	const callbacks = str.callbacks;
	if (!callbacks?.length) {
		return Promise.resolve(str);
	}
	if (buffer) {
		buffer[0] += str;
	} else {
		buffer = [str];
	}
	const resStr = Promise.all(callbacks.map((c) => c({ phase, buffer, context }))).then(
		(res) => Promise.all(
			res.filter(Boolean).map((str2) => resolveCallback(str2, phase, false, context, buffer))
		).then(() => buffer[0])
	);
	if (preserveCallbacks) {
		return raw(await resStr, callbacks);
	} else {
		return resStr;
	}
};

// node_modules/hono/dist/context.js
var __accessCheck = (obj, member, msg) => {
	if (!member.has(obj))
		throw TypeError('Cannot ' + msg);
};
var __privateGet = (obj, member, getter) => {
	__accessCheck(obj, member, 'read from private field');
	return getter ? getter.call(obj) : member.get(obj);
};
var __privateAdd = (obj, member, value) => {
	if (member.has(obj))
		throw TypeError('Cannot add the same private member more than once');
	member instanceof WeakSet ? member.add(obj) : member.set(obj, value);
};
var __privateSet = (obj, member, value, setter) => {
	__accessCheck(obj, member, 'write to private field');
	setter ? setter.call(obj, value) : member.set(obj, value);
	return value;
};
var TEXT_PLAIN = 'text/plain; charset=UTF-8';
var setHeaders = (headers, map = {}) => {
	Object.entries(map).forEach(([key, value]) => headers.set(key, value));
	return headers;
};
var _status;
var _executionCtx;
var _headers;
var _preparedHeaders;
var _res;
var _isFresh;
var Context = class {
	constructor(req, options) {
		this.env = {};
		this._var = {};
		this.finalized = false;
		this.error = void 0;
		__privateAdd(this, _status, 200);
		__privateAdd(this, _executionCtx, void 0);
		__privateAdd(this, _headers, void 0);
		__privateAdd(this, _preparedHeaders, void 0);
		__privateAdd(this, _res, void 0);
		__privateAdd(this, _isFresh, true);
		this.layout = void 0;
		this.renderer = (content) => this.html(content);
		this.notFoundHandler = () => new Response();
		this.render = (...args) => this.renderer(...args);
		this.setLayout = (layout) => this.layout = layout;
		this.getLayout = () => this.layout;
		this.setRenderer = (renderer) => {
			this.renderer = renderer;
		};
		this.header = (name, value, options2) => {
			if (value === void 0) {
				if (__privateGet(this, _headers)) {
					__privateGet(this, _headers).delete(name);
				} else if (__privateGet(this, _preparedHeaders)) {
					delete __privateGet(this, _preparedHeaders)[name.toLocaleLowerCase()];
				}
				if (this.finalized) {
					this.res.headers.delete(name);
				}
				return;
			}
			if (options2?.append) {
				if (!__privateGet(this, _headers)) {
					__privateSet(this, _isFresh, false);
					__privateSet(this, _headers, new Headers(__privateGet(this, _preparedHeaders)));
					__privateSet(this, _preparedHeaders, {});
				}
				__privateGet(this, _headers).append(name, value);
			} else {
				if (__privateGet(this, _headers)) {
					__privateGet(this, _headers).set(name, value);
				} else {
					__privateGet(this, _preparedHeaders) ?? __privateSet(this, _preparedHeaders, {});
					__privateGet(this, _preparedHeaders)[name.toLowerCase()] = value;
				}
			}
			if (this.finalized) {
				if (options2?.append) {
					this.res.headers.append(name, value);
				} else {
					this.res.headers.set(name, value);
				}
			}
		};
		this.status = (status) => {
			__privateSet(this, _isFresh, false);
			__privateSet(this, _status, status);
		};
		this.set = (key, value) => {
			this._var ?? (this._var = {});
			this._var[key] = value;
		};
		this.get = (key) => {
			return this._var ? this._var[key] : void 0;
		};
		this.newResponse = (data, arg, headers) => {
			if (__privateGet(this, _isFresh) && !headers && !arg && __privateGet(this, _status) === 200) {
				return new Response(data, {
					headers: __privateGet(this, _preparedHeaders)
				});
			}
			if (arg && typeof arg !== 'number') {
				const headers2 = setHeaders(new Headers(arg.headers), __privateGet(this, _preparedHeaders));
				return new Response(data, {
					headers: headers2,
					status: arg.status ?? __privateGet(this, _status)
				});
			}
			const status = typeof arg === 'number' ? arg : __privateGet(this, _status);
			__privateGet(this, _preparedHeaders) ?? __privateSet(this, _preparedHeaders, {});
			__privateGet(this, _headers) ?? __privateSet(this, _headers, new Headers());
			setHeaders(__privateGet(this, _headers), __privateGet(this, _preparedHeaders));
			if (__privateGet(this, _res)) {
				__privateGet(this, _res).headers.forEach((v, k) => {
					__privateGet(this, _headers)?.set(k, v);
				});
				setHeaders(__privateGet(this, _headers), __privateGet(this, _preparedHeaders));
			}
			headers ?? (headers = {});
			for (const [k, v] of Object.entries(headers)) {
				if (typeof v === 'string') {
					__privateGet(this, _headers).set(k, v);
				} else {
					__privateGet(this, _headers).delete(k);
					for (const v2 of v) {
						__privateGet(this, _headers).append(k, v2);
					}
				}
			}
			return new Response(data, {
				status,
				headers: __privateGet(this, _headers)
			});
		};
		this.body = (data, arg, headers) => {
			return typeof arg === 'number' ? this.newResponse(data, arg, headers) : this.newResponse(data, arg);
		};
		this.text = (text, arg, headers) => {
			if (!__privateGet(this, _preparedHeaders)) {
				if (__privateGet(this, _isFresh) && !headers && !arg) {
					return new Response(text);
				}
				__privateSet(this, _preparedHeaders, {});
			}
			__privateGet(this, _preparedHeaders)['content-type'] = TEXT_PLAIN;
			return typeof arg === 'number' ? this.newResponse(text, arg, headers) : this.newResponse(text, arg);
		};
		this.json = (object, arg, headers) => {
			const body = JSON.stringify(object);
			__privateGet(this, _preparedHeaders) ?? __privateSet(this, _preparedHeaders, {});
			__privateGet(this, _preparedHeaders)['content-type'] = 'application/json; charset=UTF-8';
			return typeof arg === 'number' ? this.newResponse(body, arg, headers) : this.newResponse(body, arg);
		};
		this.html = (html, arg, headers) => {
			__privateGet(this, _preparedHeaders) ?? __privateSet(this, _preparedHeaders, {});
			__privateGet(this, _preparedHeaders)['content-type'] = 'text/html; charset=UTF-8';
			if (typeof html === 'object') {
				if (!(html instanceof Promise)) {
					html = html.toString();
				}
				if (html instanceof Promise) {
					return html.then((html2) => resolveCallback(html2, HtmlEscapedCallbackPhase.Stringify, false, {})).then((html2) => {
						return typeof arg === 'number' ? this.newResponse(html2, arg, headers) : this.newResponse(html2, arg);
					});
				}
			}
			return typeof arg === 'number' ? this.newResponse(html, arg, headers) : this.newResponse(html, arg);
		};
		this.redirect = (location, status = 302) => {
			__privateGet(this, _headers) ?? __privateSet(this, _headers, new Headers());
			__privateGet(this, _headers).set('Location', location);
			return this.newResponse(null, status);
		};
		this.notFound = () => {
			return this.notFoundHandler(this);
		};
		this.req = req;
		if (options) {
			__privateSet(this, _executionCtx, options.executionCtx);
			this.env = options.env;
			if (options.notFoundHandler) {
				this.notFoundHandler = options.notFoundHandler;
			}
		}
	}

	get event() {
		if (__privateGet(this, _executionCtx) && 'respondWith' in __privateGet(this, _executionCtx)) {
			return __privateGet(this, _executionCtx);
		} else {
			throw Error('This context has no FetchEvent');
		}
	}

	get executionCtx() {
		if (__privateGet(this, _executionCtx)) {
			return __privateGet(this, _executionCtx);
		} else {
			throw Error('This context has no ExecutionContext');
		}
	}

	get res() {
		__privateSet(this, _isFresh, false);
		return __privateGet(this, _res) || __privateSet(this, _res, new Response('404 Not Found', { status: 404 }));
	}

	set res(_res2) {
		__privateSet(this, _isFresh, false);
		if (__privateGet(this, _res) && _res2) {
			__privateGet(this, _res).headers.delete('content-type');
			for (const [k, v] of __privateGet(this, _res).headers.entries()) {
				if (k === 'set-cookie') {
					const cookies = __privateGet(this, _res).headers.getSetCookie();
					_res2.headers.delete('set-cookie');
					for (const cookie of cookies) {
						_res2.headers.append('set-cookie', cookie);
					}
				} else {
					_res2.headers.set(k, v);
				}
			}
		}
		__privateSet(this, _res, _res2);
		this.finalized = true;
	}

	get var() {
		return { ...this._var };
	}
};
_status = /* @__PURE__ */ new WeakMap();
_executionCtx = /* @__PURE__ */ new WeakMap();
_headers = /* @__PURE__ */ new WeakMap();
_preparedHeaders = /* @__PURE__ */ new WeakMap();
_res = /* @__PURE__ */ new WeakMap();
_isFresh = /* @__PURE__ */ new WeakMap();

// node_modules/hono/dist/compose.js
var compose = (middleware, onError, onNotFound) => {
	return (context, next) => {
		let index = -1;
		return dispatch(0);

		async function dispatch(i) {
			if (i <= index) {
				throw new Error('next() called multiple times');
			}
			index = i;
			let res;
			let isError = false;
			let handler;
			if (middleware[i]) {
				handler = middleware[i][0][0];
				if (context instanceof Context) {
					context.req.routeIndex = i;
				}
			} else {
				handler = i === middleware.length && next || void 0;
			}
			if (!handler) {
				if (context instanceof Context && context.finalized === false && onNotFound) {
					res = await onNotFound(context);
				}
			} else {
				try {
					res = await handler(context, () => {
						return dispatch(i + 1);
					});
				} catch (err) {
					if (err instanceof Error && context instanceof Context && onError) {
						context.error = err;
						res = await onError(err, context);
						isError = true;
					} else {
						throw err;
					}
				}
			}
			if (res && (context.finalized === false || isError)) {
				context.res = res;
			}
			return context;
		}
	};
};

// node_modules/hono/dist/http-exception.js
var HTTPException = class extends Error {
	constructor(status = 500, options) {
		super(options?.message);
		this.res = options?.res;
		this.status = status;
	}

	getResponse() {
		if (this.res) {
			return this.res;
		}
		return new Response(this.message, {
			status: this.status
		});
	}
};

// node_modules/hono/dist/utils/body.js
var parseBody = async (request, options = { all: false }) => {
	const headers = request instanceof HonoRequest ? request.raw.headers : request.headers;
	const contentType = headers.get('Content-Type');
	if (isFormDataContent(contentType)) {
		return parseFormData(request, options);
	}
	return {};
};

function isFormDataContent(contentType) {
	if (contentType === null) {
		return false;
	}
	return contentType.startsWith('multipart/form-data') || contentType.startsWith('application/x-www-form-urlencoded');
}

async function parseFormData(request, options) {
	const formData = await request.formData();
	if (formData) {
		return convertFormDataToBodyData(formData, options);
	}
	return {};
}

function convertFormDataToBodyData(formData, options) {
	const form = {};
	formData.forEach((value, key) => {
		const shouldParseAllValues = options.all || key.endsWith('[]');
		if (!shouldParseAllValues) {
			form[key] = value;
		} else {
			handleParsingAllValues(form, key, value);
		}
	});
	return form;
}

var handleParsingAllValues = (form, key, value) => {
	if (form[key] && isArrayField(form[key])) {
		appendToExistingArray(form[key], value);
	} else if (form[key]) {
		convertToNewArray(form, key, value);
	} else {
		form[key] = value;
	}
};

function isArrayField(field) {
	return Array.isArray(field);
}

var appendToExistingArray = (arr, value) => {
	arr.push(value);
};
var convertToNewArray = (form, key, value) => {
	form[key] = [form[key], value];
};

// node_modules/hono/dist/utils/url.js
var splitPath = (path) => {
	const paths = path.split('/');
	if (paths[0] === '') {
		paths.shift();
	}
	return paths;
};
var splitRoutingPath = (routePath) => {
	const { groups, path } = extractGroupsFromPath(routePath);
	const paths = splitPath(path);
	return replaceGroupMarks(paths, groups);
};
var extractGroupsFromPath = (path) => {
	const groups = [];
	path = path.replace(/\{[^}]+\}/g, (match, index) => {
		const mark = `@${index}`;
		groups.push([mark, match]);
		return mark;
	});
	return { groups, path };
};
var replaceGroupMarks = (paths, groups) => {
	for (let i = groups.length - 1; i >= 0; i--) {
		const [mark] = groups[i];
		for (let j = paths.length - 1; j >= 0; j--) {
			if (paths[j].includes(mark)) {
				paths[j] = paths[j].replace(mark, groups[i][1]);
				break;
			}
		}
	}
	return paths;
};
var patternCache = {};
var getPattern = (label) => {
	if (label === '*') {
		return '*';
	}
	const match = label.match(/^\:([^\{\}]+)(?:\{(.+)\})?$/);
	if (match) {
		if (!patternCache[label]) {
			if (match[2]) {
				patternCache[label] = [label, match[1], new RegExp('^' + match[2] + '$')];
			} else {
				patternCache[label] = [label, match[1], true];
			}
		}
		return patternCache[label];
	}
	return null;
};
var getPath = (request) => {
	const match = request.url.match(/^https?:\/\/[^/]+(\/[^?]*)/);
	return match ? match[1] : '';
};
var getQueryStrings = (url) => {
	const queryIndex = url.indexOf('?', 8);
	return queryIndex === -1 ? '' : '?' + url.slice(queryIndex + 1);
};
var getPathNoStrict = (request) => {
	const result = getPath(request);
	return result.length > 1 && result[result.length - 1] === '/' ? result.slice(0, -1) : result;
};
var mergePath = (...paths) => {
	let p = '';
	let endsWithSlash = false;
	for (let path of paths) {
		if (p[p.length - 1] === '/') {
			p = p.slice(0, -1);
			endsWithSlash = true;
		}
		if (path[0] !== '/') {
			path = `/${path}`;
		}
		if (path === '/' && endsWithSlash) {
			p = `${p}/`;
		} else if (path !== '/') {
			p = `${p}${path}`;
		}
		if (path === '/' && p === '') {
			p = '/';
		}
	}
	return p;
};
var checkOptionalParameter = (path) => {
	if (!path.match(/\:.+\?$/)) {
		return null;
	}
	const segments = path.split('/');
	const results = [];
	let basePath = '';
	segments.forEach((segment) => {
		if (segment !== '' && !/\:/.test(segment)) {
			basePath += '/' + segment;
		} else if (/\:/.test(segment)) {
			if (/\?/.test(segment)) {
				if (results.length === 0 && basePath === '') {
					results.push('/');
				} else {
					results.push(basePath);
				}
				const optionalSegment = segment.replace('?', '');
				basePath += '/' + optionalSegment;
				results.push(basePath);
			} else {
				basePath += '/' + segment;
			}
		}
	});
	return results.filter((v, i, a) => a.indexOf(v) === i);
};
var _decodeURI = (value) => {
	if (!/[%+]/.test(value)) {
		return value;
	}
	if (value.indexOf('+') !== -1) {
		value = value.replace(/\+/g, ' ');
	}
	return /%/.test(value) ? decodeURIComponent_(value) : value;
};
var _getQueryParam = (url, key, multiple) => {
	let encoded;
	if (!multiple && key && !/[%+]/.test(key)) {
		let keyIndex2 = url.indexOf(`?${key}`, 8);
		if (keyIndex2 === -1) {
			keyIndex2 = url.indexOf(`&${key}`, 8);
		}
		while (keyIndex2 !== -1) {
			const trailingKeyCode = url.charCodeAt(keyIndex2 + key.length + 1);
			if (trailingKeyCode === 61) {
				const valueIndex = keyIndex2 + key.length + 2;
				const endIndex = url.indexOf('&', valueIndex);
				return _decodeURI(url.slice(valueIndex, endIndex === -1 ? void 0 : endIndex));
			} else if (trailingKeyCode == 38 || isNaN(trailingKeyCode)) {
				return '';
			}
			keyIndex2 = url.indexOf(`&${key}`, keyIndex2 + 1);
		}
		encoded = /[%+]/.test(url);
		if (!encoded) {
			return void 0;
		}
	}
	const results = {};
	encoded ?? (encoded = /[%+]/.test(url));
	let keyIndex = url.indexOf('?', 8);
	while (keyIndex !== -1) {
		const nextKeyIndex = url.indexOf('&', keyIndex + 1);
		let valueIndex = url.indexOf('=', keyIndex);
		if (valueIndex > nextKeyIndex && nextKeyIndex !== -1) {
			valueIndex = -1;
		}
		let name = url.slice(
			keyIndex + 1,
			valueIndex === -1 ? nextKeyIndex === -1 ? void 0 : nextKeyIndex : valueIndex
		);
		if (encoded) {
			name = _decodeURI(name);
		}
		keyIndex = nextKeyIndex;
		if (name === '') {
			continue;
		}
		let value;
		if (valueIndex === -1) {
			value = '';
		} else {
			value = url.slice(valueIndex + 1, nextKeyIndex === -1 ? void 0 : nextKeyIndex);
			if (encoded) {
				value = _decodeURI(value);
			}
		}
		if (multiple) {
			if (!(results[name] && Array.isArray(results[name]))) {
				results[name] = [];
			}
			;
			results[name].push(value);
		} else {
			results[name] ?? (results[name] = value);
		}
	}
	return key ? results[key] : results;
};
var getQueryParam = _getQueryParam;
var getQueryParams = (url, key) => {
	return _getQueryParam(url, key, true);
};
var decodeURIComponent_ = decodeURIComponent;

// node_modules/hono/dist/request.js
var __accessCheck2 = (obj, member, msg) => {
	if (!member.has(obj))
		throw TypeError('Cannot ' + msg);
};
var __privateGet2 = (obj, member, getter) => {
	__accessCheck2(obj, member, 'read from private field');
	return getter ? getter.call(obj) : member.get(obj);
};
var __privateAdd2 = (obj, member, value) => {
	if (member.has(obj))
		throw TypeError('Cannot add the same private member more than once');
	member instanceof WeakSet ? member.add(obj) : member.set(obj, value);
};
var __privateSet2 = (obj, member, value, setter) => {
	__accessCheck2(obj, member, 'write to private field');
	setter ? setter.call(obj, value) : member.set(obj, value);
	return value;
};
var _validatedData;
var _matchResult;
var HonoRequest = class {
	constructor(request, path = '/', matchResult = [[]]) {
		__privateAdd2(this, _validatedData, void 0);
		__privateAdd2(this, _matchResult, void 0);
		this.routeIndex = 0;
		this.bodyCache = {};
		this.cachedBody = (key) => {
			const { bodyCache, raw: raw2 } = this;
			const cachedBody = bodyCache[key];
			if (cachedBody) {
				return cachedBody;
			}
			if (bodyCache.arrayBuffer) {
				return (async () => {
					return await new Response(bodyCache.arrayBuffer)[key]();
				})();
			}
			return bodyCache[key] = raw2[key]();
		};
		this.raw = request;
		this.path = path;
		__privateSet2(this, _matchResult, matchResult);
		__privateSet2(this, _validatedData, {});
	}

	param(key) {
		return key ? this.getDecodedParam(key) : this.getAllDecodedParams();
	}

	getDecodedParam(key) {
		const paramKey = __privateGet2(this, _matchResult)[0][this.routeIndex][1][key];
		const param = this.getParamValue(paramKey);
		return param ? /\%/.test(param) ? decodeURIComponent_(param) : param : void 0;
	}

	getAllDecodedParams() {
		const decoded = {};
		const keys = Object.keys(__privateGet2(this, _matchResult)[0][this.routeIndex][1]);
		for (const key of keys) {
			const value = this.getParamValue(__privateGet2(this, _matchResult)[0][this.routeIndex][1][key]);
			if (value && typeof value === 'string') {
				decoded[key] = /\%/.test(value) ? decodeURIComponent_(value) : value;
			}
		}
		return decoded;
	}

	getParamValue(paramKey) {
		return __privateGet2(this, _matchResult)[1] ? __privateGet2(this, _matchResult)[1][paramKey] : paramKey;
	}

	query(key) {
		return getQueryParam(this.url, key);
	}

	queries(key) {
		return getQueryParams(this.url, key);
	}

	header(name) {
		if (name) {
			return this.raw.headers.get(name.toLowerCase()) ?? void 0;
		}
		const headerData = {};
		this.raw.headers.forEach((value, key) => {
			headerData[key] = value;
		});
		return headerData;
	}

	async parseBody(options) {
		if (this.bodyCache.parsedBody) {
			return this.bodyCache.parsedBody;
		}
		const parsedBody = await parseBody(this, options);
		this.bodyCache.parsedBody = parsedBody;
		return parsedBody;
	}

	json() {
		return this.cachedBody('json');
	}

	text() {
		return this.cachedBody('text');
	}

	arrayBuffer() {
		return this.cachedBody('arrayBuffer');
	}

	blob() {
		return this.cachedBody('blob');
	}

	formData() {
		return this.cachedBody('formData');
	}

	addValidatedData(target, data) {
		__privateGet2(this, _validatedData)[target] = data;
	}

	valid(target) {
		return __privateGet2(this, _validatedData)[target];
	}

	get url() {
		return this.raw.url;
	}

	get method() {
		return this.raw.method;
	}

	get matchedRoutes() {
		return __privateGet2(this, _matchResult)[0].map(([[, route]]) => route);
	}

	get routePath() {
		return __privateGet2(this, _matchResult)[0].map(([[, route]]) => route)[this.routeIndex].path;
	}
};
_validatedData = /* @__PURE__ */ new WeakMap();
_matchResult = /* @__PURE__ */ new WeakMap();

// node_modules/hono/dist/router.js
var METHOD_NAME_ALL = 'ALL';
var METHOD_NAME_ALL_LOWERCASE = 'all';
var METHODS = ['get', 'post', 'put', 'delete', 'options', 'patch'];
var MESSAGE_MATCHER_IS_ALREADY_BUILT = 'Can not add a route since the matcher is already built.';
var UnsupportedPathError = class extends Error {
};

// node_modules/hono/dist/hono-base.js
var __accessCheck3 = (obj, member, msg) => {
	if (!member.has(obj))
		throw TypeError('Cannot ' + msg);
};
var __privateGet3 = (obj, member, getter) => {
	__accessCheck3(obj, member, 'read from private field');
	return getter ? getter.call(obj) : member.get(obj);
};
var __privateAdd3 = (obj, member, value) => {
	if (member.has(obj))
		throw TypeError('Cannot add the same private member more than once');
	member instanceof WeakSet ? member.add(obj) : member.set(obj, value);
};
var __privateSet3 = (obj, member, value, setter) => {
	__accessCheck3(obj, member, 'write to private field');
	setter ? setter.call(obj, value) : member.set(obj, value);
	return value;
};
var COMPOSED_HANDLER = Symbol('composedHandler');

function defineDynamicClass() {
	return class {
	};
}

var notFoundHandler = (c) => {
	return c.text('404 Not Found', 404);
};
var errorHandler = (err, c) => {
	if (err instanceof HTTPException) {
		return err.getResponse();
	}
	console.error(err);
	return c.text('Internal Server Error', 500);
};
var _path;
var _Hono = class extends defineDynamicClass() {
	constructor(options = {}) {
		super();
		this._basePath = '/';
		__privateAdd3(this, _path, '/');
		this.routes = [];
		this.notFoundHandler = notFoundHandler;
		this.errorHandler = errorHandler;
		this.onError = (handler) => {
			this.errorHandler = handler;
			return this;
		};
		this.notFound = (handler) => {
			this.notFoundHandler = handler;
			return this;
		};
		this.fetch = (request, Env, executionCtx) => {
			return this.dispatch(request, executionCtx, Env, request.method);
		};
		this.request = (input, requestInit, Env, executionCtx) => {
			if (input instanceof Request) {
				if (requestInit !== void 0) {
					input = new Request(input, requestInit);
				}
				return this.fetch(input, Env, executionCtx);
			}
			input = input.toString();
			const path = /^https?:\/\//.test(input) ? input : `http://localhost${mergePath('/', input)}`;
			const req = new Request(path, requestInit);
			return this.fetch(req, Env, executionCtx);
		};
		this.fire = () => {
			addEventListener('fetch', (event) => {
				event.respondWith(this.dispatch(event.request, event, void 0, event.request.method));
			});
		};
		const allMethods = [...METHODS, METHOD_NAME_ALL_LOWERCASE];
		allMethods.map((method) => {
			this[method] = (args1, ...args) => {
				if (typeof args1 === 'string') {
					__privateSet3(this, _path, args1);
				} else {
					this.addRoute(method, __privateGet3(this, _path), args1);
				}
				args.map((handler) => {
					if (typeof handler !== 'string') {
						this.addRoute(method, __privateGet3(this, _path), handler);
					}
				});
				return this;
			};
		});
		this.on = (method, path, ...handlers) => {
			if (!method) {
				return this;
			}
			for (const p of [path].flat()) {
				__privateSet3(this, _path, p);
				for (const m of [method].flat()) {
					handlers.map((handler) => {
						this.addRoute(m.toUpperCase(), __privateGet3(this, _path), handler);
					});
				}
			}
			return this;
		};
		this.use = (arg1, ...handlers) => {
			if (typeof arg1 === 'string') {
				__privateSet3(this, _path, arg1);
			} else {
				__privateSet3(this, _path, '*');
				handlers.unshift(arg1);
			}
			handlers.map((handler) => {
				this.addRoute(METHOD_NAME_ALL, __privateGet3(this, _path), handler);
			});
			return this;
		};
		const strict = options.strict ?? true;
		delete options.strict;
		Object.assign(this, options);
		this.getPath = strict ? options.getPath ?? getPath : getPathNoStrict;
	}

	clone() {
		const clone = new _Hono({
			router: this.router,
			getPath: this.getPath
		});
		clone.routes = this.routes;
		return clone;
	}

	route(path, app2) {
		const subApp = this.basePath(path);
		if (!app2) {
			return subApp;
		}
		app2.routes.map((r) => {
			let handler;
			if (app2.errorHandler === errorHandler) {
				handler = r.handler;
			} else {
				handler = async (c, next) => (await compose([], app2.errorHandler)(c, () => r.handler(c, next))).res;
				handler[COMPOSED_HANDLER] = r.handler;
			}
			subApp.addRoute(r.method, r.path, handler);
		});
		return this;
	}

	basePath(path) {
		const subApp = this.clone();
		subApp._basePath = mergePath(this._basePath, path);
		return subApp;
	}

	mount(path, applicationHandler, optionHandler) {
		const mergedPath = mergePath(this._basePath, path);
		const pathPrefixLength = mergedPath === '/' ? 0 : mergedPath.length;
		const handler = async (c, next) => {
			let executionContext = void 0;
			try {
				executionContext = c.executionCtx;
			} catch {
			}
			const options = optionHandler ? optionHandler(c) : [c.env, executionContext];
			const optionsArray = Array.isArray(options) ? options : [options];
			const queryStrings = getQueryStrings(c.req.url);
			const res = await applicationHandler(
				new Request(
					new URL((c.req.path.slice(pathPrefixLength) || '/') + queryStrings, c.req.url),
					c.req.raw
				),
				...optionsArray
			);
			if (res) {
				return res;
			}
			await next();
		};
		this.addRoute(METHOD_NAME_ALL, mergePath(path, '*'), handler);
		return this;
	}

	addRoute(method, path, handler) {
		method = method.toUpperCase();
		path = mergePath(this._basePath, path);
		const r = { path, method, handler };
		this.router.add(method, path, [handler, r]);
		this.routes.push(r);
	}

	matchRoute(method, path) {
		return this.router.match(method, path);
	}

	handleError(err, c) {
		if (err instanceof Error) {
			return this.errorHandler(err, c);
		}
		throw err;
	}

	dispatch(request, executionCtx, env, method) {
		if (method === 'HEAD') {
			return (async () => new Response(null, await this.dispatch(request, executionCtx, env, 'GET')))();
		}
		const path = this.getPath(request, { env });
		const matchResult = this.matchRoute(method, path);
		const c = new Context(new HonoRequest(request, path, matchResult), {
			env,
			executionCtx,
			notFoundHandler: this.notFoundHandler
		});
		if (matchResult[0].length === 1) {
			let res;
			try {
				res = matchResult[0][0][0][0](c, async () => {
					c.res = await this.notFoundHandler(c);
				});
			} catch (err) {
				return this.handleError(err, c);
			}
			return res instanceof Promise ? res.then(
				(resolved) => resolved || (c.finalized ? c.res : this.notFoundHandler(c))
			).catch((err) => this.handleError(err, c)) : res;
		}
		const composed = compose(matchResult[0], this.errorHandler, this.notFoundHandler);
		return (async () => {
			try {
				const context = await composed(c);
				if (!context.finalized) {
					throw new Error(
						'Context is not finalized. You may forget returning Response object or `await next()`'
					);
				}
				return context.res;
			} catch (err) {
				return this.handleError(err, c);
			}
		})();
	}
};
var Hono = _Hono;
_path = /* @__PURE__ */ new WeakMap();

// node_modules/hono/dist/router/reg-exp-router/node.js
var LABEL_REG_EXP_STR = '[^/]+';
var ONLY_WILDCARD_REG_EXP_STR = '.*';
var TAIL_WILDCARD_REG_EXP_STR = '(?:|/.*)';
var PATH_ERROR = Symbol();

function compareKey(a, b) {
	if (a.length === 1) {
		return b.length === 1 ? a < b ? -1 : 1 : -1;
	}
	if (b.length === 1) {
		return 1;
	}
	if (a === ONLY_WILDCARD_REG_EXP_STR || a === TAIL_WILDCARD_REG_EXP_STR) {
		return 1;
	} else if (b === ONLY_WILDCARD_REG_EXP_STR || b === TAIL_WILDCARD_REG_EXP_STR) {
		return -1;
	}
	if (a === LABEL_REG_EXP_STR) {
		return 1;
	} else if (b === LABEL_REG_EXP_STR) {
		return -1;
	}
	return a.length === b.length ? a < b ? -1 : 1 : b.length - a.length;
}

var Node = class {
	constructor() {
		this.children = {};
	}

	insert(tokens, index, paramMap, context, pathErrorCheckOnly) {
		if (tokens.length === 0) {
			if (this.index !== void 0) {
				throw PATH_ERROR;
			}
			if (pathErrorCheckOnly) {
				return;
			}
			this.index = index;
			return;
		}
		const [token, ...restTokens] = tokens;
		const pattern = token === '*' ? restTokens.length === 0 ? ['', '', ONLY_WILDCARD_REG_EXP_STR] : ['', '', LABEL_REG_EXP_STR] : token === '/*' ? ['', '', TAIL_WILDCARD_REG_EXP_STR] : token.match(/^\:([^\{\}]+)(?:\{(.+)\})?$/);
		let node;
		if (pattern) {
			const name = pattern[1];
			let regexpStr = pattern[2] || LABEL_REG_EXP_STR;
			if (name && pattern[2]) {
				regexpStr = regexpStr.replace(/^\((?!\?:)(?=[^)]+\)$)/, '(?:');
				if (/\((?!\?:)/.test(regexpStr)) {
					throw PATH_ERROR;
				}
			}
			node = this.children[regexpStr];
			if (!node) {
				if (Object.keys(this.children).some(
					(k) => k !== ONLY_WILDCARD_REG_EXP_STR && k !== TAIL_WILDCARD_REG_EXP_STR
				)) {
					throw PATH_ERROR;
				}
				if (pathErrorCheckOnly) {
					return;
				}
				node = this.children[regexpStr] = new Node();
				if (name !== '') {
					node.varIndex = context.varIndex++;
				}
			}
			if (!pathErrorCheckOnly && name !== '') {
				paramMap.push([name, node.varIndex]);
			}
		} else {
			node = this.children[token];
			if (!node) {
				if (Object.keys(this.children).some(
					(k) => k.length > 1 && k !== ONLY_WILDCARD_REG_EXP_STR && k !== TAIL_WILDCARD_REG_EXP_STR
				)) {
					throw PATH_ERROR;
				}
				if (pathErrorCheckOnly) {
					return;
				}
				node = this.children[token] = new Node();
			}
		}
		node.insert(restTokens, index, paramMap, context, pathErrorCheckOnly);
	}

	buildRegExpStr() {
		const childKeys = Object.keys(this.children).sort(compareKey);
		const strList = childKeys.map((k) => {
			const c = this.children[k];
			return (typeof c.varIndex === 'number' ? `(${k})@${c.varIndex}` : k) + c.buildRegExpStr();
		});
		if (typeof this.index === 'number') {
			strList.unshift(`#${this.index}`);
		}
		if (strList.length === 0) {
			return '';
		}
		if (strList.length === 1) {
			return strList[0];
		}
		return '(?:' + strList.join('|') + ')';
	}
};

// node_modules/hono/dist/router/reg-exp-router/trie.js
var Trie = class {
	constructor() {
		this.context = { varIndex: 0 };
		this.root = new Node();
	}

	insert(path, index, pathErrorCheckOnly) {
		const paramAssoc = [];
		const groups = [];
		for (let i = 0; ;) {
			let replaced = false;
			path = path.replace(/\{[^}]+\}/g, (m) => {
				const mark = `@\\${i}`;
				groups[i] = [mark, m];
				i++;
				replaced = true;
				return mark;
			});
			if (!replaced) {
				break;
			}
		}
		const tokens = path.match(/(?::[^\/]+)|(?:\/\*$)|./g) || [];
		for (let i = groups.length - 1; i >= 0; i--) {
			const [mark] = groups[i];
			for (let j = tokens.length - 1; j >= 0; j--) {
				if (tokens[j].indexOf(mark) !== -1) {
					tokens[j] = tokens[j].replace(mark, groups[i][1]);
					break;
				}
			}
		}
		this.root.insert(tokens, index, paramAssoc, this.context, pathErrorCheckOnly);
		return paramAssoc;
	}

	buildRegExp() {
		let regexp = this.root.buildRegExpStr();
		if (regexp === '') {
			return [/^$/, [], []];
		}
		let captureIndex = 0;
		const indexReplacementMap = [];
		const paramReplacementMap = [];
		regexp = regexp.replace(/#(\d+)|@(\d+)|\.\*\$/g, (_, handlerIndex, paramIndex) => {
			if (typeof handlerIndex !== 'undefined') {
				indexReplacementMap[++captureIndex] = Number(handlerIndex);
				return '$()';
			}
			if (typeof paramIndex !== 'undefined') {
				paramReplacementMap[Number(paramIndex)] = ++captureIndex;
				return '';
			}
			return '';
		});
		return [new RegExp(`^${regexp}`), indexReplacementMap, paramReplacementMap];
	}
};

// node_modules/hono/dist/router/reg-exp-router/router.js
var emptyParam = [];
var nullMatcher = [/^$/, [], {}];
var wildcardRegExpCache = {};

function buildWildcardRegExp(path) {
	return wildcardRegExpCache[path] ?? (wildcardRegExpCache[path] = new RegExp(
		path === '*' ? '' : `^${path.replace(/\/\*/, '(?:|/.*)')}$`
	));
}

function clearWildcardRegExpCache() {
	wildcardRegExpCache = {};
}

function buildMatcherFromPreprocessedRoutes(routes) {
	const trie = new Trie();
	const handlerData = [];
	if (routes.length === 0) {
		return nullMatcher;
	}
	const routesWithStaticPathFlag = routes.map(
		(route) => [!/\*|\/:/.test(route[0]), ...route]
	).sort(
		([isStaticA, pathA], [isStaticB, pathB]) => isStaticA ? 1 : isStaticB ? -1 : pathA.length - pathB.length
	);
	const staticMap = {};
	for (let i = 0, j = -1, len = routesWithStaticPathFlag.length; i < len; i++) {
		const [pathErrorCheckOnly, path, handlers] = routesWithStaticPathFlag[i];
		if (pathErrorCheckOnly) {
			staticMap[path] = [handlers.map(([h]) => [h, {}]), emptyParam];
		} else {
			j++;
		}
		let paramAssoc;
		try {
			paramAssoc = trie.insert(path, j, pathErrorCheckOnly);
		} catch (e) {
			throw e === PATH_ERROR ? new UnsupportedPathError(path) : e;
		}
		if (pathErrorCheckOnly) {
			continue;
		}
		handlerData[j] = handlers.map(([h, paramCount]) => {
			const paramIndexMap = {};
			paramCount -= 1;
			for (; paramCount >= 0; paramCount--) {
				const [key, value] = paramAssoc[paramCount];
				paramIndexMap[key] = value;
			}
			return [h, paramIndexMap];
		});
	}
	const [regexp, indexReplacementMap, paramReplacementMap] = trie.buildRegExp();
	for (let i = 0, len = handlerData.length; i < len; i++) {
		for (let j = 0, len2 = handlerData[i].length; j < len2; j++) {
			const map = handlerData[i][j]?.[1];
			if (!map) {
				continue;
			}
			const keys = Object.keys(map);
			for (let k = 0, len3 = keys.length; k < len3; k++) {
				map[keys[k]] = paramReplacementMap[map[keys[k]]];
			}
		}
	}
	const handlerMap = [];
	for (const i in indexReplacementMap) {
		handlerMap[i] = handlerData[indexReplacementMap[i]];
	}
	return [regexp, handlerMap, staticMap];
}

function findMiddleware(middleware, path) {
	if (!middleware) {
		return void 0;
	}
	for (const k of Object.keys(middleware).sort((a, b) => b.length - a.length)) {
		if (buildWildcardRegExp(k).test(path)) {
			return [...middleware[k]];
		}
	}
	return void 0;
}

var RegExpRouter = class {
	constructor() {
		this.name = 'RegExpRouter';
		this.middleware = { [METHOD_NAME_ALL]: {} };
		this.routes = { [METHOD_NAME_ALL]: {} };
	}

	add(method, path, handler) {
		var _a;
		const { middleware, routes } = this;
		if (!middleware || !routes) {
			throw new Error(MESSAGE_MATCHER_IS_ALREADY_BUILT);
		}
		if (!middleware[method]) {
			;
			[middleware, routes].forEach((handlerMap) => {
				handlerMap[method] = {};
				Object.keys(handlerMap[METHOD_NAME_ALL]).forEach((p) => {
					handlerMap[method][p] = [...handlerMap[METHOD_NAME_ALL][p]];
				});
			});
		}
		if (path === '/*') {
			path = '*';
		}
		const paramCount = (path.match(/\/:/g) || []).length;
		if (/\*$/.test(path)) {
			const re = buildWildcardRegExp(path);
			if (method === METHOD_NAME_ALL) {
				Object.keys(middleware).forEach((m) => {
					var _a2;
					(_a2 = middleware[m])[path] || (_a2[path] = findMiddleware(middleware[m], path) || findMiddleware(middleware[METHOD_NAME_ALL], path) || []);
				});
			} else {
				(_a = middleware[method])[path] || (_a[path] = findMiddleware(middleware[method], path) || findMiddleware(middleware[METHOD_NAME_ALL], path) || []);
			}
			Object.keys(middleware).forEach((m) => {
				if (method === METHOD_NAME_ALL || method === m) {
					Object.keys(middleware[m]).forEach((p) => {
						re.test(p) && middleware[m][p].push([handler, paramCount]);
					});
				}
			});
			Object.keys(routes).forEach((m) => {
				if (method === METHOD_NAME_ALL || method === m) {
					Object.keys(routes[m]).forEach(
						(p) => re.test(p) && routes[m][p].push([handler, paramCount])
					);
				}
			});
			return;
		}
		const paths = checkOptionalParameter(path) || [path];
		for (let i = 0, len = paths.length; i < len; i++) {
			const path2 = paths[i];
			Object.keys(routes).forEach((m) => {
				var _a2;
				if (method === METHOD_NAME_ALL || method === m) {
					(_a2 = routes[m])[path2] || (_a2[path2] = [
						...findMiddleware(middleware[m], path2) || findMiddleware(middleware[METHOD_NAME_ALL], path2) || []
					]);
					routes[m][path2].push([handler, paramCount - len + i + 1]);
				}
			});
		}
	}

	match(method, path) {
		clearWildcardRegExpCache();
		const matchers = this.buildAllMatchers();
		this.match = (method2, path2) => {
			const matcher = matchers[method2] || matchers[METHOD_NAME_ALL];
			const staticMatch = matcher[2][path2];
			if (staticMatch) {
				return staticMatch;
			}
			const match = path2.match(matcher[0]);
			if (!match) {
				return [[], emptyParam];
			}
			const index = match.indexOf('', 1);
			return [matcher[1][index], match];
		};
		return this.match(method, path);
	}

	buildAllMatchers() {
		const matchers = {};
		[...Object.keys(this.routes), ...Object.keys(this.middleware)].forEach((method) => {
			matchers[method] || (matchers[method] = this.buildMatcher(method));
		});
		this.middleware = this.routes = void 0;
		return matchers;
	}

	buildMatcher(method) {
		const routes = [];
		let hasOwnRoute = method === METHOD_NAME_ALL;
		[this.middleware, this.routes].forEach((r) => {
			const ownRoute = r[method] ? Object.keys(r[method]).map((path) => [path, r[method][path]]) : [];
			if (ownRoute.length !== 0) {
				hasOwnRoute || (hasOwnRoute = true);
				routes.push(...ownRoute);
			} else if (method !== METHOD_NAME_ALL) {
				routes.push(
					...Object.keys(r[METHOD_NAME_ALL]).map((path) => [path, r[METHOD_NAME_ALL][path]])
				);
			}
		});
		if (!hasOwnRoute) {
			return null;
		} else {
			return buildMatcherFromPreprocessedRoutes(routes);
		}
	}
};

// node_modules/hono/dist/router/smart-router/router.js
var SmartRouter = class {
	constructor(init) {
		this.name = 'SmartRouter';
		this.routers = [];
		this.routes = [];
		Object.assign(this, init);
	}

	add(method, path, handler) {
		if (!this.routes) {
			throw new Error(MESSAGE_MATCHER_IS_ALREADY_BUILT);
		}
		this.routes.push([method, path, handler]);
	}

	match(method, path) {
		if (!this.routes) {
			throw new Error('Fatal error');
		}
		const { routers, routes } = this;
		const len = routers.length;
		let i = 0;
		let res;
		for (; i < len; i++) {
			const router = routers[i];
			try {
				routes.forEach((args) => {
					router.add(...args);
				});
				res = router.match(method, path);
			} catch (e) {
				if (e instanceof UnsupportedPathError) {
					continue;
				}
				throw e;
			}
			this.match = router.match.bind(router);
			this.routers = [router];
			this.routes = void 0;
			break;
		}
		if (i === len) {
			throw new Error('Fatal error');
		}
		this.name = `SmartRouter + ${this.activeRouter.name}`;
		return res;
	}

	get activeRouter() {
		if (this.routes || this.routers.length !== 1) {
			throw new Error('No active router has been determined yet.');
		}
		return this.routers[0];
	}
};

// node_modules/hono/dist/router/trie-router/node.js
var Node2 = class {
	constructor(method, handler, children) {
		this.order = 0;
		this.params = {};
		this.children = children || {};
		this.methods = [];
		this.name = '';
		if (method && handler) {
			const m = {};
			m[method] = { handler, possibleKeys: [], score: 0, name: this.name };
			this.methods = [m];
		}
		this.patterns = [];
	}

	insert(method, path, handler) {
		this.name = `${method} ${path}`;
		this.order = ++this.order;
		let curNode = this;
		const parts = splitRoutingPath(path);
		const possibleKeys = [];
		const parentPatterns = [];
		for (let i = 0, len = parts.length; i < len; i++) {
			const p = parts[i];
			if (Object.keys(curNode.children).includes(p)) {
				parentPatterns.push(...curNode.patterns);
				curNode = curNode.children[p];
				const pattern2 = getPattern(p);
				if (pattern2) {
					possibleKeys.push(pattern2[1]);
				}
				continue;
			}
			curNode.children[p] = new Node2();
			const pattern = getPattern(p);
			if (pattern) {
				curNode.patterns.push(pattern);
				parentPatterns.push(...curNode.patterns);
				possibleKeys.push(pattern[1]);
			}
			parentPatterns.push(...curNode.patterns);
			curNode = curNode.children[p];
		}
		if (!curNode.methods.length) {
			curNode.methods = [];
		}
		const m = {};
		const handlerSet = {
			handler,
			possibleKeys: possibleKeys.filter((v, i, a) => a.indexOf(v) === i),
			name: this.name,
			score: this.order
		};
		m[method] = handlerSet;
		curNode.methods.push(m);
		return curNode;
	}

	gHSets(node, method, nodeParams, params) {
		const handlerSets = [];
		for (let i = 0, len = node.methods.length; i < len; i++) {
			const m = node.methods[i];
			const handlerSet = m[method] || m[METHOD_NAME_ALL];
			const processedSet = {};
			if (handlerSet !== void 0) {
				handlerSet.params = {};
				handlerSet.possibleKeys.forEach((key) => {
					const processed = processedSet[handlerSet.name];
					handlerSet.params[key] = params[key] && !processed ? params[key] : nodeParams[key] ?? params[key];
					processedSet[handlerSet.name] = true;
				});
				handlerSets.push(handlerSet);
			}
		}
		return handlerSets;
	}

	search(method, path) {
		const handlerSets = [];
		this.params = {};
		const curNode = this;
		let curNodes = [curNode];
		const parts = splitPath(path);
		for (let i = 0, len = parts.length; i < len; i++) {
			const part = parts[i];
			const isLast = i === len - 1;
			const tempNodes = [];
			for (let j = 0, len2 = curNodes.length; j < len2; j++) {
				const node = curNodes[j];
				const nextNode = node.children[part];
				if (nextNode) {
					nextNode.params = node.params;
					if (isLast === true) {
						if (nextNode.children['*']) {
							handlerSets.push(...this.gHSets(nextNode.children['*'], method, node.params, {}));
						}
						handlerSets.push(...this.gHSets(nextNode, method, node.params, {}));
					} else {
						tempNodes.push(nextNode);
					}
				}
				for (let k = 0, len3 = node.patterns.length; k < len3; k++) {
					const pattern = node.patterns[k];
					const params = { ...node.params };
					if (pattern === '*') {
						const astNode = node.children['*'];
						if (astNode) {
							handlerSets.push(...this.gHSets(astNode, method, node.params, {}));
							tempNodes.push(astNode);
						}
						continue;
					}
					if (part === '') {
						continue;
					}
					const [key, name, matcher] = pattern;
					const child = node.children[key];
					const restPathString = parts.slice(i).join('/');
					if (matcher instanceof RegExp && matcher.test(restPathString)) {
						params[name] = restPathString;
						handlerSets.push(...this.gHSets(child, method, node.params, params));
						continue;
					}
					if (matcher === true || matcher instanceof RegExp && matcher.test(part)) {
						if (typeof key === 'string') {
							params[name] = part;
							if (isLast === true) {
								handlerSets.push(...this.gHSets(child, method, params, node.params));
								if (child.children['*']) {
									handlerSets.push(...this.gHSets(child.children['*'], method, params, node.params));
								}
							} else {
								child.params = params;
								tempNodes.push(child);
							}
						}
					}
				}
			}
			curNodes = tempNodes;
		}
		const results = handlerSets.sort((a, b) => {
			return a.score - b.score;
		});
		return [results.map(({ handler, params }) => [handler, params])];
	}
};

// node_modules/hono/dist/router/trie-router/router.js
var TrieRouter = class {
	constructor() {
		this.name = 'TrieRouter';
		this.node = new Node2();
	}

	add(method, path, handler) {
		const results = checkOptionalParameter(path);
		if (results) {
			for (const p of results) {
				this.node.insert(method, p, handler);
			}
			return;
		}
		this.node.insert(method, path, handler);
	}

	match(method, path) {
		return this.node.search(method, path);
	}
};

// node_modules/hono/dist/hono.js
var Hono2 = class extends Hono {
	constructor(options = {}) {
		super(options);
		this.router = options.router ?? new SmartRouter({
			routers: [new RegExpRouter(), new TrieRouter()]
		});
	}
};

// node_modules/hono/dist/middleware/cors/index.js
var cors = (options) => {
	const defaults = {
		origin: '*',
		allowMethods: ['GET', 'HEAD', 'PUT', 'POST', 'DELETE', 'PATCH'],
		allowHeaders: [],
		exposeHeaders: []
	};
	const opts = {
		...defaults,
		...options
	};
	const findAllowOrigin = ((optsOrigin) => {
		if (typeof optsOrigin === 'string') {
			return () => optsOrigin;
		} else if (typeof optsOrigin === 'function') {
			return optsOrigin;
		} else {
			return (origin) => optsOrigin.includes(origin) ? origin : optsOrigin[0];
		}
	})(opts.origin);
	return async function cors2(c, next) {
		function set(key, value) {
			c.res.headers.set(key, value);
		}

		const allowOrigin = findAllowOrigin(c.req.header('origin') || '');
		if (allowOrigin) {
			set('Access-Control-Allow-Origin', allowOrigin);
		}
		if (opts.origin !== '*') {
			set('Vary', 'Origin');
		}
		if (opts.credentials) {
			set('Access-Control-Allow-Credentials', 'true');
		}
		if (opts.exposeHeaders?.length) {
			set('Access-Control-Expose-Headers', opts.exposeHeaders.join(','));
		}
		if (c.req.method === 'OPTIONS') {
			if (opts.maxAge != null) {
				set('Access-Control-Max-Age', opts.maxAge.toString());
			}
			if (opts.allowMethods?.length) {
				set('Access-Control-Allow-Methods', opts.allowMethods.join(','));
			}
			let headers = opts.allowHeaders;
			if (!headers?.length) {
				const requestHeaders = c.req.header('Access-Control-Request-Headers');
				if (requestHeaders) {
					headers = requestHeaders.split(/\s*,\s*/);
				}
			}
			if (headers?.length) {
				set('Access-Control-Allow-Headers', headers.join(','));
				c.res.headers.append('Vary', 'Access-Control-Request-Headers');
			}
			c.res.headers.delete('Content-Length');
			c.res.headers.delete('Content-Type');
			return new Response(null, {
				headers: c.res.headers,
				status: 204,
				statusText: c.res.statusText
			});
		}
		await next();
	};
};

// src/worker.js
var user = '';
var telegramToken = '';
var isTelegram = true;
var app = new Hono2();
app.use('/api/*', cors()).options('/*', cors()).post('/api/inviteUser', async (c) => {
	const email = c.req.query('email');
	if (!isEmpty(email) && isEmail(email)) {
		let status = false;
		const { results } = await c.env.DB.prepare('select * from organization').all();
		if (results.length > 0) {
			for (const item of results) {
				const response = await sendEmail(email, item.name, item.token);
				if (response.status === 201) {
					status = true;
					break;
				} else {
					await telegramMessage(`\u9080\u8BF7\u90AE\u4EF6\u53D1\u9001\u5931\u8D25\uFF0C\u8BF7\u68C0\u67E5\u7EC4\u7EC7 ${item.name} \u662F\u5426\u5DF2\u8FBE\u9080\u8BF7\u4E0A\u9650`);
				}
			}
			if (!status) {
				await telegramMessage('\u9080\u8BF7\u90AE\u4EF6\u53D1\u9001\u5931\u8D25\uFF0C\u8BF7\u68C0\u67E5\u7EC4\u7EC7\u662F\u5426\u5DF2\u8FBE\u9080\u8BF7\u4E0A\u9650');
				return await error(c, 500, '\u9080\u8BF7\u90AE\u4EF6\u53D1\u9001\u5931\u8D25,\u8BF7\u8054\u7CFB\u7BA1\u7406\u5458\u3002');
			}
		} else {
			await telegramMessage('\u76EE\u524D\u6682\u65E0\u7EC4\u7EC7\u4FE1\u606F\uFF0C\u8BF7\u5148\u521B\u5EFA\u7EC4\u7EC7');
			return await error(c, 500, '\u6682\u65E0\u7EC4\u7EC7,\u8BF7\u8054\u7CFB\u7BA1\u7406\u5458\u3002');
		}
		return await success(c, '\u9080\u8BF7\u90AE\u4EF6\u5DF2\u53D1\u9001\u3002', null);
	} else {
		return await error(c, 400, '\u65E0\u6548\u90AE\u7BB1\u3002');
	}
}).post('/v1/chat/completions', async (c) => {
	let authorization = '';
	const userAuthorization = c.req.header('Authorization');
	switch (userAuthorization) {
		case 'Bearer ghu_pool':
			const { results } = await c.env.DB.prepare('select * from ghu_pool').all();
			if (results.length === 0) {
				return c.text(JSON.stringify({ message: 'No keys' }), {
					status: 500
				});
			}
			const token = results[Math.floor(Math.random() * results.length)].token;
			authorization = `Bearer ${token}`;
			break;
		default:
			authorization = userAuthorization;
			break;
	}
	const response = await fetch(`https://proxy.cocopilot.org/v1/chat/completions`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: authorization
		},
		body: JSON.stringify(await c.req.json())
	});
	const headers = new Headers(response.headers);
	headers.set('Access-Control-Allow-Origin', '*');
	headers.set('Access-Control-Allow-Headers', '*');
	headers.set('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
	return new Response(response.body, {
		status: response.status,
		headers
	});
}).post('/api/upload', async (c, message, data) => {
	const params = await c.req.json();
	let successCount = 0;
	let failCount = 0;
	let errorMessage = '\u65E0\u6548\u7684Token\uFF1A';
	switch (params.type) {
		case 'user':
			if (params.token.length > 0) {
				for (const token of params.token) {
					if (!isEmpty(token) && token.startsWith('ghu')) {
						const response = await checkGhuStatus(token);
						if (response.status === 200) {
							const count = await c.env.DB.prepare('select count(1) AS total from ghu_pool where token = ?').bind(token).first('total');
							if (count === 0) {
								successCount++;
								await handleContributionTotal(c, params.user);
								await c.env.DB.prepare('insert into ghu_pool (token) values (?)').bind(token).run();
							}
						} else {
							failCount++;
							errorMessage += `${token} |`;
						}
					} else {
						failCount++;
						errorMessage += `${token} |`;
					}
				}
			} else {
				return await error(c, 400, '\u65E0\u6548\u7684\u53C2\u6570\u3002');
			}
			break;
		case 'organization':
			if (!isEmpty(params.name) && params.token.length > 0) {
				for (const token of params.token) {
					if (params.token.startsWith('ghp')) {
						const response = await checkGhpStatus(params.name, token);
						if (response.status === 200) {
							const count = await c.env.DB.prepare('select count(1) AS total from organization where name = ?').bind(params.name).first('total');
							if (count === 0) {
								successCount++;
								await handleContributionTotal(c, params.user);
								await c.env.DB.prepare('insert into organization (name, token) values (?, ?)').bind(params.name, token).run();
							}
						} else {
							failCount++;
							errorMessage += `${token} |`;
						}
					} else {
						failCount++;
						errorMessage += `${token} |`;
					}
				}
			} else {
				return error(c, 400, '\u65E0\u6548\u7684\u53C2\u6570\u3002');
			}
			break;
	}
	errorMessage = errorMessage.substring(0, errorMessage.length - 1);
	return await success(c, `\u6210\u529F\u4E0A\u4F20\uFF1A${successCount}\u4E2A\uFF0C\u4E0A\u4F20\u5931\u8D25\uFF1A${failCount}\u4E2A\uFF0C${errorMessage}`, null);
}).get('/api/contribution/list', async (c) => {
	const { results } = await c.env.DB.prepare('select * from contribution order by total desc LIMIT 10').all();
	return await success(c, '\u67E5\u8BE2\u6210\u529F', results);
});

async function telegramMessage(message) {
	if (isTelegram) {
		await fetch(`https://api.telegram.org/bot${telegramToken}/sendMessage`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				chat_id: user,
				text: message
			})
		});
	}
}

async function sendEmail(email, orgName, orgToken) {
	return await fetch(`https://api.github.com/orgs/${orgName}/invitations`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'Accept': 'application/vnd.github+json',
			'X-GitHub-Api-Version': '2022-11-28',
			'Authorization': `Bearer ${orgToken}`,
			'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
		},
		body: JSON.stringify({
			email,
			role: 'direct_member'
		})
	});
}

async function checkGhuStatus(token) {
	return await fetch('https://api.github.com/copilot_internal/v2/token', {
		method: 'GET',
		headers: {
			'Authorization': `Bearer ${token}`,
			'Host': 'api.github.com',
			'Accept': '*/*',
			'Editor-Version': 'vscode/1.86.2',
			'Editor-Plugin-Version': 'copilot/1.171.0',
			'User-Agent': 'GithubCopilot/1.171.0',
			'Accept-Encoding': 'gzip,deflate,br'
		}
	});
}

async function checkGhpStatus(name, token) {
	return await fetch(`https://api.github.com/orgs/${name}/members`, {
		method: 'GET',
		headers: {
			'Authorization': `Bearer ${token}`,
			'Accept': 'application/vnd.github+json',
			'X-GitHub-Api-Version': '2022-11-28',
			'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
		}
	});
}

async function handleContributionTotal(c, name) {
	let contributionTotal = 1;
	const { results } = await c.env.DB.prepare('select * from contribution where name = ?1').bind(name).all();
	if (results.length > 0) {
		contributionTotal = results[0].total + 1;
		await c.env.DB.prepare('update contribution set total = ?1 where name = ?2').bind(contributionTotal, name).run();
	} else {
		await c.env.DB.prepare('insert into contribution (name, total) values (?1, ?2)').bind(name, contributionTotal).run();
	}
}

async function doSomeTaskOnASchedule(env) {
	console.log('\u5B9A\u65F6\u4EFB\u52A1\u5F00\u59CB');
	await checkGhuPoolStatus(env);
	await checkGhpPoolStatus(env);
}

async function checkGhuPoolStatus(env) {
	const { results } = await env.DB.prepare('select * from ghu_pool').all();
	if (results.length === 0) {
		await telegramMessage('\u5BC6\u94A5\u6C60\u4E3A\u7A7A\uFF0C\u8BF7\u53CA\u65F6\u8865\u5145\u5BC6\u94A5');
	} else {
		for (const result of results) {
			const response = await checkGhuStatus(result.token);
			if (response.status !== 200) {
				await env.DB.prepare('delete from ghu_pool where token = ?1').bind(result.token).run();
			}
		}
	}
}

async function checkGhpPoolStatus(env) {
	const { results } = await env.DB.prepare('select * from organization').all();
	if (results.length === 0) {
		await telegramMessage('\u7EC4\u7EC7\u6C60\u4E3A\u7A7A\uFF0C\u8BF7\u53CA\u65F6\u8865\u5145\u5BC6\u94A5');
	} else {
		for (const result of results) {
			const response = await checkGhpStatus(result.name, result.token);
			if (response.status !== 200) {
				await env.DB.prepare('delete from organization where name = ?1').bind(result.name).run();
			}
		}
	}
}

async function success(c, message, data) {
	return c.json({ code: 200, message, data }, {
		status: 200
	});
}

async function error(c, code, message) {
	return c.json({ code, message }, {
		status: code
	});
}

function isEmpty(str) {
	return !str || str.length === 0;
}

function isEmail(str) {
	let emailPattern = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/;
	return emailPattern.test(str);
}

var worker_default = {
	fetch: app.fetch,
	scheduled: async (batch, env) => {
		await doSomeTaskOnASchedule(env);
	}
};
export {
	worker_default as default
};
//# sourceMappingURL=worker.js.map
