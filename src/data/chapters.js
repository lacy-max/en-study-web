/**
 * 章节数据 —— 从零起步（L0 启蒙，3 岁）
 *
 * 课程按「从零开始、逐级加深」重排：
 *   L0 启蒙 → L1 小学低段 → L2 小学高段 → L3 初中 → L4 高中 → L5 四级 → L6 六级
 *
 * 结构（前端写死，不要改字段名）：
 *   id        章节唯一标识，连续编号
 *   level     难度级别 L0–L6
 *   title     标题
 *   words     en / cn / sentence / answer / sentenceCn
 *   sentences 句子填空用，L0–L2 留空
 */

export const chapters = [
  {
    id: 'unit01',
    level: 'L0',
    title: 'Unit 01 · 打招呼',
    subtitle: 'L0 启蒙 · 15 个词 · 3 岁起',
    words: [
      { en: 'hi', cn: '嗨（打招呼）', sentence: 'Hi, I am Tom.', answer: 'hi', sentenceCn: '嗨，我是汤姆。' },
      { en: 'hello', cn: '你好', sentence: 'Hello, mum.', answer: 'hello', sentenceCn: '你好，妈妈。' },
      { en: 'bye', cn: '再见', sentence: 'Bye, dad.', answer: 'bye', sentenceCn: '再见，爸爸。' },
      { en: 'yes', cn: '是的', sentence: 'Yes, I can.', answer: 'yes', sentenceCn: '是的，我可以。' },
      { en: 'no', cn: '不；不是', sentence: 'No, not now.', answer: 'no', sentenceCn: '不，现在不行。' },
      { en: 'please', cn: '请', sentence: 'Mum, please help.', answer: 'please', sentenceCn: '妈妈，请帮忙。' },
      { en: 'thanks', cn: '谢谢', sentence: 'Thanks, dad.', answer: 'thanks', sentenceCn: '谢谢，爸爸。' },
      { en: 'sorry', cn: '对不起', sentence: 'Sorry, my bad.', answer: 'sorry', sentenceCn: '对不起，是我的错。' },
      { en: 'good', cn: '好的', sentence: 'Good, let us go.', answer: 'good', sentenceCn: '好的，我们走吧。' },
      { en: 'morning', cn: '早上', sentence: 'Good morning, baby.', answer: 'morning', sentenceCn: '早上好，宝贝。' },
      { en: 'night', cn: '晚上', sentence: 'Good night, mum.', answer: 'night', sentenceCn: '晚安，妈妈。' },
      { en: 'name', cn: '名字', sentence: 'My name is Lily.', answer: 'name', sentenceCn: '我的名字是莉莉。' },
      { en: 'baby', cn: '宝宝', sentence: 'The baby is happy.', answer: 'baby', sentenceCn: '宝宝很开心。' },
      { en: 'ok', cn: '可以；好', sentence: 'Ok, let us play.', answer: 'ok', sentenceCn: '好，我们玩吧。' },
      { en: 'wow', cn: '哇（惊叹）', sentence: 'Wow, a big ball.', answer: 'wow', sentenceCn: '哇，一个大球。' }
    ],
    sentences: []
  },
  {
    id: 'unit02',
    level: 'L0',
    title: 'Unit 02 · 颜色',
    subtitle: 'L0 启蒙 · 15 个词 · 3 岁起',
    words: [
      { en: 'red', cn: '红色', sentence: 'I like red.', answer: 'red', sentenceCn: '我喜欢红色。' },
      { en: 'blue', cn: '蓝色', sentence: 'The sky is blue.', answer: 'blue', sentenceCn: '天空是蓝色的。' },
      { en: 'green', cn: '绿色', sentence: 'The grass is green.', answer: 'green', sentenceCn: '草是绿色的。' },
      { en: 'yellow', cn: '黄色', sentence: 'A yellow duck.', answer: 'yellow', sentenceCn: '一只黄色的小鸭。' },
      { en: 'black', cn: '黑色', sentence: 'My cat is black.', answer: 'black', sentenceCn: '我的猫是黑色的。' },
      { en: 'white', cn: '白色', sentence: 'A white ball.', answer: 'white', sentenceCn: '一个白色的球。' },
      { en: 'pink', cn: '粉色', sentence: 'Her bag is pink.', answer: 'pink', sentenceCn: '她的包是粉色的。' },
      { en: 'orange', cn: '橙色；橙子', sentence: 'I want an orange.', answer: 'orange', sentenceCn: '我想要一个橙子。' },
      { en: 'brown', cn: '棕色', sentence: 'The bear is brown.', answer: 'brown', sentenceCn: '这只熊是棕色的。' },
      { en: 'purple', cn: '紫色', sentence: 'A purple flower.', answer: 'purple', sentenceCn: '一朵紫色的花。' },
      { en: 'color', cn: '颜色', sentence: 'What color is it?', answer: 'color', sentenceCn: '它是什么颜色的？' },
      { en: 'light', cn: '浅色的；灯', sentence: 'I like light blue.', answer: 'light', sentenceCn: '我喜欢浅蓝色。' },
      { en: 'dark', cn: '深色的；暗的', sentence: 'It is dark now.', answer: 'dark', sentenceCn: '现在天黑了。' },
      { en: 'flower', cn: '花', sentence: 'The flower is red.', answer: 'flower', sentenceCn: '这朵花是红色的。' },
      { en: 'ball', cn: '球', sentence: 'My ball is green.', answer: 'ball', sentenceCn: '我的球是绿色的。' }
    ],
    sentences: []
  },
  {
    id: 'unit03',
    level: 'L0',
    title: 'Unit 03 · 数字',
    subtitle: 'L0 启蒙 · 15 个词 · 3 岁起',
    words: [
      { en: 'one', cn: '一', sentence: 'One little cat.', answer: 'one', sentenceCn: '一只小猫。' },
      { en: 'two', cn: '二', sentence: 'Two red apples.', answer: 'two', sentenceCn: '两个红苹果。' },
      { en: 'three', cn: '三', sentence: 'I see three dogs.', answer: 'three', sentenceCn: '我看见三只狗。' },
      { en: 'four', cn: '四', sentence: 'Four blue cars.', answer: 'four', sentenceCn: '四辆蓝色的车。' },
      { en: 'five', cn: '五', sentence: 'Five green frogs.', answer: 'five', sentenceCn: '五只绿色的青蛙。' },
      { en: 'six', cn: '六', sentence: 'Six white eggs.', answer: 'six', sentenceCn: '六个白色的蛋。' },
      { en: 'seven', cn: '七', sentence: 'Seven small ducks.', answer: 'seven', sentenceCn: '七只小鸭子。' },
      { en: 'eight', cn: '八', sentence: 'Eight yellow stars.', answer: 'eight', sentenceCn: '八颗黄色的星星。' },
      { en: 'nine', cn: '九', sentence: 'Nine pink flowers.', answer: 'nine', sentenceCn: '九朵粉色的花。' },
      { en: 'ten', cn: '十', sentence: 'Ten little toes.', answer: 'ten', sentenceCn: '十个小脚趾。' },
      { en: 'number', cn: '数字', sentence: 'This number is big.', answer: 'number', sentenceCn: '这个数字很大。' },
      { en: 'count', cn: '数数', sentence: 'Let us count.', answer: 'count', sentenceCn: '我们来数一数。' },
      { en: 'how', cn: '多少；怎样', sentence: 'How many cats?', answer: 'how', sentenceCn: '有多少只猫？' },
      { en: 'many', cn: '许多', sentence: 'So many toys.', answer: 'many', sentenceCn: '好多玩具。' },
      { en: 'age', cn: '年龄；几岁', sentence: 'What is his age?', answer: 'age', sentenceCn: '他几岁了？' }
    ],
    sentences: []
  }
]
