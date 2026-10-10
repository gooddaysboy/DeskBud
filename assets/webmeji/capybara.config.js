// DeskBud Webmeji capybara 配置（由 tools/material/gen_webmeji_pet.py 生成）
// 行为语义与 rabbit/panda 一致；hangstillSide 复用 hangstillTop 帧（同 rabbit 做法）
// 朝向：素材面朝右 = 引擎基准（webmeji.js 向右用原图、向左镜像）⇒ 无需翻转。

window.DESKBUD_CAPYBARA_CONFIG = {
  ALLOWANCES: ['pet', 'drag', 'bottom', 'top', 'left', 'right'],

  walkspeed: 38,
  fallspeed: 180,
  jumpspeed: 150,
  gettingupspeed: 2000,

  // 底部行为
  walk:        { frames: ["assets/webmeji/capybara/walk/f000.webp", "assets/webmeji/capybara/walk/f001.webp", "assets/webmeji/capybara/walk/f002.webp", "assets/webmeji/capybara/walk/f003.webp", "assets/webmeji/capybara/walk/f004.webp", "assets/webmeji/capybara/walk/f005.webp", "assets/webmeji/capybara/walk/f006.webp", "assets/webmeji/capybara/walk/f007.webp", "assets/webmeji/capybara/walk/f008.webp", "assets/webmeji/capybara/walk/f009.webp", "assets/webmeji/capybara/walk/f010.webp", "assets/webmeji/capybara/walk/f011.webp", "assets/webmeji/capybara/walk/f012.webp", "assets/webmeji/capybara/walk/f013.webp", "assets/webmeji/capybara/walk/f014.webp", "assets/webmeji/capybara/walk/f015.webp", "assets/webmeji/capybara/walk/f016.webp", "assets/webmeji/capybara/walk/f017.webp", "assets/webmeji/capybara/walk/f018.webp", "assets/webmeji/capybara/walk/f019.webp", "assets/webmeji/capybara/walk/f020.webp", "assets/webmeji/capybara/walk/f021.webp", "assets/webmeji/capybara/walk/f022.webp", "assets/webmeji/capybara/walk/f023.webp"], interval: 90 },
  stand:       { frames: ["assets/webmeji/capybara/stand/f000.webp", "assets/webmeji/capybara/stand/f001.webp"], interval: 700 },
  sit:         { frames: ["assets/webmeji/capybara/sit/f000.webp", "assets/webmeji/capybara/sit/f001.webp", "assets/webmeji/capybara/sit/f002.webp", "assets/webmeji/capybara/sit/f003.webp", "assets/webmeji/capybara/sit/f004.webp", "assets/webmeji/capybara/sit/f005.webp", "assets/webmeji/capybara/sit/f006.webp", "assets/webmeji/capybara/sit/f007.webp", "assets/webmeji/capybara/sit/f008.webp", "assets/webmeji/capybara/sit/f009.webp", "assets/webmeji/capybara/sit/f010.webp", "assets/webmeji/capybara/sit/f011.webp", "assets/webmeji/capybara/sit/f012.webp", "assets/webmeji/capybara/sit/f013.webp", "assets/webmeji/capybara/sit/f014.webp", "assets/webmeji/capybara/sit/f015.webp", "assets/webmeji/capybara/sit/f016.webp", "assets/webmeji/capybara/sit/f017.webp", "assets/webmeji/capybara/sit/f018.webp", "assets/webmeji/capybara/sit/f019.webp", "assets/webmeji/capybara/sit/f020.webp", "assets/webmeji/capybara/sit/f021.webp", "assets/webmeji/capybara/sit/f022.webp", "assets/webmeji/capybara/sit/f023.webp", "assets/webmeji/capybara/sit/f024.webp"], interval: 160 },
  spin:        { frames: ["assets/webmeji/capybara/spin/f000.webp"], interval: 80 },
  dance:       { frames: ["assets/webmeji/capybara/dance/f000.webp", "assets/webmeji/capybara/dance/f001.webp", "assets/webmeji/capybara/dance/f002.webp", "assets/webmeji/capybara/dance/f003.webp", "assets/webmeji/capybara/dance/f004.webp", "assets/webmeji/capybara/dance/f005.webp"], interval: 130 },
  trip:        { frames: ["assets/webmeji/capybara/trip/f000.webp", "assets/webmeji/capybara/trip/f001.webp", "assets/webmeji/capybara/trip/f002.webp", "assets/webmeji/capybara/trip/f003.webp", "assets/webmeji/capybara/trip/f004.webp"], interval: 130 },
  forcethink:  { frames: ["assets/webmeji/capybara/forcethink/f000.webp", "assets/webmeji/capybara/forcethink/f001.webp", "assets/webmeji/capybara/forcethink/f002.webp", "assets/webmeji/capybara/forcethink/f003.webp", "assets/webmeji/capybara/forcethink/f004.webp"], interval: 180, loops: 2 },
  pet:         { frames: ["assets/webmeji/capybara/pet/f000.webp", "assets/webmeji/capybara/pet/f001.webp", "assets/webmeji/capybara/pet/f002.webp"], interval: 250 },
  drag:        { frames: ["assets/webmeji/capybara/drag/f000.webp", "assets/webmeji/capybara/drag/f001.webp", "assets/webmeji/capybara/drag/f002.webp"], interval: 100 },
  forcewalk:   { loops: 6 },                                          // 用 walk 帧

  // 下落与落地
  falling:     { frames: ["assets/webmeji/capybara/falling/f000.webp", "assets/webmeji/capybara/falling/f001.webp", "assets/webmeji/capybara/falling/f002.webp", "assets/webmeji/capybara/falling/f003.webp", "assets/webmeji/capybara/falling/f004.webp", "assets/webmeji/capybara/falling/f005.webp", "assets/webmeji/capybara/falling/f006.webp", "assets/webmeji/capybara/falling/f007.webp", "assets/webmeji/capybara/falling/f008.webp", "assets/webmeji/capybara/falling/f009.webp", "assets/webmeji/capybara/falling/f010.webp", "assets/webmeji/capybara/falling/f011.webp", "assets/webmeji/capybara/falling/f012.webp", "assets/webmeji/capybara/falling/f013.webp", "assets/webmeji/capybara/falling/f014.webp", "assets/webmeji/capybara/falling/f015.webp", "assets/webmeji/capybara/falling/f016.webp", "assets/webmeji/capybara/falling/f017.webp", "assets/webmeji/capybara/falling/f018.webp", "assets/webmeji/capybara/falling/f019.webp", "assets/webmeji/capybara/falling/f020.webp", "assets/webmeji/capybara/falling/f021.webp", "assets/webmeji/capybara/falling/f022.webp", "assets/webmeji/capybara/falling/f023.webp", "assets/webmeji/capybara/falling/f024.webp", "assets/webmeji/capybara/falling/f025.webp", "assets/webmeji/capybara/falling/f026.webp", "assets/webmeji/capybara/falling/f027.webp", "assets/webmeji/capybara/falling/f028.webp", "assets/webmeji/capybara/falling/f029.webp", "assets/webmeji/capybara/falling/f030.webp", "assets/webmeji/capybara/falling/f031.webp", "assets/webmeji/capybara/falling/f032.webp", "assets/webmeji/capybara/falling/f033.webp"], interval: 115 },
  fallen:      { frames: ["assets/webmeji/capybara/fallen/f000.webp", "assets/webmeji/capybara/fallen/f001.webp", "assets/webmeji/capybara/fallen/f002.webp", "assets/webmeji/capybara/fallen/f003.webp", "assets/webmeji/capybara/fallen/f004.webp", "assets/webmeji/capybara/fallen/f005.webp", "assets/webmeji/capybara/fallen/f006.webp", "assets/webmeji/capybara/fallen/f007.webp"], interval: 244, loops: 1 },

  // 屏顶专用
  jump:        { frames: ["assets/webmeji/capybara/jump/f000.webp"], interval: 160 },
  climbTop:    { frames: ["assets/webmeji/capybara/climbTop/f000.webp", "assets/webmeji/capybara/climbTop/f001.webp"], interval: 220, loops: 2 },
  climbSide:   { frames: ["assets/webmeji/capybara/climbSide/f000.webp", "assets/webmeji/capybara/climbSide/f001.webp", "assets/webmeji/capybara/climbSide/f002.webp", "assets/webmeji/capybara/climbSide/f003.webp", "assets/webmeji/capybara/climbSide/f004.webp", "assets/webmeji/capybara/climbSide/f005.webp", "assets/webmeji/capybara/climbSide/f006.webp", "assets/webmeji/capybara/climbSide/f007.webp", "assets/webmeji/capybara/climbSide/f008.webp", "assets/webmeji/capybara/climbSide/f009.webp", "assets/webmeji/capybara/climbSide/f010.webp", "assets/webmeji/capybara/climbSide/f011.webp", "assets/webmeji/capybara/climbSide/f012.webp", "assets/webmeji/capybara/climbSide/f013.webp", "assets/webmeji/capybara/climbSide/f014.webp", "assets/webmeji/capybara/climbSide/f015.webp", "assets/webmeji/capybara/climbSide/f016.webp", "assets/webmeji/capybara/climbSide/f017.webp", "assets/webmeji/capybara/climbSide/f018.webp", "assets/webmeji/capybara/climbSide/f019.webp", "assets/webmeji/capybara/climbSide/f020.webp", "assets/webmeji/capybara/climbSide/f021.webp", "assets/webmeji/capybara/climbSide/f022.webp", "assets/webmeji/capybara/climbSide/f023.webp", "assets/webmeji/capybara/climbSide/f024.webp"], interval: 150, loops: 2 },
  hangstillTop:{ frames: ["assets/webmeji/capybara/hangstillTop/f000.webp", "assets/webmeji/capybara/hangstillTop/f001.webp", "assets/webmeji/capybara/hangstillTop/f002.webp", "assets/webmeji/capybara/hangstillTop/f003.webp", "assets/webmeji/capybara/hangstillTop/f004.webp", "assets/webmeji/capybara/hangstillTop/f005.webp", "assets/webmeji/capybara/hangstillTop/f006.webp", "assets/webmeji/capybara/hangstillTop/f007.webp", "assets/webmeji/capybara/hangstillTop/f008.webp", "assets/webmeji/capybara/hangstillTop/f009.webp", "assets/webmeji/capybara/hangstillTop/f010.webp", "assets/webmeji/capybara/hangstillTop/f011.webp", "assets/webmeji/capybara/hangstillTop/f012.webp", "assets/webmeji/capybara/hangstillTop/f013.webp", "assets/webmeji/capybara/hangstillTop/f014.webp", "assets/webmeji/capybara/hangstillTop/f015.webp", "assets/webmeji/capybara/hangstillTop/f016.webp", "assets/webmeji/capybara/hangstillTop/f017.webp", "assets/webmeji/capybara/hangstillTop/f018.webp", "assets/webmeji/capybara/hangstillTop/f019.webp", "assets/webmeji/capybara/hangstillTop/f020.webp", "assets/webmeji/capybara/hangstillTop/f021.webp", "assets/webmeji/capybara/hangstillTop/f022.webp", "assets/webmeji/capybara/hangstillTop/f023.webp", "assets/webmeji/capybara/hangstillTop/f024.webp"], interval: 150, loops: 1, randomizeDuration: true, min: 3000, max: 8000 },
  hangstillSide:{ frames: ["assets/webmeji/capybara/hangstillTop/f000.webp", "assets/webmeji/capybara/hangstillTop/f001.webp", "assets/webmeji/capybara/hangstillTop/f002.webp", "assets/webmeji/capybara/hangstillTop/f003.webp", "assets/webmeji/capybara/hangstillTop/f004.webp", "assets/webmeji/capybara/hangstillTop/f005.webp", "assets/webmeji/capybara/hangstillTop/f006.webp", "assets/webmeji/capybara/hangstillTop/f007.webp", "assets/webmeji/capybara/hangstillTop/f008.webp", "assets/webmeji/capybara/hangstillTop/f009.webp", "assets/webmeji/capybara/hangstillTop/f010.webp", "assets/webmeji/capybara/hangstillTop/f011.webp", "assets/webmeji/capybara/hangstillTop/f012.webp", "assets/webmeji/capybara/hangstillTop/f013.webp", "assets/webmeji/capybara/hangstillTop/f014.webp", "assets/webmeji/capybara/hangstillTop/f015.webp", "assets/webmeji/capybara/hangstillTop/f016.webp", "assets/webmeji/capybara/hangstillTop/f017.webp", "assets/webmeji/capybara/hangstillTop/f018.webp", "assets/webmeji/capybara/hangstillTop/f019.webp", "assets/webmeji/capybara/hangstillTop/f020.webp", "assets/webmeji/capybara/hangstillTop/f021.webp", "assets/webmeji/capybara/hangstillTop/f022.webp", "assets/webmeji/capybara/hangstillTop/f023.webp", "assets/webmeji/capybara/hangstillTop/f024.webp"], interval: 150 },   // 侧挂复用顶挂素材

  ORIGINAL_ACTIONS: [
    'walk',
    'walk',
    'walk',
    'walk',
    'walk',
    'walk',
    'walk',
    'walk',
    'sit',
    'sit',
    'sit',
    'sit',
    'sit',
    'spin',
    'dance',
    'trip'
  ],
  // DeskBud: 性格权重（引擎 pickWeighted 用）—— 水豚慢悠悠：多趴坐、少转圈
  actionWeights: { walk: 6, spin: 1, sit: 6, dance: 2, trip: 1 },

  EDGE_ACTIONS: ['hang', 'hang', 'climb', 'fall'],

  JUMP_CHANCE: 0.05,
};

// 单只 capybara
window.DESKBUD_CAPYBARA_SPAWNING = [
  { id: 'deskbud-capybara', config: 'DESKBUD_CAPYBARA_CONFIG' }
];
