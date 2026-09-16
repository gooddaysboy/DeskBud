// ---------------------------------------------------------------------------
// EdgeOne Pages · Node Function（cloud-functions/）· 探针自检：GET /api/ping
//
// 用途：区分两种失败——
//   /api/ping 通、/api/geo 无 geo ⇒ Functions 已生效，只是平台没注入 geo；
//   /api/ping 也不通（返回站点 HTML）⇒ Functions 根本没注册（目录名/构建输出目录问题）。
// 性质：只读、无副作用、no-store。测完可整目录删除。
// ---------------------------------------------------------------------------

export function onRequest(context) {
  const { request } = context
  const origin = request.headers.get('origin') || '*'

  return new Response(
    JSON.stringify({ ok: true, fn: '/api/ping', runtime: 'edgeone-pages-cloud-functions', ts: Date.now() }),
    {
      headers: {
        'Content-Type': 'application/json; charset=UTF-8',
        'Access-Control-Allow-Origin': origin,
        'Cache-Control': 'no-store'
      }
    }
  )
}

export default { onRequest }
