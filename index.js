const util = require('util');
const http = require('http');
const url = require('url');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const Handlers = compileHandlers({
	'/': WebUI,
	'/:content': ToUrl,
	'/:content/en': EnSmurl,
	'/:content/de': DeSmurl,
});

const HOST = 'https://t1.itaotuo.com/t/';
const urlFilePath = path.resolve(__dirname, './urls.json');
let URLS = loadUrls() || {};

console.log('urls:', URLS);

var server = http.createServer(function(request, response) {
	request.setEncoding('utf-8');
	parseHttpRequestData(request, response);
	//解决http://127.0.0.1:3000/favicon.ico 引起的重复请求
	//if(url_Obj_Json.path != "/favicon.ico"){
	//	response.write(util.inspect(url.parse(request.url, true)));
	//}
	let handler = getHandler(request, response);
	if (! handler) {
		response.writeHead(404, {'Content-Type':'text/html;charset=utf-8'});
		response.write('404 Not Found: ' + request.pathname);
	} else {
		handler(request, response);
	}
	//response.writeHead(301, {'Location': 'http://itbilu.com/'});
	response.end();
});
server.listen(8000);
console.log('HTTP服务器启动中，端口：8000.....');

//////////////////////////////////////////////////////////////////////

function WebUI(req, res) {
	let str = fs.readFileSync(path.resolve(__dirname, './index.html'), 'utf-8');
	res.writeHead(200, {'Content-Type':'text/html;charset=utf-8'});
	res.write(str);
}

function ToUrl(req, res) {
	let key = req.params.content;
	let url = getUrl(key);
	console.log('ToUrl', key, url);
	if (! url) {
		res.writeHead(500, {'Content-Type':'text/html;charset=utf-8'});
		res.write('url error');
	} else {
		res.writeHead(301, {'Location': url});
	}
}

function EnSmurl(req, res) {
	let url = req.params.content;
	url = new Buffer(decodeURIComponent(url), 'base64').toString();
	let smurl = createSmurl(url);
	console.log('EnSmurl', url, smurl);
	if (! smurl) {
		res.writeHead(500, {'Content-Type':'text/html;charset=utf-8'});
		res.write('url error');
	} else {
		res.writeHead(200,{'Content-Type':'text/html;charset=utf-8'});
		res.write(smurl);
	}
}

function DeSmurl(req, res) {
	let key = req.params.content;
	let url = getUrl(key);
	console.log('DeSmurl', key, url);
	if (! url) {
		res.writeHead(500, {'Content-Type':'text/html;charset=utf-8'});
		res.write('url error');
	} else {
		res.writeHead(200,{'Content-Type':'text/html;charset=utf-8'});
		res.write(url);
	}
}

//////////////////////////////////////////////////////////////////////

function createSmurl(url) {
	if (! url || ! url.startsWith('http')) return null;
	let str = MD5(url + '-' + url.length + '-' + url.length * url.length);
	let key = str.substring(str.length - 6);
	if (! key) return null;
	saveUrl(url, key);
	return HOST + key;
}

function getUrl(key) {
	return URLS[key] || null;
}

function loadUrls() {
	let _urls = fs.readFileSync(urlFilePath, 'utf-8');
	let urls;
	try {
		urls = JSON.parse(_urls);
	} catch (e) {};
	return urls;
}

function saveUrl(url, key) {
	URLS[key] = url;
	let str = JSON.stringify(URLS);
	fs.writeFileSync(urlFilePath, str, {flag: 'w'});
}

function MD5(str) {
	let md5 = crypto.createHash('md5');
	md5.update(str, 'utf8');
	return md5.digest('hex');
}

function parseHttpRequestData(request, response) {
	let urlObj = url.parse(request.url, true);
	request.query = urlObj.query;
	request.pathname = urlObj.pathname;
}

function compileHandlers(handlers) {
	let _handlers = {};
	for (let attr in handlers) {
		let arr = attr.split('/');
		if (! _handlers[arr.length]) _handlers[arr.length] = {};
		let o = _handlers[arr.length];
		for (let i = 0; i < arr.length; i ++) {
			let item = arr[i];
			if (! o[item]) o[item] = {};
			if (i === arr.length - 1) o[item] = handlers[attr];
			else o = o[item];
		}
	}
	return _handlers;
}

function getHandler(request, response) {
	let pathname = request.pathname;
	let arr = pathname.split('/');
	let handler = Handlers[arr.length];
	if (! handler) return null;
	for (let item of arr) {
		if (! handler[item]) {
			let param;
			for (let attr in handler) {
				if (attr.startsWith(':')) {
					param = attr.replace(':', '');
					if (! request.params) request.params = {};
					request.params[param] = item;
					handler = handler[attr];
					break;
				}
			}
			if (! param) return null;
		} else {
			handler = handler[item];
		}
	}
	return handler || null;
}




