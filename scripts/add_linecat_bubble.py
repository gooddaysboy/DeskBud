# -*- coding: utf-8 -*-
"""给 data/bubble.json 新增 linecat（单线/线条卡通小猫）语录。
保持原文件"单行 {zh,en} 对象 + 2 空格缩进"格式，仅追加，不重排。"""
import json, re, io

PATH = r"D:\360Downloads\deskbud\website\data\bubble.json"

linecat_main = [
    {"zh": "我只有几根线条，但够陪你啦", "en": "Just a few lines, but enough to keep you company"},
    {"zh": "简简单单一条线，画出小日子", "en": "A simple line, sketching out little days"},
    {"zh": "主人敲键盘，我就在旁边简笔画自己", "en": "You type, I doodle myself in the corner"},
    {"zh": "别嫌我线条少，少才显瘦哦", "en": "Don't mind my few lines — less is what keeps me slim"},
    {"zh": "阳光斜斜照过来，我把自己摊成一条线", "en": "Slanted sunlight, I stretch myself into one line"},
    {"zh": "高冷是画风，黏人是本性", "en": "Aloof is the art style, clingy is the nature"},
    {"zh": "小鱼干没有，画一条安慰自己", "en": "No dried fish? I'll draw one to comfort myself"},
    {"zh": "尾巴只一笔，甩起来也挺带感", "en": "My tail's just one stroke, but it swings with flair"},
    {"zh": "今天也是安静的一笔一画", "en": "Another quiet stroke-by-stroke kind of day"},
    {"zh": "摸摸头，线条会发光哦", "en": "Pet my head, the lines will glow"},
    {"zh": "我没什么立体感，但陪你的心意是满的", "en": "I'm not 3D, but my heart for you is full"},
    {"zh": "主人发呆时，我替你留白", "en": "When you zone out, I hold the whitespace for you"},
    {"zh": "一杯茶的工夫，我就能画完整个下午", "en": "In one cup of tea, I sketch the whole afternoon"},
    {"zh": "别催，线条要慢慢描才好看", "en": "Don't rush, lines look best drawn slowly"},
    {"zh": "不开心就看看我，我可是极简治愈系", "en": "Feeling down? I'm minimalist healing"},
    {"zh": "我兜里没装啥，只装了点陪伴", "en": "My pockets hold nothing but a bit of company"},
    {"zh": "风一吹，我的线条轻轻晃", "en": "A breeze, and my lines sway gently"},
    {"zh": "困了，把自己卷成一只线团", "en": "Sleepy, I curl into a ball of lines"},
    {"zh": "你的桌面有点空，我来做那抹简笔", "en": "Your desktop feels empty, let me be that simple stroke"},
    {"zh": "慢一点，线条和日子都要从容", "en": "Slow down, lines and days alike deserve ease"},
]

click_lc = [
    {"zh": "线条被戳到啦！", "en": "You poked my lines!"},
    {"zh": "轻轻一笔，弹起来", "en": "A light flick, bouncing up"},
    {"zh": "喂，别乱点我的轮廓", "en": "Hey, don't tap my outline"},
    {"zh": "我可是易碎的简笔画", "en": "I'm a fragile little sketch"},
]

drag_lc = [
    {"zh": "线条被拎起来咯", "en": "My lines are being lifted"},
    {"zh": "轻点轻点，我会散架", "en": "Gently, I might fall apart"},
    {"zh": "飘起来了～", "en": "Floating up~"},
]

states_lc = {
    "climb": [
        {"zh": "扒住边框，一笔一笔往上挪", "en": "Gripping the edge, inching up stroke by stroke"},
        {"zh": "线条攀岩中，慢慢爬", "en": "Line-rock-climbing, slowly upward"},
    ],
    "hang": [
        {"zh": "吊在边上，线条轻轻晃", "en": "Hanging by the edge, lines swaying"},
        {"zh": "单线悬空，晃晃悠悠", "en": "A single line suspended, swaying"},
    ],
    "slip": [
        {"zh": "脚脚打滑，线条要溜了", "en": "Paws slipping, the line's about to slide"},
        {"zh": "抓不住，一笔滑下去", "en": "Can't hold on, sliding down in one stroke"},
    ],
    "fall": [
        {"zh": "啊——线条自由落体", "en": "Ah—line free-falling"},
        {"zh": "简笔失控下坠！", "en": "Sketch out of control, plummeting!"},
    ],
    "land": [
        {"zh": "嘭！线条安全着陆", "en": "Thud! Lines landed safe"},
        {"zh": "拍拍灰，继续简笔人生", "en": "Dusting off, back to my sketched life"},
    ],
    "walk": [
        {"zh": "桌面巡街，一笔一画晃悠", "en": "Patrolling the desktop, swaying stroke by stroke"},
        {"zh": "小碎步，慢慢描过去", "en": "Tiny steps, slowly drawn"},
    ],
    "idle_stare": [
        {"zh": "线条放空，什么都不想画", "en": "Lines blanking out, nothing to draw"},
        {"zh": "就这样静静待着，留白也挺好", "en": "Just staying still, whitespace is nice too"},
    ],
    "sleep": [
        {"zh": "线条打卷，进入休眠模式", "en": "Lines curling up, entering sleep mode"},
        {"zh": "蜷成一只线团睡觉", "en": "Curled into a ball of lines, asleep"},
    ],
    "coquetry": [
        {"zh": "过来陪我画嘛🥺", "en": "Come draw with me 🥺"},
        {"zh": "摸摸我，线条会发光", "en": "Pet me, the lines will glow"},
    ],
    "naughty": [
        {"zh": "嘿嘿，挡住你的屏幕一角", "en": "Hehe, blocking a corner of your screen"},
        {"zh": "悄悄在线条上捣乱", "en": "Quietly causing mischief on the lines"},
    ],
}

greet_lc = [
    {"zh": "我是一笔就能画出来的小猫～", "en": "I'm a cat you can draw in one stroke~"},
    {"zh": "主人主人，我来陪你啦", "en": "Boss, I'm here to keep you company"},
    {"zh": "简简单单，报到！", "en": "Simple and plain, reporting in!"},
]

with io.open(PATH, encoding="utf-8") as f:
    d = json.load(f)

d["pets"]["linecat"] = linecat_main
d["reactions"]["click"]["pets"]["linecat"] = click_lc
d["reactions"]["drag"]["pets"]["linecat"] = drag_lc
for k, v in states_lc.items():
    d["states"][k]["pets"]["linecat"] = v
d["greetings"]["pets"]["linecat"] = greet_lc

s = json.dumps(d, ensure_ascii=False, indent=2)
# 把纯 {zh,en} 语录条目压回单行，保持原文件格式
s = re.sub(
    r'(?s)\{\s*"zh"\s*:\s*"((?:[^"\\]|\\.)*)"\s*,\s*"en"\s*:\s*"((?:[^"\\]|\\.)*)"\s*\}',
    r'{"zh": "\1", "en": "\2"}',
    s,
)

with io.open(PATH, "w", encoding="utf-8") as f:
    f.write(s + "\n")

print("OK version=%s linecat main=%d" % (d.get("version"), len(linecat_main)))
print("states keys patched:", list(states_lc.keys()))
