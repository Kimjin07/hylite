'use strict';

const COOKIE = 'hy_compass_session';
const JSON_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
};

function cookieValue(request){
  const raw = request.headers.get('Cookie') || '';
  const item = raw.split(';').map(s => s.trim()).find(s => s.startsWith(COOKIE + '='));
  return item ? decodeURIComponent(item.slice(COOKIE.length + 1)) : null;
}

function isHtmlNavigation(request, pathname){
  const accept = request.headers.get('Accept') || '';
  return accept.includes('text/html') || pathname.endsWith('/') || /\.html$/i.test(pathname);
}

export async function onRequest(context){
  const { request, env } = context;
  const token = cookieValue(request);
  let authorized = false;
  if (token && /^[0-9a-f]{64}$/.test(token) && env.DB){
    try {
      if (Math.random() < 0.02){
        try { await env.DB.prepare("DELETE FROM compass_sessions WHERE expires_at <= datetime('now')").run(); } catch (e) {}
      }
      const row = await env.DB.prepare(
        `SELECT s.token FROM compass_sessions s
         JOIN compass_licenses l ON l.id=s.license_id
         WHERE s.token=?1 AND l.active=1 AND s.expires_at > datetime('now')`
      ).bind(token).first();
      authorized = !!row;
    } catch (e){
      return new Response(JSON.stringify({ ok:false, error:'授权服务暂时不可用' }), { status:503, headers:JSON_HEADERS });
    }
  }
  if (authorized) return context.next();

  const url = new URL(request.url);
  if (isHtmlNavigation(request, url.pathname)){
    const target = url.pathname + url.search;
    return Response.redirect(new URL('/compass-access.html?next=' + encodeURIComponent(target), url), 302);
  }
  return new Response(JSON.stringify({ ok:false, error:'需要激活 English Compass' }), { status:401, headers:JSON_HEADERS });
}
