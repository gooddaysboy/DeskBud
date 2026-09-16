// ---------------------------------------------------------------------------
// EdgeOne Pages · Node Function（cloud-functions/）· 只读探针：GET /api/geo
//
// 目的（2026-09-16）：取证 EdgeOne Pages Functions 是否向 Node 运行时注入
//   `context.geo`（country / province / city / 经纬度 / ISP），供「官网运维面板·装机地图」选型。
// 性质：只读、无副作用、不落库、no-store；只回显「请求者自己」的 geo，不泄露他人数据。
// 删除：测完可整目录删除，不影响静态站。
//
// 🔴 目录坑（踩过）：EdgeOne Pages 的 Functions 目录是
//    cloud-functions/（Node 20+）/ edge-functions/（V8）——**没有 functions/**（那是 Cloudflare 的约定）。
//    放错目录 ⇒ 路由静默不注册（返回站点 HTML 而非 404）。
// 🔴 运行时差异：Node 走 `context.geo`；V8 走 `request.eo.geo`。本文件是 Node 版。
// ⚠️ 本仓无 _api.js 等内部工具，CORS 自行内联，保持零依赖。
// ---------------------------------------------------------------------------

export async function onRequest(context) {
  const { request, geo, clientIp, server } = context

  const cors = {
    'Content-Type': 'application/json; charset=UTF-8',
    'Access-Control-Allow-Origin': request.headers.get('origin') || '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '600'
  }

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: cors })
  }

  const headers = {}
  for (const [k, v] of request.headers.entries()) headers[k] = v

  // 不猜字段命名：把 geo 的键原样列出，平台无论怎么命名都能看清
  const geoKeys = (geo && typeof geo === 'object') ? Object.keys(geo) : []

  const body = {
    ok: true,
    ts: Date.now(),
    runtime: 'node (cloud-functions)',
    geo_available: geoKeys.length > 0,   // 🔴 关键判据
    geo_keys: geoKeys,
    geo: geo || null,
    client_ip: clientIp || null,
    region: (server && server.region) || null,
    ua: headers['user-agent'] || null,
    accept_language: headers['accept-language'] || null
  }

  return new Response(JSON.stringify(body, null, 2), {
    headers: { ...cors, 'Cache-Control': 'no-store' }
  })
}

export default { onRequest }
