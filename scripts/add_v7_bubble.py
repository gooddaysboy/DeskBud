# -*- coding: utf-8 -*-
"""bubble.json v7 入库：按 kotlin 交接文档加 reminders/time_greetings/festivals 三键，version 6->7。
保持原文件"单行 {zh,en} 对象 + 2 空格缩进"格式，仅追加，不重排。
不动 linekit 等 v6 体系（pets/reactions/states/greetings）。"""
import json, re, io

PATH = r"D:\360Downloads\deskbud\website\data\bubble.json"

reminders = {
    "public": [
        {"zh": "坐了很久啦，起来活动活动吧", "en": "You've been sitting a while — get up and stretch!"},
        {"zh": "站起来伸个懒腰吧", "en": "Stand up and give a good stretch"},
        {"zh": "看看远处放松一下眼睛", "en": "Look into the distance to rest your eyes"},
        {"zh": "该休息一下啦，别太拼", "en": "Time for a break — don't push too hard"},
        {"zh": "喝口水，歇一会儿", "en": "Have some water and take a breather"},
        {"zh": "起来走两步，我陪你", "en": "Walk around a bit — I'll keep you company"},
    ],
    "actions": {
        "drink": [
            {"zh": "渴了吧？喝口水再战", "en": "Thirsty? Grab some water before the next round"},
            {"zh": "补充水分时间到，喝口水吧", "en": "Hydration time — take a sip"},
            {"zh": "水杯在向你招手～", "en": "Your water cup is waving at you~"},
        ],
        "eye_exercise": [
            {"zh": "做套眼保健操吧，我示范给你看", "en": "Let's do some eye exercises — I'll show you"},
            {"zh": "眼睛累了吧，揉一揉放松下", "en": "Eyes tired? Rub them and relax"},
            {"zh": "眨眨眼，看看远处歇一歇", "en": "Blink, and gaze into the distance to rest"},
        ],
    },
}

time_greetings = {
    "hours": {
        "8": [
            {"zh": "早上好呀，新的一天元气满满", "en": "Good morning! Fresh day, full of energy"},
            {"zh": "早！今天也要开开心心", "en": "Morning! Hope you're happy today"},
            {"zh": "起床啦，伸个懒腰迎接今天", "en": "Rise and shine — stretch to greet the day"},
        ],
        "12": [
            {"zh": "中午好，吃饱了才有力气玩", "en": "Noon! Eat well so you've got energy to play"},
            {"zh": "午饭时间到，别糊弄一口", "en": "Lunchtime — don't just grab anything"},
            {"zh": "晌午啦，眯一会儿也香", "en": "Midday — a little nap sounds nice"},
        ],
        "16": [
            {"zh": "下午茶时间，休息一下吧", "en": "Afternoon tea time — take a break"},
            {"zh": "下午好呀，来杯水歇一歇", "en": "Good afternoon — have some water and rest"},
            {"zh": "下午犯困了吧？动一动精神精神", "en": "Sleepy in the afternoon? Move a bit to wake up"},
        ],
        "22": [
            {"zh": "夜深啦，早点休息哦", "en": "It's late — rest early"},
            {"zh": "晚安，做个好梦", "en": "Good night, sweet dreams"},
            {"zh": "22 点了，别熬太晚呀", "en": "It's 10pm — don't stay up too late"},
        ],
    },
}

