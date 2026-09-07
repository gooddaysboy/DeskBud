// DeskBud Webmeji 兔子配置
// 基于 webmeji (Lars de Rooij, 2026) 改编为 DeskBud 兔子角色
// 行为池：底部全行为 + 屏顶跳跃/倒挂（ALLOWANCES.top）
// 素材由 scripts/extract_rabbit_frames.py 从 pyside6_rabbit_orbit/rabbit/*.webp 抽帧生成

// 帧 URL 用站点相对路径（不带前导斜杠）。
// 当前页在根路径（/ 或 /index.html）下浏览器会解析到 /assets/webmeji/rabbit/...
// webmeji.js 直接 img.src = frames[i]，无 baseUrl 机制，不能写裸相对路径。

window.DESKBUD_RABBIT_CONFIG = {
  // 抚摸/拖拽 + 底部走 + 顶部跳跃与倒挂；左右侧无合适素材暂不开
  ALLOWANCES: ['pet', 'drag', 'bottom', 'top', 'left', 'right'],

  walkspeed: 50,
  fallspeed: 180,   // 从屏顶落回底部用，受重力"加速度感"由下落距离/速度决定
  jumpspeed: 150,
  gettingupspeed: 2000,

  // 底部行为
  walk: { frames: ["assets/webmeji/rabbit/walk/f000.webp", "assets/webmeji/rabbit/walk/f002.webp", "assets/webmeji/rabbit/walk/f004.webp", "assets/webmeji/rabbit/walk/f006.webp", "assets/webmeji/rabbit/walk/f008.webp", "assets/webmeji/rabbit/walk/f010.webp", "assets/webmeji/rabbit/walk/f012.webp", "assets/webmeji/rabbit/walk/f014.webp", "assets/webmeji/rabbit/walk/f016.webp", "assets/webmeji/rabbit/walk/f018.webp", "assets/webmeji/rabbit/walk/f020.webp", "assets/webmeji/rabbit/walk/f022.webp", "assets/webmeji/rabbit/walk/f023.webp"], interval: 185, loops: 2 },
  stand:       { frames: ["assets/webmeji/rabbit/stand/f000.webp",       "assets/webmeji/rabbit/stand/f001.webp"],                                                                                                                                                                                  interval: 600, loops: 1 },
  sit: { frames: ["assets/webmeji/rabbit/sit/f000.webp", "assets/webmeji/rabbit/sit/f002.webp", "assets/webmeji/rabbit/sit/f004.webp", "assets/webmeji/rabbit/sit/f006.webp", "assets/webmeji/rabbit/sit/f008.webp", "assets/webmeji/rabbit/sit/f010.webp", "assets/webmeji/rabbit/sit/f012.webp", "assets/webmeji/rabbit/sit/f014.webp", "assets/webmeji/rabbit/sit/f016.webp", "assets/webmeji/rabbit/sit/f018.webp", "assets/webmeji/rabbit/sit/f020.webp", "assets/webmeji/rabbit/sit/f022.webp", "assets/webmeji/rabbit/sit/f024.webp"], interval: 308, loops: 1, randomizeDuration: true, min: 3000, max: 11000 },
  spin:        { frames: ["assets/webmeji/rabbit/spin/f000.webp"],                                                                                                                                                                                                                          interval: 80,  loops: 3 },
  dance:       { frames: ["assets/webmeji/rabbit/dance/f000.webp",       "assets/webmeji/rabbit/dance/f001.webp",       "assets/webmeji/rabbit/dance/f002.webp",       "assets/webmeji/rabbit/dance/f003.webp",       "assets/webmeji/rabbit/dance/f004.webp",       "assets/webmeji/rabbit/dance/f005.webp"],       interval: 130, loops: 5 },
  trip:        { frames: ["assets/webmeji/rabbit/trip/f000.webp",        "assets/webmeji/rabbit/trip/f001.webp",        "assets/webmeji/rabbit/trip/f002.webp",        "assets/webmeji/rabbit/trip/f003.webp",        "assets/webmeji/rabbit/trip/f004.webp"],                                                                interval: 130, loops: 1 },

  forcewalk:   { loops: 6 },                                          // 用 walk 帧
  forcethink:  { frames: ["assets/webmeji/rabbit/forcethink/f000.webp", "assets/webmeji/rabbit/forcethink/f001.webp", "assets/webmeji/rabbit/forcethink/f002.webp", "assets/webmeji/rabbit/forcethink/f003.webp", "assets/webmeji/rabbit/forcethink/f004.webp"], interval: 180, loops: 2 },

  pet:         { frames: ["assets/webmeji/rabbit/pet/f000.webp",         "assets/webmeji/rabbit/pet/f001.webp",         "assets/webmeji/rabbit/pet/f002.webp"],                                                                                                                              interval: 250 },
  drag:        { frames: ["assets/webmeji/rabbit/drag/f000.webp",        "assets/webmeji/rabbit/drag/f001.webp",        "assets/webmeji/rabbit/drag/f002.webp"],                                                                                                                            interval: 100 },

  falling:     { frames: ["assets/webmeji/rabbit/falling/f000.webp",     "assets/webmeji/rabbit/falling/f001.webp",     "assets/webmeji/rabbit/falling/f002.webp"],                                                                                                                         interval: 120, loops: 2 },
  fallen: { frames: ["assets/webmeji/rabbit/fallen/f000.webp", "assets/webmeji/rabbit/fallen/f002.webp", "assets/webmeji/rabbit/fallen/f004.webp", "assets/webmeji/rabbit/fallen/f006.webp", "assets/webmeji/rabbit/fallen/f008.webp", "assets/webmeji/rabbit/fallen/f010.webp", "assets/webmeji/rabbit/fallen/f012.webp", "assets/webmeji/rabbit/fallen/f014.webp"], interval: 244, loops: 1 },

  // 屏顶专用
  jump:        { frames: ["assets/webmeji/rabbit/climbTop/f000.webp",    "assets/webmeji/rabbit/climbTop/f001.webp"],                                                                                                                      interval: 160 },
  hangstillTop: { frames: ["assets/webmeji/rabbit/hangstillTop/f000.webp", "assets/webmeji/rabbit/hangstillTop/f002.webp", "assets/webmeji/rabbit/hangstillTop/f004.webp", "assets/webmeji/rabbit/hangstillTop/f006.webp", "assets/webmeji/rabbit/hangstillTop/f008.webp", "assets/webmeji/rabbit/hangstillTop/f010.webp", "assets/webmeji/rabbit/hangstillTop/f012.webp", "assets/webmeji/rabbit/hangstillTop/f014.webp", "assets/webmeji/rabbit/hangstillTop/f016.webp", "assets/webmeji/rabbit/hangstillTop/f018.webp", "assets/webmeji/rabbit/hangstillTop/f020.webp", "assets/webmeji/rabbit/hangstillTop/f022.webp", "assets/webmeji/rabbit/hangstillTop/f024.webp"], interval: 288, loops: 1, randomizeDuration: true, min: 3000, max: 8000 },
  climbTop:    { frames: ["assets/webmeji/rabbit/climbTop/f000.webp",    "assets/webmeji/rabbit/climbTop/f001.webp"],                                                                                                                       interval: 220, loops: 2 },
  climbSide:    { frames: ["assets/webmeji/rabbit/climbSide/f000.webp", "assets/webmeji/rabbit/climbSide/f001.webp", "assets/webmeji/rabbit/climbSide/f002.webp"], interval: 150, loops: 2 },
  hangstillSide: { frames: ["assets/webmeji/rabbit/hangstillTop/f000.webp", "assets/webmeji/rabbit/hangstillTop/f002.webp", "assets/webmeji/rabbit/hangstillTop/f004.webp", "assets/webmeji/rabbit/hangstillTop/f006.webp", "assets/webmeji/rabbit/hangstillTop/f008.webp", "assets/webmeji/rabbit/hangstillTop/f010.webp", "assets/webmeji/rabbit/hangstillTop/f012.webp", "assets/webmeji/rabbit/hangstillTop/f014.webp", "assets/webmeji/rabbit/hangstillTop/f016.webp", "assets/webmeji/rabbit/hangstillTop/f018.webp", "assets/webmeji/rabbit/hangstillTop/f020.webp", "assets/webmeji/rabbit/hangstillTop/f022.webp", "assets/webmeji/rabbit/hangstillTop/f024.webp"], interval: 288 },

  ORIGINAL_ACTIONS: [
    'walk','walk','walk','walk','walk','walk',
    'walk','walk','walk','walk',
    'spin','spin','spin',
    'sit','sit',
    'dance','dance',
    'trip'
  ],

  // 屏顶到达后的随机选择：挂住 / 顶部爬 / 从顶部落下（重力下落 → 触发 fallspeed）
  EDGE_ACTIONS: ['hang', 'hang', 'climb', 'fall'],

  // 底部兔子每秒约 5% 概率跳向屏顶
  JUMP_CHANCE: 0.05,
};

// 单只兔子
window.DESKBUD_RABBIT_SPAWNING = [
  { id: 'deskbud-rabbit', config: 'DESKBUD_RABBIT_CONFIG' }
];