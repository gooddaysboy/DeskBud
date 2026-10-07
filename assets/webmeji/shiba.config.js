// DeskBud Webmeji 柴犬配置（2026-10-07 自 pyside6/shiba_frames 转换）
// 与 rabbit.config.js / panda.config.js 同一套行为语义。
// ⚠️ 当前为【测试位·部分动作】：仅映射 4 个动作
//    idle→stand / run→walk / climb→climbSide / hang→hangstillTop
//    其余动作（sit/pet/drag/dance/trip/spin/forcethink/climbTop/falling/fallen）
//    素材未产出 ⇒ webmeji 缺帧时退化为站桩（stand），不影响运行。
//    待 24 动作补齐后本文件补全。

window.DESKBUD_SHIBA_CONFIG = {
  // 柴犬有专属 climb/hang 素材，故开 left/right（爬侧墙 + 倒挂）
  ALLOWANCES: ['pet', 'drag', 'bottom', 'top', 'left', 'right'],

  walkspeed: 46,      // 比兔子(50)略慢、比熊猫(42)快，柴犬小跑
  fallspeed: 180,
  jumpspeed: 150,
  gettingupspeed: 2000,

  // ---- 底部行为 ----
  // stand：柴犬 idle 24 帧（含眨眼），取前 2 帧做轻微呼吸感
  stand:  { frames: ["assets/webmeji/shiba/stand/f000.webp",
                     "assets/webmeji/shiba/stand/f001.webp"], interval: 600, loops: 1 },
  // walk：柴犬 run 24 帧（跑步机效果，位移由引擎算）
  walk:   { frames: ["assets/webmeji/shiba/walk/f000.webp",
                     "assets/webmeji/shiba/walk/f004.webp",
                     "assets/webmeji/shiba/walk/f008.webp",
                     "assets/webmeji/shiba/walk/f012.webp",
                     "assets/webmeji/shiba/walk/f016.webp",
                     "assets/webmeji/shiba/walk/f020.webp",
                     "assets/webmeji/shiba/walk/f023.webp"], interval: 130, loops: 2 },

  // ---- 顶部 / 侧墙 ----
  // climbSide：柴犬 climb 3 帧循环贴墙爬（垂直位移由 webmeji 计算）
  climbSide: { frames: ["assets/webmeji/shiba/climbSide/f000.webp",
                        "assets/webmeji/shiba/climbSide/f001.webp",
                        "assets/webmeji/shiba/climbSide/f002.webp"], interval: 140, loops: 0 },
  // hangstillTop：柴犬 hang 25 帧（扒住顶边、头朝上、身体垂下——不是倒挂）
  hangstillTop: { frames: Array.from({length: 25}, (_, i) =>
                        "assets/webmeji/shiba/hangstillTop/f" + String(i).padStart(3, '0') + ".webp"),
                  interval: 120, loops: 0 },

  // ---- 未产出动作占位：显式给 stand，缺帧时不会崩 ----
  sit:         { frames: ["assets/webmeji/shiba/stand/f000.webp"], interval: 300, loops: 1, randomizeDuration: true, min: 3000, max: 9000 },
  spin:        { frames: ["assets/webmeji/shiba/stand/f000.webp"], interval: 200, loops: 2 },
  dance:       { frames: ["assets/webmeji/shiba/stand/f001.webp"], interval: 200, loops: 2 },
  trip:        { frames: ["assets/webmeji/shiba/stand/f000.webp"], interval: 200, loops: 1 },
  pet:         { frames: ["assets/webmeji/shiba/stand/f001.webp"], interval: 260 },
  drag:        { frames: ["assets/webmeji/shiba/stand/f000.webp"], interval: 110 },
  forcethink:  { frames: ["assets/webmeji/shiba/stand/f001.webp"], interval: 220, loops: 2 },
  climbTop:    { frames: ["assets/webmeji/shiba/climbSide/f001.webp"], interval: 140, loops: 0 },
  falling:     { frames: ["assets/webmeji/shiba/stand/f000.webp"], interval: 90 },
  fallen:      { frames: ["assets/webmeji/shiba/stand/f000.webp"], interval: 400, loops: 1 },

  // ---- 引擎必读三项（缺任一 → Creature 构造抛 TypeError，宠物静默不生成）----
  // ORIGINAL_ACTIONS：随机表演池。⚠️ 未产出素材的动作会退化为 stand，
  //   故此处只列已产出 4 项 + 权重低的 stand/trip，别把 sit/dance 排满（否则一直站桩）。
  ORIGINAL_ACTIONS: [
    'walk','walk','walk','walk','walk','walk',
    'walk','walk','walk','walk',
    'stand','stand','stand',
    'trip'
  ],
  // 性格权重（引擎 pickWeighted 用）——柴犬活泼：爱走，但 climb 素材别太频繁
  actionWeights: { walk: 7, stand: 3, trip: 2 },

  // 屏顶到达后的随机选择：挂住 / 顶部爬 / 从顶部落下
  EDGE_ACTIONS: ['hang', 'hang', 'climb', 'fall'],

  // 底部每秒跳向屏顶的概率（与兔/熊猫一致）
  JUMP_CHANCE: 0.05,
};

// 出场配置：id 唯一，config 指向上面已注册的全局名
window.DESKBUD_SHIBA_SPAWNING = [
  { id: 'deskbud-shiba', config: 'DESKBUD_SHIBA_CONFIG' }
];