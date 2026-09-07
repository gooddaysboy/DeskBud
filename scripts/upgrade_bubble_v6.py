# -*- coding: utf-8 -*-
"""bubble.json v5 → v6：新增 reactions（交互气泡）与 states（状态/动作气泡）。

设计要点（2026-09-07 老曹拍板）：
  - 合并进单一真源 bubble.json，public/pets 原字段不动（向后兼容）
  - L1 随机语录 = public + pets[id]（既有行为不变）
  - L2 reactions = click / drag（用户交互，100% 触发，3s）
  - L3 states = climb/hang/slip/fall/land/walk/idle_stare/sleep/coquetry/naughty
    进状态按概率触发 + 冷却（详见 pet_window_v2.py STATE_* 常量）
  - 落地 land 归入 L3（原 L2 的 _REACT_LAND 并入 states.land，避免重复）
中文来自老曹提供的豆包语录，英文为对齐桌面中英切换 / website i18n 补充。
"""
import io
import json
import os

SRC = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                   'data', 'bubble.json')

# ---------------- L2 交互反应气泡 ----------------
REACTIONS = {
    "click": {
        "public": [
            {"zh": "呀！", "en": "Oof!"},
            {"zh": "别戳我～", "en": "Stop poking me~"},
            {"zh": "干嘛～", "en": "Hey~"},
            {"zh": "嘿嘿，起飞！", "en": "Wheee!"},
            {"zh": "吓我一跳", "en": "You startled me"},
        ],
        "pets": {
            "rabbit": [
                {"zh": "耳朵被戳到啦！", "en": "You poked my ears!"},
                {"zh": "蹦一下给你看", "en": "Watch me hop"},
            ],
            "panda": [
                {"zh": "圆滚滚被戳", "en": "Someone poked this chubby ball"},
                {"zh": "别闹，我在发呆", "en": "Stop it, I'm zoning out"},
            ],
        },
    },
    "drag": {
        "public": [
            {"zh": "哎呀，放我下来！", "en": "Put me down!"},
            {"zh": "轻点轻点～", "en": "Gently please~"},
            {"zh": "要被拎走了", "en": "Being carried away"},
            {"zh": "呜哇——", "en": "Whoa—"},
            {"zh": "稳住稳住！", "en": "Hold steady!"},
        ],
        "pets": {
            "rabbit": [
                {"zh": "抓腿腿是不对的！", "en": "Grabbing my legs is rude!"},
                {"zh": "飞起来啦～", "en": "I'm flying~"},
            ],
            "panda": [
                {"zh": "抱不动啦，太重", "en": "Too heavy to carry"},
                {"zh": "慢点晃，晕了", "en": "Slow down, I'm dizzy"},
            ],
        },
    },
}

