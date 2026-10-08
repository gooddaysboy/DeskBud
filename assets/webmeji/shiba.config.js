// DeskBud Webmeji 柴犬配置（2026-10-07 自 pyside6/shiba_frames 转换；2026-10-08 补 26 动作）
// 与 rabbit.config.js / panda.config.js 同一套行为语义。
// 2026-10-08：sit/pet/dance/forcethink/falling/fallen/jump 换真帧；
//    老曹拍板【动作一律免费尽情展示】（收费=宠物买断+配饰/装备槽），
//    招牌动作 eaction1-4（作揖/握手/蹭脸颊/打滚）正式接入网页，低权重偶尔惊喜。
//    spin/trip/drag 无专属素材，仍用 stand 帧兜底（缺帧不崩、优雅退化为站桩）。

window.DESKBUD_SHIBA_CONFIG = {
  // 柴犬有专属 climb/hang 素材，故开 left/right（爬侧墙 + 倒挂）
  ALLOWANCES: ['pet', 'drag', 'bottom', 'top', 'left', 'right'],

  walkspeed: 46,      // 比兔子(50)略慢、比熊猫(42)快，柴犬小跑
  fallspeed: 180,
  jumpspeed: 150,
  gettingupspeed: 2000,

  // ---- 底部行为 ----
  // stand：柴犬 idle 24 帧，取前 2 帧做轻微呼吸感
  stand:  { frames: ["assets/webmeji/shiba/stand/f000.webp",
                     "assets/webmeji/shiba/stand/f001.webp"], interval: 600, loops: 1 },
  // walk：柴犬 run 24 帧（跑步机效果，位移由引擎算）
  walk:   { frames: Array.from({length: 24}, (_, i) =>
                     "assets/webmeji/shiba/walk/f" + String(i).padStart(3, '0') + ".webp"),
            interval: 130, loops: 2 },

  // ---- 坐姿 / 互动（2026-10-08 换真帧）----
  // sit：柴犬 sit 25 帧
  sit:    { frames: Array.from({length: 25}, (_, i) =>
                     "assets/webmeji/shiba/sit/f" + String(i).padStart(3, '0') + ".webp"),
            interval: 160 },
  // pet：被摸头 → 抬头望（sit_look_up 25 帧）
  pet:    { frames: Array.from({length: 25}, (_, i) =>
                     "assets/webmeji/shiba/pet/f" + String(i).padStart(3, '0') + ".webp"),
            interval: 250 },
  // dance：开心跳（jumphappy 24 帧）
  dance:  { frames: Array.from({length: 24}, (_, i) =>
                     "assets/webmeji/shiba/dance/f" + String(i).padStart(3, '0') + ".webp"),
            interval: 130, loops: 2 },
  // forcethink：护眼操（eye_exercise 24 帧）
  forcethink: { frames: Array.from({length: 24}, (_, i) =>
                     "assets/webmeji/shiba/forcethink/f" + String(i).padStart(3, '0') + ".webp"),
            interval: 220, loops: 2 },

  // ---- 招牌动作（2026-10-08 老曹拍板全开放，免费尽情展示）----
  // eaction1-4：作揖/握手/蹭脸颊/打滚，各 25 帧，不在 webmeji 词表映射里，
  // 直接用原名注册——引擎按 Object.keys 过滤 Array frames 自动发现。
  eaction1: { frames: Array.from({length: 25}, (_, i) =>
                     "assets/webmeji/shiba/eaction1/f" + String(i).padStart(3, '0') + ".webp"),
            interval: 100 },
  eaction2: { frames: Array.from({length: 25}, (_, i) =>
                     "assets/webmeji/shiba/eaction2/f" + String(i).padStart(3, '0') + ".webp"),
            interval: 100 },
  eaction3: { frames: Array.from({length: 25}, (_, i) =>
                     "assets/webmeji/shiba/eaction3/f" + String(i).padStart(3, '0') + ".webp"),
            interval: 100 },
  eaction4: { frames: Array.from({length: 25}, (_, i) =>
                     "assets/webmeji/shiba/eaction4/f" + String(i).padStart(3, '0') + ".webp"),
            interval: 100 },

  // ---- 无专属素材占位：显式给 stand，缺帧时不会崩 ----
  spin:        { frames: ["assets/webmeji/shiba/stand/f000.webp"], interval: 200, loops: 2 },
  trip:        { frames: ["assets/webmeji/shiba/stand/f000.webp"], interval: 200, loops: 1 },
  drag:        { frames: ["assets/webmeji/shiba/stand/f000.webp"], interval: 110 },

  // ---- 下落与落地（2026-10-08 换真帧）----
  // falling：柴犬 fall 34 帧
  falling:     { frames: Array.from({length: 34}, (_, i) =>
                     "assets/webmeji/shiba/falling/f" + String(i).padStart(3, '0') + ".webp"),
            interval: 115 },
  // fallen：fall 末 2 帧（落地趴住）
  fallen:      { frames: ["assets/webmeji/shiba/fallen/f000.webp",
                          "assets/webmeji/shiba/fallen/f001.webp"], interval: 244, loops: 1 },
  // jump：jumphappy 中间帧（腾空最高点）
  jump:        { frames: ["assets/webmeji/shiba/jump/f000.webp"], interval: 160 },

  // ---- 顶部 / 侧墙 ----
  // climbSide：柴犬 climb 3 帧循环贴墙爬（垂直位移由 webmeji 计算）
  climbSide: { frames: ["assets/webmeji/shiba/climbSide/f000.webp",
                        "assets/webmeji/shiba/climbSide/f001.webp",
                        "assets/webmeji/shiba/climbSide/f002.webp"], interval: 140, loops: 0 },
  // hangstillTop：柴犬 hang 25 帧（扒住顶边、头朝上、身体垂下——不是倒挂）
  hangstillTop: { frames: Array.from({length: 25}, (_, i) =>
                        "assets/webmeji/shiba/hangstillTop/f" + String(i).padStart(3, '0') + ".webp"),
                  interval: 120, loops: 0 },
  // hangstillSide：复用顶挂帧（同 panda 做法）
  hangstillSide: { frames: Array.from({length: 25}, (_, i) =>
                        "assets/webmeji/shiba/hangstillTop/f" + String(i).padStart(3, '0') + ".webp"),
                  interval: 120 },
  // climbTop：climb 仅 3 帧，复用侧爬第 2 帧
  climbTop:    { frames: ["assets/webmeji/shiba/climbSide/f001.webp"], interval: 140, loops: 0 },

  // ---- 引擎必读三项（缺任一 → Creature 构造抛 TypeError，宠物静默不生成）----
  // ORIGINAL_ACTIONS：随机表演池。sit/dance 已有真帧可入池；
  //   spin/trip 仍是站桩占位，权重压低；eaction1-4 招牌低频惊喜。
  ORIGINAL_ACTIONS: [
    'walk','walk','walk','walk','walk','walk',
    'walk','walk','walk','walk',
    'stand','stand','stand',
    'sit','sit',
    'dance','dance',
    'trip',
    'eaction1','eaction2','eaction3','eaction4'
  ],
  // 性格权重（引擎 pickWeighted 用）——柴犬活泼：爱走爱坐，偶尔跳舞，
  // 招牌动作（作揖/握手/蹭脸颊/打滚）低于常规动作，偶尔惊喜
  actionWeights: { walk: 7, stand: 3, sit: 3, dance: 2, trip: 1,
                   eaction1: 1, eaction2: 1, eaction3: 1, eaction4: 1 },

  // 屏顶到达后的随机选择：挂住 / 顶部爬 / 从顶部落下
  EDGE_ACTIONS: ['hang', 'hang', 'climb', 'fall'],

  // 底部每秒跳向屏顶的概率（与兔/熊猫一致）
  JUMP_CHANCE: 0.05,
};

// 出场配置：id 唯一，config 指向上面已注册的全局名
window.DESKBUD_SHIBA_SPAWNING = [
  { id: 'deskbud-shiba', config: 'DESKBUD_SHIBA_CONFIG' }
];
