// ---------------------------------------------------------------------------
// EdgeOne Pages · Node Function（cloud-functions/）· GET|POST /api/app-hit
//
// 作用（2026-09-17 立，老曹拍板 2A/2B「客户端埋点」）：
//   原生客户端（桌面 / 安卓）把三类事实匿名聚合成计数：
//     stage=boot      本次启动（客户端**一天只报一次**，日戳用 UTC）→ 活跃规模
//     stage=check     点了「检查更新」
//     stage=download  开始下载升级包
//     stage=install   升级成功（由**新版本首次启动**带 from=<旧版本> 上报）
//   ⇒ 能画出升级漏斗（检查 → 下载 → 成功）+ 版本分布。
//
// 入参（全部白名单/正则，🔴 不接受自由文本 —— 键名一旦混写不可逆）：
//   app   = desktop | android
//   os    = win | mac | android（可选）
//   ver   = 当前版本，形如 0.1.26（^\d{1,3}(\.\d{1,3}){1,3}$）
//   stage = boot | check | download | install
//   from  = 仅 install：升级前的版本（同 ver 正则）
//
// 计数键（口径一次定死）：
//   app:<app>                 活跃（客户端日级去重 ⇒ 近似「人日」）
//   app:<app>:v:<ver>         各版本活跃分布
//   app:<app>:os:<os>         各平台活跃分布
//   upd:<app>:check           检查更新次数
//   upd:<app>:download        开始下载升级包次数
//   upd:<app>:install         升级成功次数
//   upd:<app>:from:<from>     从哪个版本升上来的分布
//
// 🔴 服务端**不做去重**（kounter 只能 +1）：去重必须由客户端保证「一天一报」。
//    桌面端与安卓端一律用 **UTC 日戳**（「今天」= UTC 零点切分，= 北京 08:00），
//    与网页侧 `new Date().toISOString().slice(0,10)` 同口径 —— kotlin 侧实测过：
//    若一边用本机时区，每天 00:00–08:00 两端算出的"今天"差一天。
// 🔴 静默失败：任何异常都返回 200 { ok:true, stored:false }，客户端无需处理错误。
// 🔴 no-store：GET 端点，少了它 CDN 会缓存 ⇒ 只有第一个客户端被计数。
// 🔴 路由约定：Node 版放 cloud-functions/（不是 functions/），否则静默不注册。
//
// 隐私：只做聚合计数，**不落设备号 / IP / UA / 精确位置**；不做个人粒度留存。
// ---------------------------------------------------------------------------

const COUNTER_URL = 'https://kounter.deskbud.xyz/api/counter'
const REPORT_ORIGIN = 'https://deskbud.xyz'
const UPSTREAM_TIMEOUT_MS = 5000

const APP_ALLOW = { desktop: 1, android: 1 }
const OS_ALLOW = { win: 1, mac: 1, android: 1 }
const STAGE_ALLOW = { boot: 1, check: 1, download: 1, install: 1 }
const VER_RE = /^\d{1,3}(\.\d{1,3}){1,3}$/

const CORS = {
  'Content-Type': 'application/json; charset=UTF-8',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '600'
}

/** 白名单/正则归一：非法一律返回 ''，调用方自行决定是否拒绝 */
function pick(v, allow) {
  const s = String(v || '').trim().toLowerCase()
  return allow[s] ? s : ''
}

function parseVer(v) {
  const s = String(v || '').trim()
  return VER_RE.test(s) ? s : ''
}

/** 按 stage 折算要 +1 的计数键 */
function keysFor(q) {
  const app = q.app
  const keys = []
  if (q.stage === 'boot') {
    keys.push('app:' + app)
    if (q.ver) keys.push('app:' + app + ':v:' + q.ver)
    if (q.os) keys.push('app:' + app + ':os:' + q.os)
  } else {
    keys.push('upd:' + app + ':' + q.stage)
    if (q.stage === 'install' && q.from) keys.push('upd:' + app + ':from:' + q.from)
  }
  return keys
}

async function count(targets) {
  if (!targets.length) return false
  const ctl = new AbortController()
  const timer = setTimeout(() => ctl.abort(), UPSTREAM_TIMEOUT_MS)
  try {
    const r = await fetch(COUNTER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': REPORT_ORIGIN,
        'User-Agent': 'deskbud-app-hit/1.0'
      },
      body: JSON.stringify({ action: 'batch_inc', requests: targets.map(t => ({ target: t })) }),
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

function readQuery(request, url) {
  if (request.method === 'POST') {
    // 允许 POST JSON（原生端若已封装 POST 也能用）；解析失败则回落到 query
    return null
  }
  return url.searchParams
}

export async function onRequest(context) {
  const { request } = context
  const url = new URL(request.url)

  const cors = Object.assign({}, CORS, {
    'Access-Control-Allow-Origin': request.headers.get('origin') || '*'
  })

  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors })
  if (request.method !== 'GET' && request.method !== 'POST') {
    return new Response(JSON.stringify({ ok: false, error: 'method_not_allowed' }), {
      status: 405, headers: Object.assign({}, cors, { 'Cache-Control': 'no-store' })
    })
  }

  let src = { get: k => url.searchParams.get(k) }
  if (request.method === 'POST') {
    const body = await request.json().catch(() => null)
    if (body && typeof body === 'object') src = { get: k => body[k] }
  }

  const q = {
    app: pick(src.get('app'), APP_ALLOW),
    os: pick(src.get('os'), OS_ALLOW),
    stage: pick(src.get('stage'), STAGE_ALLOW),
    ver: parseVer(src.get('ver')),
    from: parseVer(src.get('from'))
  }

  if (!q.app || !q.stage) {
    return new Response(JSON.stringify({ ok: false, error: 'bad_app_or_stage' }), {
      status: 400, headers: Object.assign({}, cors, { 'Cache-Control': 'no-store' })
    })
  }

  const keys = keysFor(q)
  const stored = await count(keys)

  return new Response(JSON.stringify({ ok: true, stored, keys }), {
    headers: Object.assign({}, cors, { 'Cache-Control': 'no-store' })
  })
}

export default { onRequest }
