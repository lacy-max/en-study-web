import React, { useMemo, useState } from 'react'
import { View, Text } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { getGame } from '../../utils/game'
import { backOrHome } from '../../utils/nav'
import './index.scss'

function todayStr() {
  const d = new Date()
  const m = `${d.getMonth() + 1}`.padStart(2, '0')
  const day = `${d.getDate()}`.padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

export default function Checkin() {
  const [game, setGame] = useState(getGame())
  useDidShow(() => setGame(getGame()))

  const today = todayStr()
  const days = game.days || []
  const todayDone = days.indexOf(today) >= 0 || game.lastDay === today

  const month = useMemo(() => {
    const d = new Date()
    const y = d.getFullYear()
    const m = d.getMonth()
    const first = new Date(y, m, 1)
    const startWeek = first.getDay() // 0=周日
    const total = new Date(y, m + 1, 0).getDate()
    const cells = []
    for (let i = 0; i < startWeek; i++) cells.push(null)
    for (let i = 1; i <= total; i++) {
      const mm = `${m + 1}`.padStart(2, '0')
      const dd = `${i}`.padStart(2, '0')
      const key = `${y}-${mm}-${dd}`
      cells.push({ day: i, key, done: days.indexOf(key) >= 0, isToday: key === today })
    }
    return { title: `${y} 年 ${m + 1} 月`, cells }
  }, [days, today])

  const monthDone = month.cells.filter(c => c && c.done).length

  return (
    <View className='ck-page'>
      <View className='ck-head'>
        <View className='ck-back' onClick={() => backOrHome()}>
          <Text className='ck-back-t'>‹ 返回</Text>
        </View>
      </View>

      <View className={`ck-hero ${todayDone ? 'ck-hero-done' : ''}`}>
        <Text className='ck-hero-emoji'>{todayDone ? '🌟' : '🌱'}</Text>
        <Text className='ck-hero-title'>{todayDone ? '今天已经打卡啦' : '今天还没打卡'}</Text>
        <Text className='ck-hero-sub'>
          {todayDone ? '明天 6:00 会有新的一课，记得回来～' : '学完一节单词就算打卡成功'}
        </Text>
      </View>

      <View className='ck-stats'>
        <View className='ck-stat'>
          <Text className='ck-stat-num'>{game.streak || 0}</Text>
          <Text className='ck-stat-label'>连续天数</Text>
        </View>
        <View className='ck-stat'>
          <Text className='ck-stat-num'>{days.length}</Text>
          <Text className='ck-stat-label'>累计打卡</Text>
        </View>
        <View className='ck-stat'>
          <Text className='ck-stat-num'>{monthDone}</Text>
          <Text className='ck-stat-label'>本月打卡</Text>
        </View>
      </View>

      <View className='ck-cal'>
        <Text className='ck-cal-title'>{month.title}</Text>
        <View className='ck-week'>
          {['日', '一', '二', '三', '四', '五', '六'].map(w => (
            <Text className='ck-week-t' key={w}>
              {w}
            </Text>
          ))}
        </View>
        <View className='ck-grid'>
          {month.cells.map((c, i) => (
            <View
              className={`ck-cell ${c && c.done ? 'ck-cell-done' : ''} ${c && c.isToday ? 'ck-cell-today' : ''}`}
              key={i}
            >
              {c ? (
                <Text className='ck-cell-t'>{c.day}</Text>
              ) : null}
            </View>
          ))}
        </View>
      </View>

      <Text className='ck-tip'>每天学完一节就算打卡，断一天连续天数会重新开始</Text>
    </View>
  )
}
