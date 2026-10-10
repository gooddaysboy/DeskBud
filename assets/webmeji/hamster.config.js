// DeskBud Webmeji hamster 配置（由 tools/material/gen_webmeji_pet.py 生成）
// 行为语义与 rabbit/panda 一致；hangstillSide 复用 hangstillTop 帧（同 rabbit 做法）
// 朝向：素材面朝右 = 引擎基准（webmeji.js 向右用原图、向左镜像）⇒ 无需翻转。

window.DESKBUD_HAMSTER_CONFIG = {
  ALLOWANCES: ['pet', 'drag', 'bottom', 'top', 'left', 'right'],

  walkspeed: 62,
  fallspeed: 180,
  jumpspeed: 150,
  gettingupspeed: 2000,

  // 底部行为
  walk:        { frames: ["assets/webmeji/hamster/walk/f000.webp", "assets/webmeji/hamster/walk/f001.webp", "assets/webmeji/hamster/walk/f002.webp", "assets/webmeji/hamster/walk/f003.webp", "assets/webmeji/hamster/walk/f004.webp", "assets/webmeji/hamster/walk/f005.webp", "assets/webmeji/hamster/walk/f006.webp", "assets/webmeji/hamster/walk/f007.webp", "assets/webmeji/hamster/walk/f008.webp", "assets/webmeji/hamster/walk/f009.webp", "assets/webmeji/hamster/walk/f010.webp", "assets/webmeji/hamster/walk/f011.webp", "assets/webmeji/hamster/walk/f012.webp", "assets/webmeji/hamster/walk/f013.webp", "assets/webmeji/hamster/walk/f014.webp", "assets/webmeji/hamster/walk/f015.webp", "assets/webmeji/hamster/walk/f016.webp", "assets/webmeji/hamster/walk/f017.webp", "assets/webmeji/hamster/walk/f018.webp", "assets/webmeji/hamster/walk/f019.webp", "assets/webmeji/hamster/walk/f020.webp", "assets/webmeji/hamster/walk/f021.webp", "assets/webmeji/hamster/walk/f022.webp", "assets/webmeji/hamster/walk/f023.webp"], interval: 90 },
  stand:       { frames: ["assets/webmeji/hamster/stand/f000.webp", "assets/webmeji/hamster/stand/f001.webp"], interval: 700 },
  sit:         { frames: ["assets/webmeji/hamster/sit/f000.webp", "assets/webmeji/hamster/sit/f001.webp", "assets/webmeji/hamster/sit/f002.webp", "assets/webmeji/hamster/sit/f003.webp", "assets/webmeji/hamster/sit/f004.webp", "assets/webmeji/hamster/sit/f005.webp", "assets/webmeji/hamster/sit/f006.webp", "assets/webmeji/hamster/sit/f007.webp", "assets/webmeji/hamster/sit/f008.webp", "assets/webmeji/hamster/sit/f009.webp", "assets/webmeji/hamster/sit/f010.webp", "assets/webmeji/hamster/sit/f011.webp", "assets/webmeji/hamster/sit/f012.webp", "assets/webmeji/hamster/sit/f013.webp", "assets/webmeji/hamster/sit/f014.webp", "assets/webmeji/hamster/sit/f015.webp", "assets/webmeji/hamster/sit/f016.webp", "assets/webmeji/hamster/sit/f017.webp", "assets/webmeji/hamster/sit/f018.webp", "assets/webmeji/hamster/sit/f019.webp", "assets/webmeji/hamster/sit/f020.webp", "assets/webmeji/hamster/sit/f021.webp", "assets/webmeji/hamster/sit/f022.webp", "assets/webmeji/hamster/sit/f023.webp", "assets/webmeji/hamster/sit/f024.webp"], interval: 160 },
  spin:        { frames: ["assets/webmeji/hamster/spin/f000.webp"], interval: 80 },
  dance:       { frames: ["assets/webmeji/hamster/dance/f000.webp", "assets/webmeji/hamster/dance/f001.webp", "assets/webmeji/hamster/dance/f002.webp", "assets/webmeji/hamster/dance/f003.webp", "assets/webmeji/hamster/dance/f004.webp", "assets/webmeji/hamster/dance/f005.webp"], interval: 130 },
  trip:        { frames: ["assets/webmeji/hamster/trip/f000.webp", "assets/webmeji/hamster/trip/f001.webp", "assets/webmeji/hamster/trip/f002.webp", "assets/webmeji/hamster/trip/f003.webp", "assets/webmeji/hamster/trip/f004.webp"], interval: 130 },
  forcethink:  { frames: ["assets/webmeji/hamster/forcethink/f000.webp", "assets/webmeji/hamster/forcethink/f001.webp", "assets/webmeji/hamster/forcethink/f002.webp", "assets/webmeji/hamster/forcethink/f003.webp", "assets/webmeji/hamster/forcethink/f004.webp"], interval: 180, loops: 2 },
  pet:         { frames: ["assets/webmeji/hamster/pet/f000.webp", "assets/webmeji/hamster/pet/f001.webp", "assets/webmeji/hamster/pet/f002.webp"], interval: 250 },
  drag:        { frames: ["assets/webmeji/hamster/drag/f000.webp", "assets/webmeji/hamster/drag/f001.webp", "assets/webmeji/hamster/drag/f002.webp"], interval: 100 },
  forcewalk:   { loops: 6 },                                          // 用 walk 帧

  // 下落与落地
  falling:     { frames: ["assets/webmeji/hamster/falling/f000.webp", "assets/webmeji/hamster/falling/f001.webp", "assets/webmeji/hamster/falling/f002.webp", "assets/webmeji/hamster/falling/f003.webp", "assets/webmeji/hamster/falling/f004.webp", "assets/webmeji/hamster/falling/f005.webp", "assets/webmeji/hamster/falling/f006.webp", "assets/webmeji/hamster/falling/f007.webp", "assets/webmeji/hamster/falling/f008.webp", "assets/webmeji/hamster/falling/f009.webp", "assets/webmeji/hamster/falling/f010.webp", "assets/webmeji/hamster/falling/f011.webp", "assets/webmeji/hamster/falling/f012.webp", "assets/webmeji/hamster/falling/f013.webp", "assets/webmeji/hamster/falling/f014.webp", "assets/webmeji/hamster/falling/f015.webp", "assets/webmeji/hamster/falling/f016.webp", "assets/webmeji/hamster/falling/f017.webp", "assets/webmeji/hamster/falling/f018.webp", "assets/webmeji/hamster/falling/f019.webp", "assets/webmeji/hamster/falling/f020.webp", "assets/webmeji/hamster/falling/f021.webp", "assets/webmeji/hamster/falling/f022.webp", "assets/webmeji/hamster/falling/f023.webp", "assets/webmeji/hamster/falling/f024.webp", "assets/webmeji/hamster/falling/f025.webp", "assets/webmeji/hamster/falling/f026.webp", "assets/webmeji/hamster/falling/f027.webp", "assets/webmeji/hamster/falling/f028.webp", "assets/webmeji/hamster/falling/f029.webp", "assets/webmeji/hamster/falling/f030.webp", "assets/webmeji/hamster/falling/f031.webp", "assets/webmeji/hamster/falling/f032.webp", "assets/webmeji/hamster/falling/f033.webp"], interval: 115 },
  fallen:      { frames: ["assets/webmeji/hamster/fallen/f000.webp", "assets/webmeji/hamster/fallen/f001.webp", "assets/webmeji/hamster/fallen/f002.webp", "assets/webmeji/hamster/fallen/f003.webp", "assets/webmeji/hamster/fallen/f004.webp", "assets/webmeji/hamster/fallen/f005.webp", "assets/webmeji/hamster/fallen/f006.webp", "assets/webmeji/hamster/fallen/f007.webp"], interval: 244, loops: 1 },

  // 屏顶专用
  jump:        { frames: ["assets/webmeji/hamster/jump/f000.webp"], interval: 160 },
  climbTop:    { frames: ["assets/webmeji/hamster/climbTop/f000.webp", "assets/webmeji/hamster/climbTop/f001.webp"], interval: 220, loops: 2 },
  climbSide:   { frames: ["assets/webmeji/hamster/climbSide/f000.webp", "assets/webmeji/hamster/climbSide/f001.webp", "assets/webmeji/hamster/climbSide/f002.webp", "assets/webmeji/hamster/climbSide/f003.webp", "assets/webmeji/hamster/climbSide/f004.webp", "assets/webmeji/hamster/climbSide/f005.webp", "assets/webmeji/hamster/climbSide/f006.webp", "assets/webmeji/hamster/climbSide/f007.webp", "assets/webmeji/hamster/climbSide/f008.webp", "assets/webmeji/hamster/climbSide/f009.webp", "assets/webmeji/hamster/climbSide/f010.webp", "assets/webmeji/hamster/climbSide/f011.webp", "assets/webmeji/hamster/climbSide/f012.webp", "assets/webmeji/hamster/climbSide/f013.webp", "assets/webmeji/hamster/climbSide/f014.webp", "assets/webmeji/hamster/climbSide/f015.webp", "assets/webmeji/hamster/climbSide/f016.webp", "assets/webmeji/hamster/climbSide/f017.webp", "assets/webmeji/hamster/climbSide/f018.webp", "assets/webmeji/hamster/climbSide/f019.webp", "assets/webmeji/hamster/climbSide/f020.webp", "assets/webmeji/hamster/climbSide/f021.webp", "assets/webmeji/hamster/climbSide/f022.webp", "assets/webmeji/hamster/climbSide/f023.webp", "assets/webmeji/hamster/climbSide/f024.webp"], interval: 150, loops: 2 },
  hangstillTop:{ frames: ["assets/webmeji/hamster/hangstillTop/f000.webp", "assets/webmeji/hamster/hangstillTop/f001.webp", "assets/webmeji/hamster/hangstillTop/f002.webp", "assets/webmeji/hamster/hangstillTop/f003.webp", "assets/webmeji/hamster/hangstillTop/f004.webp", "assets/webmeji/hamster/hangstillTop/f005.webp", "assets/webmeji/hamster/hangstillTop/f006.webp", "assets/webmeji/hamster/hangstillTop/f007.webp", "assets/webmeji/hamster/hangstillTop/f008.webp", "assets/webmeji/hamster/hangstillTop/f009.webp", "assets/webmeji/hamster/hangstillTop/f010.webp", "assets/webmeji/hamster/hangstillTop/f011.webp", "assets/webmeji/hamster/hangstillTop/f012.webp", "assets/webmeji/hamster/hangstillTop/f013.webp", "assets/webmeji/hamster/hangstillTop/f014.webp", "assets/webmeji/hamster/hangstillTop/f015.webp", "assets/webmeji/hamster/hangstillTop/f016.webp", "assets/webmeji/hamster/hangstillTop/f017.webp", "assets/webmeji/hamster/hangstillTop/f018.webp", "assets/webmeji/hamster/hangstillTop/f019.webp", "assets/webmeji/hamster/hangstillTop/f020.webp", "assets/webmeji/hamster/hangstillTop/f021.webp", "assets/webmeji/hamster/hangstillTop/f022.webp", "assets/webmeji/hamster/hangstillTop/f023.webp", "assets/webmeji/hamster/hangstillTop/f024.webp"], interval: 150, loops: 1, randomizeDuration: true, min: 3000, max: 8000 },
  hangstillSide:{ frames: ["assets/webmeji/hamster/hangstillTop/f000.webp", "assets/webmeji/hamster/hangstillTop/f001.webp", "assets/webmeji/hamster/hangstillTop/f002.webp", "assets/webmeji/hamster/hangstillTop/f003.webp", "assets/webmeji/hamster/hangstillTop/f004.webp", "assets/webmeji/hamster/hangstillTop/f005.webp", "assets/webmeji/hamster/hangstillTop/f006.webp", "assets/webmeji/hamster/hangstillTop/f007.webp", "assets/webmeji/hamster/hangstillTop/f008.webp", "assets/webmeji/hamster/hangstillTop/f009.webp", "assets/webmeji/hamster/hangstillTop/f010.webp", "assets/webmeji/hamster/hangstillTop/f011.webp", "assets/webmeji/hamster/hangstillTop/f012.webp", "assets/webmeji/hamster/hangstillTop/f013.webp", "assets/webmeji/hamster/hangstillTop/f014.webp", "assets/webmeji/hamster/hangstillTop/f015.webp", "assets/webmeji/hamster/hangstillTop/f016.webp", "assets/webmeji/hamster/hangstillTop/f017.webp", "assets/webmeji/hamster/hangstillTop/f018.webp", "assets/webmeji/hamster/hangstillTop/f019.webp", "assets/webmeji/hamster/hangstillTop/f020.webp", "assets/webmeji/hamster/hangstillTop/f021.webp", "assets/webmeji/hamster/hangstillTop/f022.webp", "assets/webmeji/hamster/hangstillTop/f023.webp", "assets/webmeji/hamster/hangstillTop/f024.webp"], interval: 150 },   // 侧挂复用顶挂素材

  ORIGINAL_ACTIONS: [
    'walk',
    'walk',
    'walk',
    'walk',
    'walk',
    'walk',
    'walk',
    'walk',
    'walk',
    'walk',
    'spin',
    'spin',
    'spin',
    'sit',
    'sit',
    'dance',
    'dance',
    'trip'
  ],
  // DeskBud: 性格权重（引擎 pickWeighted 用）—— 仓鼠忙忙碌碌：多走多转、偶尔吃点
  actionWeights: { walk: 10, spin: 3, sit: 3, dance: 3, trip: 2 },

  EDGE_ACTIONS: ['hang', 'hang', 'climb', 'fall'],

  JUMP_CHANCE: 0.05,
};

// 单只 hamster
window.DESKBUD_HAMSTER_SPAWNING = [
  { id: 'deskbud-hamster', config: 'DESKBUD_HAMSTER_CONFIG' }
];
