// ---------------------------------------------------------------------------
// EdgeOne Pages · Node Function（cloud-functions/）· GET|POST /api/geo-hit
//
// 作用（2026-09-16 立，1A「访客地理分布最小闭环」；同日扩为**分桶**；
//       2026-09-17 增**日键**，支持按天/周/月/年看分布）：
//   一次调用完成「取位置 + 匿名聚合计数」，让用户地理分布可累积。
//   ① 从平台注入的 context.geo 取访客所在**省级区码**（如 CN-BJ）；
//   ② 服务端把它 +1 落到 Open-Kounter 计数器，**一次 batch_inc 打两个键**：
//        geo:<src>:<区码>           总键 —— 有史以来累计（含日键上线前的历史）
//        geo:<src>:<区码>:<YYYY-MM-DD>  日键 —— 那一天的量
//   客户端只需 fetch('/api/geo-hit?src=web')，不必知道 kounter 存在、不必处理跨域，
//   桌面端 / 安卓端也能调同一个 URL（原生请求无 Origin，kounter 放行）。
//
// 分桶（2026-09-16 老曹拍板 1C：客户端流量也是真实用户，但必须能拆开）：
//   src=web      浏览器访客（**默认值**，兼容旧的 /api/geo-hit 裸调用）
//   src=android  安卓客户端（App 内嵌伙伴页 / 原生上报）
//   src=desktop  桌面客户端
//   ?src= 缺失 → web；白名单外 → other。
//   ⚠️ 桶名走**白名单**、不接受自由文本：一旦混写就无法拆分（历史数据不可逆）。
//
// 🔴 日界一律 **UTC**（`toISOString()` 出来的那天，= 北京 08:00 切日）：
//   必须与客户端「一天一报」的去重日戳（`new Date().toISOString().slice(0,10)`）
//   同口径。若这里改用 Asia/Shanghai 切日，北京 00:00–08:00 这段上报会被记到
//   客户端日戳的后一天，同一次上报在两条口径下跨日 ⇒ 日图出现锯齿。
//   周 / 月 / 年**不另设键**，由运维面板把日键求和推导（避免键数爆炸）。
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
// ⚠️ 日键会随时间累积（每省·每源·每天最多 1 个键，一年几千个）。运维面板有
//    「清理 N 天前的日键」按钮（走 kounter 的 delete 动作，需 ADMIN_TOKEN）。
// ---------------------------------------------------------------------------

const COUNTER_URL = 'https://kounter.deskbud.xyz/api/counter'
// kounter 的 inc/batch_inc 校验 Origin 白名单（已含 deskbud.xyz）；服务端调用显式带上更可预期
const REPORT_ORIGIN = 'https://deskbud.xyz'
const UPSTREAM_TIMEOUT_MS = 5000

/** 来源桶白名单（见头部「分桶」说明；不接受自由文本） */
const SRC_ALLOW = { web: 1, android: 1, desktop: 1, other: 1 }

/** 解析 ?src=：缺失 → web（兼容旧调用）；白名单外 → other */
function parseSrc(url) {
  let s = ''
  try { s = String(url.searchParams.get('src') || '').trim().toLowerCase() } catch (e) { s = '' }
  if (!s) return 'web'
  return SRC_ALLOW[s] ? s : 'other'
}

/** 由 context.geo 折算计数键：geo:<src>:<省级区码 | 国家码 | UNKNOWN> */
function regionTarget(geo, src) {
  const prefix = 'geo:' + src + ':'
  if (!geo || typeof geo !== 'object') return prefix + 'UNKNOWN'
  const cc = String(geo.countryCodeAlpha2 || '').trim().toUpperCase()
  if (!cc) return prefix + 'UNKNOWN'
  const rc = String(geo.regionCode || '').trim().toUpperCase() // 形如 CN-BJ
  if (cc === 'CN' && rc) return prefix + rc
  return prefix + cc
}

/**
 * 当日键后缀 YYYY-MM-DD（UTC 日，见头部「日界」说明）
 * 🔴 与客户端去重日戳同口径，别改成 toLocaleDateString / 时区换算
 */
function dayStamp() {
  try {
    return new Date().toISOString().slice(0, 10)
  } catch (e) {
    return ''
  }
}

/** 一次 batch_inc 打多个键（总键 + 日键）；任何失败都返回 false，不影响访客 */
async function hit(targets) {
  const list = (targets || []).filter(Boolean)
  if (!list.length) return false
  const ctl = new AbortController()
  const timer = setTimeout(() => ctl.abort(), UPSTREAM_TIMEOUT_MS)
  try {
    const r = await fetch(COUNTER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': REPORT_ORIGIN,
        'User-Agent': 'deskbud-geo-hit/1.2'
      },
      body: JSON.stringify({ action: 'batch_inc', requests: list.map(t => ({ target: t })) }),
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
  const src = parseSrc(new URL(request.url))

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

  const target = regionTarget(geo, src)          // 总键：累计
  const day = dayStamp()
  const dayTarget = day ? target + ':' + day : '' // 日键：当天
  const stored = await hit([target, dayTarget])

  return new Response(JSON.stringify({
    ok: true,
    stored,
    src,                            // 来源桶：web / android / desktop / other
    region: target,                 // 累计计数键（含桶）= 请求者自己所在省级区码
    day_target: dayTarget,          // 当日计数键（日键），空字符串 = 未写日键
    geo_available: !!(geo && geo.countryName)
  }), {
    headers: { ...cors, 'Cache-Control': 'no-store' }
  })
}

export default { onRequest }
