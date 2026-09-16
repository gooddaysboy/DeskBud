// ---------------------------------------------------------------------------
// EdgeOne Pages · Node Function（cloud-functions/）· GET /api/dl
//
// 作用（2026-09-17 立，老曹拍板 1B「下载统计」）：
//   官网/扫码页的下载按钮不再直连 gitee，改走本端点：① 计数 ② 302 到真链。
//   只统计「从官网/扫码页点击下载」——升级器自己拉包不计（那属于升级漏斗，
//   由客户端打 /api/app-hit，见那个文件）。
//
// 入参（全部白名单，不接受自由文本）：
//   os = win | mac | android        其它值 → other
//   to = 真链（可选）               必须 gitee.com/deskbud/version/releases/download/ 前缀
//                                   —— 前端把已解析到的最新链带过来，省一次服务端取清单
//   u  = 1                          同时记「去重人数」（前端**首次点击**才带）
//
// 计数键（🔴 口径一次定死，混写不可逆 —— 同 geo 分桶的教训）：
//   dl:<os>          累计点击次数
//   dl:u:<os>        去重人数（同一浏览器只 +1；前端 localStorage 打标）
//
// 真链解析顺序：?to=（校验通过）→ 同源 data/download-latest.json → 官网下载页兜底。
//
// 🔴 no-store 必须有：本端点是 GET，少了它 CDN 会缓存这个 302 ⇒ 只有第一个访客被
//    计数、后续访客直接被缓存顶回 gitee（geo-hit 踩过同一个坑）。
// 🔴 计数失败绝不影响下载：任何异常吞掉，照常 302 —— 统计是附属品，下载是主业务。
// 🔴 路由约定：Node 版放 cloud-functions/（不是 functions/），否则静默不注册。
//
// 隐私：只做聚合计数，不落 IP / 不落 UA / 不落设备号（与 /api/geo-hit 同口径）。
// ---------------------------------------------------------------------------

const COUNTER_URL = 'https://kounter.deskbud.xyz/api/counter'
const REPORT_ORIGIN = 'https://deskbud.xyz'
const UPSTREAM_TIMEOUT_MS = 5000
const MANIFEST_URL = 'https://deskbud.xyz/data/download-latest.json'
const SITE_DOWNLOAD_PAGE = 'https://deskbud.xyz/download.html'

/** 平台白名单：键名安全（不接受自由文本，否则 dl:* 命名空间会被污染） */
const OS_ALLOW = { win: 1, mac: 1, android: 1 }

/** ?os= 解析：缺失/非法 → other（也记账，便于发现异常调用） */
function parseOs(url) {
  const s = String(url.searchParams.get('os') || '').trim().toLowerCase()
  return OS_ALLOW[s] ? s : 'other'
}

/** ?to= 校验：只放行自家 gitee 升级仓的 release 直链（防开放重定向） */
function safeTarget(to) {
  if (!to) return ''
  let u
  try { u = new URL(String(to)) } catch (e) { return '' }
  if (u.protocol !== 'https:') return ''
  if (u.hostname !== 'gitee.com') return ''
  if (!u.pathname.startsWith('/deskbud/version/releases/download/')) return ''
  return u.toString()
}

async function fetchJson(url, ms) {
  const ctl = new AbortController()
  const timer = setTimeout(() => ctl.abort(), ms)
  try {
    const r = await fetch(url, { signal: ctl.signal, headers: { 'User-Agent': 'deskbud-dl/1.0' } })
    if (!r.ok) return null
    return await r.json().catch(() => null)
  } catch (e) {
    return null
  } finally {
    clearTimeout(timer)
  }
}

/** 计数：一次 batch_inc 同时写「累计」和（可选）「去重」 */
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
        'User-Agent': 'deskbud-dl/1.0'
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

/** 真链：?to= → 同源清单 → 官网下载页 */
async function resolveTarget(os, to) {
  const direct = safeTarget(to)
  if (direct) return direct
  const d = await fetchJson(MANIFEST_URL, 4000)
  const url = d && d[os] && d[os].url
  const checked = safeTarget(url)
  if (checked) return checked
  return SITE_DOWNLOAD_PAGE
}

export async function onRequest(context) {
  const { request } = context
  if (request.method === 'OPTIONS') return new Response(null, { status: 204 })
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return new Response(JSON.stringify({ ok: false, error: 'method_not_allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json; charset=UTF-8', 'Cache-Control': 'no-store' }
    })
  }

  const url = new URL(request.url)
  const os = parseOs(url)
  const uniq = url.searchParams.get('u') === '1'

  // ① 计数（先做，失败也无所谓）——「累计」必记，「去重」仅前端首次点击带 u=1
  const targets = ['dl:' + os]
  if (uniq) targets.push('dl:u:' + os)
  const stored = await count(targets)

  // ② 302 到真链
  const dest = await resolveTarget(os, url.searchParams.get('to'))

  return new Response(null, {
    status: 302,
    headers: {
      'Location': dest,
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'X-DeskBud-Counted': stored ? '1' : '0',   // 便于排障：计数到底成没成
      'X-DeskBud-Os': os
    }
  })
}

export default { onRequest }
