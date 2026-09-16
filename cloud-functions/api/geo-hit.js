// ---------------------------------------------------------------------------
// EdgeOne Pages · Node Function（cloud-functions/）· GET /api/geo-hit
//
// 作用（2026-09-16 立，1A「网站访客地理分布最小闭环」）：
//   一次调用完成「取位置 + 匿名聚合计数」，让访客地理分布可累积。
//   ① 从平台注入的 context.geo 取访客所在**省级区码**（如 CN-BJ）；
//   ② 服务端把它 +1 落到 Open-Kounter 计数器（target = geo:CN-BJ）。
//   客户端只需 fetch('/api/geo-hit')，不必知道 kounter 存在、不必处理跨域，
//   将来桌面端 / 安卓端也能调同一个 URL（原生请求无 Origin，kounter 放行）。
//
// 隐私红线（刻意为之，别改）：
//   · 只对「省级区码」做 +1 聚合 —— 不落 IP、不落经纬度、不落城市、不落 UA、不落设备号；
//   · 回显的 region 是请求者**自己**的位置（与已有的 /api/geo 探针同性质），不泄露他人数据；
//   · 数据落在自家 kounter 的 Blob 里，读汇总必须带 ADMIN_TOKEN，不进任何公开页面。
//   依据：PIPL —— 个人位置数据只做本地/聚合、不做个人粒度留存。
//
// 计数失败不影响访客：任何异常都吞掉，照常返回 200 { ok:true, stored:false }。
//
// 🔴 no-store 必须有：本端点是 GET，少了它 CDN 会缓存响应 ⇒ 只有第一个访客被计数。
// 🔴 路由约定：Node 版放 cloud-functions/（不是 functions/），否则静默不注册。
// ---------------------------------------------------------------------------

const COUNTER_URL = 'https://kounter.deskbud.xyz/api/counter'
// kounter 的 inc/batch_inc 校验 Origin 白名单（已含 deskbud.xyz）；服务端调用显式带上更可预期
const REPORT_ORIGIN = 'https://deskbud.xyz'
const UPSTREAM_TIMEOUT_MS = 5000

/** 由 context.geo 折算计数键：只到省级，识别不出就归 UNKNOWN */
function regionTarget(geo) {
  if (!geo || typeof geo !== 'object') return 'geo:UNKNOWN'
  const cc = String(geo.countryCodeAlpha2 || '').trim().toUpperCase()
  if (!cc) return 'geo:UNKNOWN'
  const rc = String(geo.regionCode || '').trim().toUpperCase() // 形如 CN-BJ
  if (cc === 'CN' && rc) return 'geo:' + rc
  return 'geo:' + cc
}

async function hit(target) {
  const ctl = new AbortController()
  const timer = setTimeout(() => ctl.abort(), UPSTREAM_TIMEOUT_MS)
  try {
    const r = await fetch(COUNTER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': REPORT_ORIGIN,
        'User-Agent': 'deskbud-geo-hit/1.0'
      },
      body: JSON.stringify({ action: 'batch_inc', requests: [{ target }] }),
      signal: ctl.signal
    })
    if (!r.ok) return false
    const d = await r.json().catch(() => null)
    return !!(d && d.code === 0)
  } catch (e) {
    return false
  } finally {
    clearTimeout(timer)
  }
}

export async function onRequest(context) {
  const { request, geo } = context

  const cors = {
    'Content-Type': 'application/json; charset=UTF-8',
    'Access-Control-Allow-Origin': request.headers.get('origin') || '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '600'
  }

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: cors })
  }
  if (request.method !== 'GET' && request.method !== 'POST') {
    return new Response(JSON.stringify({ ok: false, error: 'method_not_allowed' }), {
      status: 405,
      headers: { ...cors, 'Cache-Control': 'no-store' }
    })
  }

  const target = regionTarget(geo)
  const stored = await hit(target)

  return new Response(JSON.stringify({
    ok: true,
    stored,
    region: target,                 // 请求者自己所在省级区码
    geo_available: !!(geo && geo.countryName)
  }), {
    headers: { ...cors, 'Cache-Control': 'no-store' }
  })
}

export default { onRequest }