# ---------------- L3 状态 / 动作气泡 ----------------
STATES = {
    # 一、攀爬
    "climb": {
        "public": [
            {"zh": "咻，努力向上爬✨", "en": "Wheee, climbing with all my might ✨"},
            {"zh": "抓牢，往高处进发", "en": "Holding tight, heading up high"},
            {"zh": "一点点往上挪", "en": "Inching up bit by bit"},
            {"zh": "登高探险开始！", "en": "The climb begins!"},
            {"zh": "扒住边框绝不松手", "en": "Gripping the edge, never letting go"},
        ],
        "pets": {
            "panda": [
                {"zh": "胖滚滚奋力扒墙", "en": "Round and chubby, clawing up the wall"},
                {"zh": "小短爪使劲蹬呀蹬", "en": "Little paws kicking hard"},
                {"zh": "身子笨重也要往上爬", "en": "Heavy body, still climbing"},
            ],
            "rabbit": [
                {"zh": "蹬蹬后腿向上冲", "en": "Kicking with my back legs, up I go"},
                {"zh": "长耳朵晃来晃去攀岩", "en": "Long ears swaying as I climb"},
                {"zh": "小兔探险家上线", "en": "Bunny explorer is online"},
            ],
        },
    },
    # 二、悬挂吊边
    "hang": {
        "public": [
            {"zh": "挂在这里偷偷看你😯", "en": "Hanging here, peeking at you 😯"},
            {"zh": "晃晃悠悠悬在空中", "en": "Dangling in the air, swaying"},
            {"zh": "爪子死死扒住", "en": "Paws gripping on for dear life"},
            {"zh": "吊在边上吹吹风", "en": "Hanging by the edge, enjoying the breeze"},
        ],
        "pets": {
            "panda": [
                {"zh": "圆乎乎挂住，晃晃荡荡", "en": "Round and round, hanging and swaying"},
                {"zh": "体重有点大，快抓不住", "en": "A bit heavy, losing my grip"},
            ],
            "rabbit": [
                {"zh": "吊住耳朵可不行！", "en": "Don't hang me by my ears!"},
                {"zh": "扒住边缘探头张望", "en": "Holding the edge, peeking around"},
            ],
        },
    },
    # 三、滑落（爬墙中途脱落）
    "slip": {
        "public": [
            {"zh": "糟了，脚脚打滑！", "en": "Oh no, my paws are slipping!"},
            {"zh": "快要抓不住啦🫨", "en": "Can't hold on much longer 🫨"},
            {"zh": "稳住，别滑下去！", "en": "Steady, don't slip!"},
            {"zh": "岌岌可危中…", "en": "Hanging by a thread…"},
        ],
        "pets": {
            "panda": [
                {"zh": "肉肉太重，往下溜了", "en": "Too much fluff, sliding down"},
                {"zh": "哎呀体重拖后腿", "en": "Oops, my weight let me down"},
            ],
            "rabbit": [
                {"zh": "脚底打滑，要溜咯", "en": "Paws slipping, here I go"},
            ],
        },
    },
    # 四、坠落 / 空中下落
    "fall": {
        "public": [
            {"zh": "啊 —— 掉下去咯！", "en": "Ahh—falling!"},
            {"zh": "失重下坠！", "en": "Free fall!"},
            {"zh": "咻～自由落体", "en": "Whoosh~ free falling"},
            {"zh": "完了完了！", "en": "Here we go!"},
        ],
        "pets": {
            "panda": [
                {"zh": "笨重下坠，挡不住啦", "en": "Falling clumsily, can't stop"},
                {"zh": "圆滚滚飞下去", "en": "Round and rolling down"},
            ],
            "rabbit": [
                {"zh": "小兔失控坠落！", "en": "Bunny falling out of control!"},
            ],
        },
    },
    # 五、落地 / 摔一跤
    "land": {
        "public": [
            {"zh": "嘭！安全落地", "en": "Thud! Safe landing"},
            {"zh": "哎哟，摔懵了", "en": "Ouch, that dazed me"},
            {"zh": "拍拍灰，没事没事", "en": "Dusting off, I'm fine"},
            {"zh": "屁股墩着地！", "en": "Landed right on my butt!"},
            {"zh": "安全着陆～", "en": "Safe landing~"},
            {"zh": "还好没摔疼", "en": "Good thing it did not hurt"},
        ],
        "pets": {
            "panda": [
                {"zh": "咚！肉肉缓冲伤害", "en": "Boom! The fluff cushioned it"},
                {"zh": "摔得滚了一圈", "en": "Tumbled a full roll"},
            ],
            "rabbit": [
                {"zh": "啪嗒，摔个兔屁股", "en": "Splat, landed on my bunny butt"},
                {"zh": "抖抖耳朵恢复状态", "en": "Shaking my ears, back in shape"},
            ],
        },
    },
    # 六、散步闲逛
    "walk": {
        "public": [
            {"zh": "桌面巡街中🚶", "en": "Patrolling the desktop 🚶"},
            {"zh": "随便走走逛逛", "en": "Just wandering around"},
            {"zh": "这里瞧瞧，那里看看", "en": "A look here, a peek there"},
            {"zh": "悠闲溜达 ing", "en": "Strolling around, carefree"},
        ],
        "pets": {
            "panda": [
                {"zh": "慢悠悠晃着散步", "en": "Waddling slowly along"},
                {"zh": "胖团子巡逻桌面", "en": "Chubby ball on patrol"},
            ],
            "rabbit": [
                {"zh": "小碎步蹦来蹦去", "en": "Hopping about with tiny steps"},
                {"zh": "蹦跳着四处溜达", "en": "Bouncing around the place"},
            ],
        },
    },
    # 七、发呆 / 摸鱼放空
    "idle_stare": {
        "public": [
            {"zh": "发呆放空中…", "en": "Zoning out…"},
            {"zh": "什么都不想干", "en": "Don't feel like doing anything"},
            {"zh": "就这样静静待着", "en": "Just staying quiet like this"},
            {"zh": "看看窗外", "en": "Looking out the window"},
        ],
        "pets": {
            "panda": [
                {"zh": "瘫住，脑子空空", "en": "Flopped down, mind empty"},
                {"zh": "摆烂小熊猫", "en": "A little panda giving up"},
            ],
            "rabbit": [
                {"zh": "支棱耳朵发呆", "en": "Ears up, spacing out"},
                {"zh": "愣在原地思考兔生", "en": "Standing still, pondering bunny life"},
            ],
        },
    },
    # 八、睡觉 / 打盹
    "sleep": {
        "public": [
            {"zh": "好困，眯一会💤", "en": "So sleepy, nap time 💤"},
            {"zh": "呼呼睡觉啦", "en": "Off to dreamland"},
            {"zh": "就地打盹", "en": "Napping right here"},
            {"zh": "晚安，桌面世界", "en": "Good night, desktop world"},
        ],
        "pets": {
            "panda": [
                {"zh": "蜷成一团呼呼大睡", "en": "Curled up, fast asleep"},
                {"zh": "胖团子开启休眠", "en": "Chubby ball entering sleep mode"},
            ],
            "rabbit": [
                {"zh": "团成毛毛小球睡觉", "en": "Curled into a fluffy ball"},
                {"zh": "耳朵耷拉下来睡咯", "en": "Ears drooping, time to sleep"},
            ],
        },
    },
    # 九、撒娇蹭屏幕（微动作）
    "coquetry": {
        "public": [
            {"zh": "过来陪我玩嘛🥺", "en": "Come play with me 🥺"},
            {"zh": "摸摸我好不好", "en": "Will you pet me?"},
            {"zh": "贴贴屏幕～", "en": "Snuggling up to the screen~"},
        ],
        "pets": {
            "panda": [
                {"zh": "蹭蹭求摸摸", "en": "Nuzzling for pets"},
                {"zh": "圆滚滚求陪伴", "en": "Round and round, wanting company"},
            ],
            "rabbit": [
                {"zh": "脑袋蹭一蹭", "en": "Rubbing my head on you"},
                {"zh": "歪头撒娇", "en": "Head tilt, being cute"},
            ],
        },
    },
    # 十、调皮捣乱（暂无桌面行为对应，留给将来玩法；数据先备好）
    "naughty": {
        "public": [
            {"zh": "嘿嘿，挡住你的屏幕", "en": "Hehe, blocking your screen"},
            {"zh": "悄悄捣乱一下", "en": "A little mischief, quietly"},
            {"zh": "这里我占下啦", "en": "This spot is mine now"},
        ],
        "pets": {
            "panda": [
                {"zh": "胖身子霸占桌面位置", "en": "My chubby body claims this spot"},
                {"zh": "随便拱一拱图标", "en": "Nudging your icons around"},
            ],
            "rabbit": [
                {"zh": "蹦来蹦去到处捣乱", "en": "Hopping around, causing chaos"},
                {"zh": "蹦到图标上面玩耍", "en": "Hopping onto your icons to play"},
            ],
        },
    },
}


def main():
    with io.open(SRC, encoding='utf-8') as f:
        data = json.load(f)
    data['version'] = 6
    data['reactions'] = REACTIONS
    data['states'] = STATES
    with io.open(SRC, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    n_r = sum(len(v['public']) + sum(len(x) for x in v['pets'].values())
              for v in REACTIONS.values())
    n_s = sum(len(v['public']) + sum(len(x) for x in v['pets'].values())
              for v in STATES.values())
    print(f'OK v6  reactions={n_r}条  states={n_s}条  '
          f'(public/pets 原样保留 {len(data.get("public", []))} 条随机语录)')


if __name__ == '__main__':
    main()
