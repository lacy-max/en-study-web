/**
 * 课程难度阶梯（L0–L6）
 * 前端首页分组、后台创建题库都按这个阶梯来，不要另起一套写法。
 */
export const LEVELS = [
  {
    key: 'L0',
    name: 'L0 启蒙',
    age: '3–6 岁',
    desc: '字母、问候、颜色、数字、动物、家人',
    color: '#8b5cf6'
  },
  {
    key: 'L1',
    name: 'L1 小学低段',
    age: '小学 1–3 年级',
    desc: '问候到自然 24 个话题，小学三到四年级课标词',
    color: '#6366f1'
  },
  {
    key: 'L2',
    name: 'L2 小学高段',
    age: '小学 3–6 年级',
    desc: '话题扩展、形容词、简单短语',
    color: '#0ea5e9'
  },
  {
    key: 'L3',
    name: 'L3 初中',
    age: '初中 7–9 年级',
    desc: '课标核心词与常见搭配',
    color: '#10b981'
  },
  {
    key: 'L4',
    name: 'L4 高中',
    age: '高中',
    desc: '3500 词表、抽象名词与从句',
    color: '#f59e0b'
  },
  {
    key: 'L5',
    name: 'L5 四级',
    age: '大学 · CET-4',
    desc: '4500 词、学术与社会话题',
    color: '#ef4444'
  },
  {
    key: 'L6',
    name: 'L6 六级',
    age: '大学 · CET-6',
    desc: '5500–6000 词、进阶抽象词',
    color: '#ec4899'
  }
]

export const LEVEL_KEYS = LEVELS.map(l => l.key)

/** 取某一级的信息，找不到就按 L0 处理 */
export function levelInfo(key) {
  const k = String(key || '').toUpperCase()
  return LEVELS.filter(l => l.key === k)[0] || LEVELS[0]
}

/** 章节按阶梯分组（只返回有章节的级别，顺序固定 L0→L6） */
export function groupByLevel(list) {
  const arr = Array.isArray(list) ? list : []
  return LEVELS.map(l => {
    const items = arr.filter(c => levelInfo(c.level).key === l.key)
    return { ...l, items }
  }).filter(g => g.items.length > 0)
}
