// DeskBud Webmeji 熊猫配置（2026-09-07 自 kotlin panda 素材转换，脚本 scripts/convert_panda_frames.py）
// 与 rabbit.config.js 同一套行为语义；hangstillSide 复用 hangstillTop 帧（同 rabbit 做法）

window.DESKBUD_PANDA_CONFIG = {
  // 抚摸/拖拽 + 底部走 + 顶部跳跃与倒挂；左右侧无合适素材暂不开
  ALLOWANCES: ['pet', 'drag', 'bottom', 'top', 'left', 'right'],

  walkspeed: 42,      // 熊猫比兔子慢半拍（圆滚滚）
  fallspeed: 180,
  jumpspeed: 150,
  gettingupspeed: 2000,

  // 底部行为
  walk:         { frames: ["assets/webmeji/panda/walk/f000.webp", "assets/webmeji/panda/walk/f001.webp", "assets/webmeji/panda/walk/f002.webp", "assets/webmeji/panda/walk/f003.webp", "assets/webmeji/panda/walk/f004.webp", "assets/webmeji/panda/walk/f005.webp", "assets/webmeji/panda/walk/f006.webp", "assets/webmeji/panda/walk/f007.webp", "assets/webmeji/panda/walk/f008.webp", "assets/webmeji/panda/walk/f009.webp", "assets/webmeji/panda/walk/f010.webp", "assets/webmeji/panda/walk/f011.webp", "assets/webmeji/panda/walk/f012.webp", "assets/webmeji/panda/walk/f013.webp", "assets/webmeji/panda/walk/f014.webp", "assets/webmeji/panda/walk/f015.webp", "assets/webmeji/panda/walk/f016.webp", "assets/webmeji/panda/walk/f017.webp", "assets/webmeji/panda/walk/f018.webp", "assets/webmeji/panda/walk/f019.webp", "assets/webmeji/panda/walk/f020.webp", "assets/webmeji/panda/walk/f021.webp", "assets/webmeji/panda/walk/f022.webp", "assets/webmeji/panda/walk/f023.webp", "assets/webmeji/panda/walk/f024.webp", "assets/webmeji/panda/walk/f025.webp", "assets/webmeji/panda/walk/f026.webp", "assets/webmeji/panda/walk/f027.webp"], interval: 90 },
  stand:        { frames: ["assets/webmeji/panda/stand/f000.webp", "assets/webmeji/panda/stand/f001.webp"], interval: 700 },
  sit:          { frames: ["assets/webmeji/panda/sit/f000.webp", "assets/webmeji/panda/sit/f001.webp", "assets/webmeji/panda/sit/f002.webp", "assets/webmeji/panda/sit/f003.webp", "assets/webmeji/panda/sit/f004.webp", "assets/webmeji/panda/sit/f005.webp", "assets/webmeji/panda/sit/f006.webp", "assets/webmeji/panda/sit/f007.webp", "assets/webmeji/panda/sit/f008.webp", "assets/webmeji/panda/sit/f009.webp", "assets/webmeji/panda/sit/f010.webp", "assets/webmeji/panda/sit/f011.webp", "assets/webmeji/panda/sit/f012.webp", "assets/webmeji/panda/sit/f013.webp", "assets/webmeji/panda/sit/f014.webp", "assets/webmeji/panda/sit/f015.webp", "assets/webmeji/panda/sit/f016.webp", "assets/webmeji/panda/sit/f017.webp", "assets/webmeji/panda/sit/f018.webp", "assets/webmeji/panda/sit/f019.webp", "assets/webmeji/panda/sit/f020.webp", "assets/webmeji/panda/sit/f021.webp", "assets/webmeji/panda/sit/f022.webp", "assets/webmeji/panda/sit/f023.webp", "assets/webmeji/panda/sit/f024.webp"], interval: 160 },
  spin:         { frames: ["assets/webmeji/panda/spin/f000.webp"], interval: 80 },
  dance:        { frames: ["assets/webmeji/panda/dance/f000.webp", "assets/webmeji/panda/dance/f001.webp", "assets/webmeji/panda/dance/f002.webp", "assets/webmeji/panda/dance/f003.webp", "assets/webmeji/panda/dance/f004.webp", "assets/webmeji/panda/dance/f005.webp"], interval: 130 },
  trip:         { frames: ["assets/webmeji/panda/trip/f000.webp", "assets/webmeji/panda/trip/f001.webp", "assets/webmeji/panda/trip/f002.webp", "assets/webmeji/panda/trip/f003.webp", "assets/webmeji/panda/trip/f004.webp"], interval: 130 },
  forcethink:   { frames: ["assets/webmeji/panda/forcethink/f000.webp", "assets/webmeji/panda/forcethink/f001.webp", "assets/webmeji/panda/forcethink/f002.webp", "assets/webmeji/panda/forcethink/f003.webp", "assets/webmeji/panda/forcethink/f004.webp"], interval: 180 },
  pet:          { frames: ["assets/webmeji/panda/pet/f000.webp", "assets/webmeji/panda/pet/f001.webp", "assets/webmeji/panda/pet/f002.webp"], interval: 250 },
  drag:         { frames: ["assets/webmeji/panda/drag/f000.webp", "assets/webmeji/panda/drag/f001.webp", "assets/webmeji/panda/drag/f002.webp"], interval: 100 },
  forcewalk:   { loops: 6 },                                          // 用 walk 帧

  // 下落与落地
  falling:      { frames: ["assets/webmeji/panda/falling/f000.webp", "assets/webmeji/panda/falling/f001.webp", "assets/webmeji/panda/falling/f002.webp", "assets/webmeji/panda/falling/f003.webp", "assets/webmeji/panda/falling/f004.webp", "assets/webmeji/panda/falling/f005.webp", "assets/webmeji/panda/falling/f006.webp", "assets/webmeji/panda/falling/f007.webp", "assets/webmeji/panda/falling/f008.webp", "assets/webmeji/panda/falling/f009.webp", "assets/webmeji/panda/falling/f010.webp", "assets/webmeji/panda/falling/f011.webp", "assets/webmeji/panda/falling/f012.webp", "assets/webmeji/panda/falling/f013.webp", "assets/webmeji/panda/falling/f014.webp", "assets/webmeji/panda/falling/f015.webp", "assets/webmeji/panda/falling/f016.webp", "assets/webmeji/panda/falling/f017.webp", "assets/webmeji/panda/falling/f018.webp", "assets/webmeji/panda/falling/f019.webp", "assets/webmeji/panda/falling/f020.webp", "assets/webmeji/panda/falling/f021.webp", "assets/webmeji/panda/falling/f022.webp", "assets/webmeji/panda/falling/f023.webp", "assets/webmeji/panda/falling/f024.webp", "assets/webmeji/panda/falling/f025.webp", "assets/webmeji/panda/falling/f026.webp", "assets/webmeji/panda/falling/f027.webp", "assets/webmeji/panda/falling/f028.webp", "assets/webmeji/panda/falling/f029.webp", "assets/webmeji/panda/falling/f030.webp", "assets/webmeji/panda/falling/f031.webp", "assets/webmeji/panda/falling/f032.webp", "assets/webmeji/panda/falling/f033.webp"], interval: 115 },
  fallen:       { frames: ["assets/webmeji/panda/fallen/f000.webp", "assets/webmeji/panda/fallen/f001.webp", "assets/webmeji/panda/fallen/f002.webp", "assets/webmeji/panda/fallen/f003.webp", "assets/webmeji/panda/fallen/f004.webp", "assets/webmeji/panda/fallen/f005.webp", "assets/webmeji/panda/fallen/f006.webp", "assets/webmeji/panda/fallen/f007.webp"], interval: 244, loops: 1 },

  // 屏顶专用
  jump:         { frames: ["assets/webmeji/panda/jump/f000.webp"], interval: 160 },
  climbTop:     { frames: ["assets/webmeji/panda/climbTop/f000.webp", "assets/webmeji/panda/climbTop/f001.webp"], interval: 220, loops: 2 },
  climbSide:    { frames: ["assets/webmeji/panda/climbSide/f000.webp", "assets/webmeji/panda/climbSide/f001.webp", "assets/webmeji/panda/climbSide/f002.webp"], interval: 150, loops: 2 },
  hangstillTop: { frames: ["assets/webmeji/panda/hangstillTop/f000.webp", "assets/webmeji/panda/hangstillTop/f001.webp", "assets/webmeji/panda/hangstillTop/f002.webp", "assets/webmeji/panda/hangstillTop/f003.webp", "assets/webmeji/panda/hangstillTop/f004.webp", "assets/webmeji/panda/hangstillTop/f005.webp", "assets/webmeji/panda/hangstillTop/f006.webp", "assets/webmeji/panda/hangstillTop/f007.webp", "assets/webmeji/panda/hangstillTop/f008.webp", "assets/webmeji/panda/hangstillTop/f009.webp", "assets/webmeji/panda/hangstillTop/f010.webp", "assets/webmeji/panda/hangstillTop/f011.webp", "assets/webmeji/panda/hangstillTop/f012.webp", "assets/webmeji/panda/hangstillTop/f013.webp", "assets/webmeji/panda/hangstillTop/f014.webp", "assets/webmeji/panda/hangstillTop/f015.webp", "assets/webmeji/panda/hangstillTop/f016.webp", "assets/webmeji/panda/hangstillTop/f017.webp", "assets/webmeji/panda/hangstillTop/f018.webp", "assets/webmeji/panda/hangstillTop/f019.webp", "assets/webmeji/panda/hangstillTop/f020.webp", "assets/webmeji/panda/hangstillTop/f021.webp", "assets/webmeji/panda/hangstillTop/f022.webp", "assets/webmeji/panda/hangstillTop/f023.webp", "assets/webmeji/panda/hangstillTop/f024.webp"], interval: 150, loops: 1, randomizeDuration: true, min: 3000, max: 8000 },
  hangstillSide: { frames: ["assets/webmeji/panda/hangstillTop/f000.webp", "assets/webmeji/panda/hangstillTop/f001.webp", "assets/webmeji/panda/hangstillTop/f002.webp", "assets/webmeji/panda/hangstillTop/f003.webp", "assets/webmeji/panda/hangstillTop/f004.webp", "assets/webmeji/panda/hangstillTop/f005.webp", "assets/webmeji/panda/hangstillTop/f006.webp", "assets/webmeji/panda/hangstillTop/f007.webp", "assets/webmeji/panda/hangstillTop/f008.webp", "assets/webmeji/panda/hangstillTop/f009.webp", "assets/webmeji/panda/hangstillTop/f010.webp", "assets/webmeji/panda/hangstillTop/f011.webp", "assets/webmeji/panda/hangstillTop/f012.webp", "assets/webmeji/panda/hangstillTop/f013.webp", "assets/webmeji/panda/hangstillTop/f014.webp", "assets/webmeji/panda/hangstillTop/f015.webp", "assets/webmeji/panda/hangstillTop/f016.webp", "assets/webmeji/panda/hangstillTop/f017.webp", "assets/webmeji/panda/hangstillTop/f018.webp", "assets/webmeji/panda/hangstillTop/f019.webp", "assets/webmeji/panda/hangstillTop/f020.webp", "assets/webmeji/panda/hangstillTop/f021.webp", "assets/webmeji/panda/hangstillTop/f022.webp", "assets/webmeji/panda/hangstillTop/f023.webp", "assets/webmeji/panda/hangstillTop/f024.webp"], interval: 150 },   // 侧挂复用顶挂素材

  ORIGINAL_ACTIONS: [
    'walk','walk','walk','walk','walk','walk',
    'walk','walk','walk','walk',
    'spin','spin','spin',
    'sit','sit',
    'dance','dance',
    'trip'
  ],

  EDGE_ACTIONS: ['hang', 'hang', 'climb', 'fall'],

  JUMP_CHANCE: 0.05,
};

// 单只熊猫
window.DESKBUD_PANDA_SPAWNING = [
  { id: 'deskbud-panda', config: 'DESKBUD_PANDA_CONFIG' }
];