festivals = {
    "by_name": {
        "春节": [
            {"zh": "过年啦！恭喜发财！", "en": "Happy New Year! Wishing you wealth and fortune!"},
            {"zh": "新年快乐，万事如意", "en": "Happy New Year, all the best"},
        ],
        "除夕": [
            {"zh": "除夕啦，团圆饭真香", "en": "It's New Year's Eve — the reunion dinner smells amazing"},
            {"zh": "守岁迎新，来年更旺", "en": "Staying up to welcome the new year — may it be even better"},
        ],
        "元宵节": [
            {"zh": "元宵节快乐，吃汤圆咯", "en": "Happy Lantern Festival — time for sweet rice balls"},
            {"zh": "花灯真好看，猜个灯谜不", "en": "The lanterns are beautiful — wanna guess a riddle?"},
        ],
        "端午节": [
            {"zh": "端午安康，粽子真香", "en": "Happy Dragon Boat Festival — the zongzi smells great"},
            {"zh": "粽叶飘香，端午安康", "en": "Wrapped in leaves, wishing you well this Duanwu"},
        ],
        "七夕": [
            {"zh": "七夕快乐呀", "en": "Happy Qixi!"},
            {"zh": "今晚的星星真亮，七夕快乐", "en": "The stars shine bright tonight — Happy Qixi"},
        ],
        "中秋节": [
            {"zh": "中秋快乐，月饼分我一半呗", "en": "Happy Mid-Autumn — save me half a mooncake?"},
            {"zh": "月圆人团圆，中秋快乐", "en": "Full moon, full reunion — Happy Mid-Autumn"},
        ],
        "重阳节": [
            {"zh": "重阳节，记得陪陪家里老人", "en": "Double Ninth Festival — remember to spend time with the elders"},
            {"zh": "登高望远，重阳安康", "en": "Climb high and look far — well wishes this Chongyang"},
        ],
        "腊八节": [
            {"zh": "腊八啦，喝碗腊八粥暖暖", "en": "It's Laba — warm up with a bowl of Laba porridge"},
            {"zh": "过了腊八就是年", "en": "After Laba comes the New Year"},
        ],
        "元旦": [
            {"zh": "元旦快乐，新年新气象", "en": "Happy New Year's Day — fresh start"},
            {"zh": "今年第一天，元气满满", "en": "First day of the year, full of energy"},
        ],
        "国庆节": [
            {"zh": "国庆快乐，放假真开心", "en": "Happy National Day — love the holiday"},
            {"zh": "祖国生日快乐", "en": "Happy birthday to our motherland"},
        ],
        "儿童节": [
            {"zh": "儿童节快乐，永远年轻", "en": "Happy Children's Day — stay young forever"},
            {"zh": "今天我也是小孩啦", "en": "Today I'm a kid too"},
        ],
        "情人节": [
            {"zh": "情人节快乐", "en": "Happy Valentine's Day"},
            {"zh": "甜甜的节日，甜甜的你", "en": "A sweet day for a sweet you"},
        ],
        "教师节": [
            {"zh": "教师节快乐，老师辛苦了", "en": "Happy Teachers' Day — thanks for all you do"},
        ],
        "劳动节": [
            {"zh": "劳动节，休息一下下", "en": "Labor Day — take a little rest"},
            {"zh": "劳动最光荣，休息最舒服", "en": "Work is glorious, rest is cozy"},
        ],
        "愚人节": [
            {"zh": "今天说的小心，可能是真的哦", "en": "Things said today might be true — careful!"},
            {"zh": "愚人节，可别全信", "en": "April Fools' — don't believe everything"},
        ],
        "程序员节": [
            {"zh": "1024，代码无 bug！", "en": "1024 — may your code be bug-free!"},
            {"zh": "程序员节快乐，头发浓密", "en": "Happy Programmers' Day — keep that hair thick"},
        ],
        "双十一": [
            {"zh": "双十一，钱包保重呀", "en": "Double 11 — take care of your wallet"},
        ],
        "平安夜": [
            {"zh": "平安夜，平平安安", "en": "Christmas Eve — safe and sound"},
        ],
        "圣诞节": [
            {"zh": "圣诞快乐呀", "en": "Merry Christmas!"},
            {"zh": "叮叮当，圣诞快乐", "en": "Jingle bells — Merry Christmas"},
        ],
    },
    "terms": {
        "special": {
            "冬至": [
                {"zh": "冬至到，吃饺子啦", "en": "Winter Solstice is here — time for dumplings"},
                {"zh": "冬至大如年，记得吃顿好的", "en": "Solstice rivals the New Year — eat something good"},
            ],
            "立春": [
                {"zh": "立春啦，春天要来了", "en": "Beginning of Spring — warmer days ahead"},
                {"zh": "一年之计在于春", "en": "The whole year's plan starts in spring"},
            ],
        },
        "common": [
            {"zh": "今日{name}，照顾好自己", "en": "Today is {name} — take good care of yourself"},
            {"zh": "{name}到了，天气多变多注意", "en": "{name} is here — weather shifts, take care"},
            {"zh": "今日{name}，出门看看天色吧", "en": "Today is {name} — check the sky before you head out"},
        ],
    },
}

with io.open(PATH, encoding="utf-8") as f:
    d = json.load(f)

assert d.get("version") == 6, "期望从 version 6 升级"
d["reminders"] = reminders
d["time_greetings"] = time_greetings
d["festivals"] = festivals
d["version"] = 7

s = json.dumps(d, ensure_ascii=False, indent=2)
# 把纯 {zh,en} 语录条目压回单行，保持原文件格式
s = re.sub(
    r'(?s)\{\s*"zh"\s*:\s*"((?:[^"\\]|\\.)*)"\s*,\s*"en"\s*:\s*"((?:[^"\\]|\\.)*)"\s*\}',
    r'{"zh": "\1", "en": "\2"}',
    s,
)

with io.open(PATH, "w", encoding="utf-8") as f:
    f.write(s + "\n")

# 统计
def count_objs(node):
    n = 0
    if isinstance(node, list):
        for x in node:
            n += count_objs(x)
    elif isinstance(node, dict):
        if "zh" in node and "en" in node:
            n += 1
        else:
            for v in node.values():
                n += count_objs(v)
    return n

print("OK version=%s" % d["version"])
print("reminders 条目:", count_objs(reminders))
print("time_greetings 条目:", count_objs(time_greetings))
print("festivals 条目:", count_objs(festivals))
print("festivals.by_name 节日数:", len(festivals["by_name"]))
print("linekit 仍在 pets:", "linekit" in d["pets"])
