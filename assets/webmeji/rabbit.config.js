// DeskBud Webmeji 兔子配置
// 基于 webmeji (Lars de Rooij, 2026) 改编为 DeskBud 兔子角色
// 行为池：底部全行为 + 屏顶跳跃/倒挂（ALLOWANCES.top）
// 素材由 tools/extract_rabbit_frames.py 从 pyside6_rabbit_orbit/rabbit/*.webp 抽帧生成

// 帧 URL 用站点相对路径（不带前导斜杠）。
// 当前页在根路径（/ 或 /index.html）下浏览器会解析到 /assets/webmeji/rabbit/...
// webmeji.js 直接 img.src = frames[i]，无 baseUrl 机制，不能写裸相对路径。

window.DESKBUD_RABBIT_CONFIG = {
  // 抚摸/拖拽 + 底部走 + 顶部跳跃与倒挂；左右侧无合适素材暂不开
  ALLOWANCES: ['pet', 'drag', 'bottom', 'top'],

  walkspeed: 50,
  fallspeed: 180,   // 从屏顶落回底部用，受重力"加速度感"由下落距离/速度决定
  jumpspeed: 150,
  gettingupspeed: 2000,

  // 底部行为
  walk:        { frames: ["assets/webmeji/rabbit/walk/1.png?v=2", "assets/webmeji/rabbit/walk/2.png?v=2", "assets/webmeji/rabbit/walk/3.png?v=2", "assets/webmeji/rabbit/walk/4.png?v=2", "assets/webmeji/rabbit/walk/5.png?v=2", "assets/webmeji/rabbit/walk/6.png?v=2", "assets/webmeji/rabbit/walk/7.png?v=2", "assets/webmeji/rabbit/walk/8.png?v=2", "assets/webmeji/rabbit/walk/9.png?v=2", "assets/webmeji/rabbit/walk/10.png?v=2", "assets/webmeji/rabbit/walk/11.png?v=2", "assets/webmeji/rabbit/walk/12.png?v=2", "assets/webmeji/rabbit/walk/13.png?v=2", "assets/webmeji/rabbit/walk/14.png?v=2", "assets/webmeji/rabbit/walk/15.png?v=2", "assets/webmeji/rabbit/walk/16.png?v=2", "assets/webmeji/rabbit/walk/17.png?v=2", "assets/webmeji/rabbit/walk/18.png?v=2", "assets/webmeji/rabbit/walk/19.png?v=2", "assets/webmeji/rabbit/walk/20.png?v=2", "assets/webmeji/rabbit/walk/21.png?v=2", "assets/webmeji/rabbit/walk/22.png?v=2", "assets/webmeji/rabbit/walk/23.png?v=2", "assets/webmeji/rabbit/walk/24.png?v=2"], interval: 100, loops: 2 },
  stand:       { frames: ["assets/webmeji/rabbit/stand/1.png",       "assets/webmeji/rabbit/stand/2.png"],                                                                                                                                                                                  interval: 600, loops: 1 },
  sit:         { frames: ["assets/webmeji/rabbit/sit/1.png?v=2", "assets/webmeji/rabbit/sit/2.png?v=2", "assets/webmeji/rabbit/sit/3.png?v=2", "assets/webmeji/rabbit/sit/4.png?v=2", "assets/webmeji/rabbit/sit/5.png?v=2", "assets/webmeji/rabbit/sit/6.png?v=2", "assets/webmeji/rabbit/sit/7.png?v=2", "assets/webmeji/rabbit/sit/8.png?v=2", "assets/webmeji/rabbit/sit/9.png?v=2", "assets/webmeji/rabbit/sit/10.png?v=2", "assets/webmeji/rabbit/sit/11.png?v=2", "assets/webmeji/rabbit/sit/12.png?v=2", "assets/webmeji/rabbit/sit/13.png?v=2", "assets/webmeji/rabbit/sit/14.png?v=2", "assets/webmeji/rabbit/sit/15.png?v=2", "assets/webmeji/rabbit/sit/16.png?v=2", "assets/webmeji/rabbit/sit/17.png?v=2", "assets/webmeji/rabbit/sit/18.png?v=2", "assets/webmeji/rabbit/sit/19.png?v=2", "assets/webmeji/rabbit/sit/20.png?v=2", "assets/webmeji/rabbit/sit/21.png?v=2", "assets/webmeji/rabbit/sit/22.png?v=2", "assets/webmeji/rabbit/sit/23.png?v=2", "assets/webmeji/rabbit/sit/24.png?v=2", "assets/webmeji/rabbit/sit/25.png?v=2"], interval: 160, loops: 1, randomizeDuration: true, min: 3000, max: 11000 },
  spin:        { frames: ["assets/webmeji/rabbit/spin/1.png"],                                                                                                                                                                                                                          interval: 80,  loops: 3 },
  dance:       { frames: ["assets/webmeji/rabbit/dance/1.png",       "assets/webmeji/rabbit/dance/2.png",       "assets/webmeji/rabbit/dance/3.png",       "assets/webmeji/rabbit/dance/4.png",       "assets/webmeji/rabbit/dance/5.png",       "assets/webmeji/rabbit/dance/6.png"],       interval: 130, loops: 5 },
  trip:        { frames: ["assets/webmeji/rabbit/trip/1.png",        "assets/webmeji/rabbit/trip/2.png",        "assets/webmeji/rabbit/trip/3.png",        "assets/webmeji/rabbit/trip/4.png",        "assets/webmeji/rabbit/trip/5.png"],                                                                interval: 130, loops: 1 },

  forcewalk:   { loops: 6 },                                          // 用 walk 帧
  forcethink:  { frames: ["assets/webmeji/rabbit/forcethink/1.png", "assets/webmeji/rabbit/forcethink/2.png", "assets/webmeji/rabbit/forcethink/3.png", "assets/webmeji/rabbit/forcethink/4.png", "assets/webmeji/rabbit/forcethink/5.png"], interval: 180, loops: 2 },

  pet:         { frames: ["assets/webmeji/rabbit/pet/1.png",         "assets/webmeji/rabbit/pet/2.png",         "assets/webmeji/rabbit/pet/3.png"],                                                                                                                              interval: 250 },
  drag:        { frames: ["assets/webmeji/rabbit/drag/1.png",        "assets/webmeji/rabbit/drag/2.png",        "assets/webmeji/rabbit/drag/3.png"],                                                                                                                            interval: 100 },

  falling:     { frames: ["assets/webmeji/rabbit/falling/1.png",     "assets/webmeji/rabbit/falling/2.png",     "assets/webmeji/rabbit/falling/3.png"],                                                                                                                         interval: 120, loops: 2 },
  fallen:      { frames: ["assets/webmeji/rabbit/fallen/1.png?v=2", "assets/webmeji/rabbit/fallen/2.png?v=2", "assets/webmeji/rabbit/fallen/3.png?v=2", "assets/webmeji/rabbit/fallen/4.png?v=2", "assets/webmeji/rabbit/fallen/5.png?v=2", "assets/webmeji/rabbit/fallen/6.png?v=2", "assets/webmeji/rabbit/fallen/7.png?v=2", "assets/webmeji/rabbit/fallen/8.png?v=2", "assets/webmeji/rabbit/fallen/9.png?v=2", "assets/webmeji/rabbit/fallen/10.png?v=2", "assets/webmeji/rabbit/fallen/11.png?v=2", "assets/webmeji/rabbit/fallen/12.png?v=2", "assets/webmeji/rabbit/fallen/13.png?v=2", "assets/webmeji/rabbit/fallen/14.png?v=2", "assets/webmeji/rabbit/fallen/15.png?v=2"], interval: 130, loops: 1 },

  // 屏顶专用
  jump:        { frames: ["assets/webmeji/rabbit/climbTop/1.png",    "assets/webmeji/rabbit/climbTop/2.png"],                                                                                                                      interval: 160 },
  hangstillTop:{ frames: ["assets/webmeji/rabbit/hangstillTop/1.png?v=2", "assets/webmeji/rabbit/hangstillTop/2.png?v=2", "assets/webmeji/rabbit/hangstillTop/3.png?v=2", "assets/webmeji/rabbit/hangstillTop/4.png?v=2", "assets/webmeji/rabbit/hangstillTop/5.png?v=2", "assets/webmeji/rabbit/hangstillTop/6.png?v=2", "assets/webmeji/rabbit/hangstillTop/7.png?v=2", "assets/webmeji/rabbit/hangstillTop/8.png?v=2", "assets/webmeji/rabbit/hangstillTop/9.png?v=2", "assets/webmeji/rabbit/hangstillTop/10.png?v=2", "assets/webmeji/rabbit/hangstillTop/11.png?v=2", "assets/webmeji/rabbit/hangstillTop/12.png?v=2", "assets/webmeji/rabbit/hangstillTop/13.png?v=2", "assets/webmeji/rabbit/hangstillTop/14.png?v=2", "assets/webmeji/rabbit/hangstillTop/15.png?v=2", "assets/webmeji/rabbit/hangstillTop/16.png?v=2", "assets/webmeji/rabbit/hangstillTop/17.png?v=2", "assets/webmeji/rabbit/hangstillTop/18.png?v=2", "assets/webmeji/rabbit/hangstillTop/19.png?v=2", "assets/webmeji/rabbit/hangstillTop/20.png?v=2", "assets/webmeji/rabbit/hangstillTop/21.png?v=2", "assets/webmeji/rabbit/hangstillTop/22.png?v=2", "assets/webmeji/rabbit/hangstillTop/23.png?v=2", "assets/webmeji/rabbit/hangstillTop/24.png?v=2", "assets/webmeji/rabbit/hangstillTop/25.png?v=2"], interval: 150, loops: 1, randomizeDuration: true, min: 3000, max: 8000 },
  climbTop:    { frames: ["assets/webmeji/rabbit/climbTop/1.png",    "assets/webmeji/rabbit/climbTop/2.png"],                                                                                                                       interval: 220, loops: 2 },

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