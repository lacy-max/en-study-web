import React, { useMemo, useState } from 'react'
import { View, Text } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { getGame, saveGame } from '../../utils/game'
import { fetchCheckins, markCheckin } from '../../utils/api'
import TabBar from '../../components/tabbar'
import './index.scss'

function todayStr() {
  const d = new Date()
  const m = `${d.getMonth() + 1}`.padStart(2, '0')
  const day = `${d.getDate()}`.padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

export default function Checkin() {
  const [game, setGame] = useState(getGame())
  // 进页面先取服务端的打卡记录（昨天在新手机上打的也认得）
  useDidShow(() => {
    setGame(getGame())
    const localDays = getGame().days || []
    fetchCheckins().then(res => {
      if (!res || !res.days) {
        // 没网/没登录：至少用本地记录
        setGame(getGame())
        return
      }
      const serverDays = res.days || []
      const merged = Array.from(new Set(localDays.concat(serverDays)))
      saveGame({
        days: merged,
        streak: res.streak || 0,
        lastDay: res.today || getGame().lastDay
      })
      setGame(getGame())
      // 本机有、服务端没有的历史（老版本只存本地）补传上去，换设备不再丢
      const missing = localDays.filter(d => serverDays.indexOf(d) < 0)
      if (missing.length) markCheckin(missing)
    })
  })

  const today = todayStr()
  const raw = game.days || []
  // 兼容老数据：只有 lastDay 没写 days 的账号，补上 lastDay
  const days = raw.indexOf(today) >= 0
    ? raw
    : game.lastDay === today
      ? raw.concat([today])
      : raw
  const todayDone = days.indexOf(today) >= 0

  // 第一次打卡之前的日期不算「漏打」，留空更不误导
  const firstDay = days.length ? days.slice().sort()[0] : today

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
      cells.push({
          day: i,
          key,
          done: days.indexOf(key) >= 0 || (key === today && game.lastDay === today),
          isToday: key === today,
          isFuture: key > today,
          before: key < firstDay
        })
    }
    return { title: `${y} 年 ${m + 1} 月`, cells }
  }, [days, today, firstDay])

  const monthDone = month.cells.filter(c => c && c.done).length

  return (
    <View className='ck-page'>
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
              className={[
                'ck-cell',
                c && c.done && 'ck-cell-done',
                c && c.isToday && 'ck-cell-today',
                c && !c.done && !c.isFuture && !c.before && 'ck-cell-miss',
                c && c.isFuture && 'ck-cell-future'
              ].filter(Boolean).join(' ')}
              key={i}
            >
              {c ? (
                <View className='ck-cell-inner'>
                  <Text className='ck-cell-t'>{c.day}</Text>
                  <Text className={`ck-cell-badge ${c.done ? 'ck-cell-badge-on' : ''}`}>
                    {c.done ? '打卡' : c.isFuture || c.before ? '' : '未打'}
                  </Text>
                </View>
              ) : null}
            </View>
          ))}
        </View>
        <View className='ck-legend'>
          <View className='ck-legend-item'>
            <View className='ck-legend-dot ck-legend-dot-on' />
            <Text className='ck-legend-t'>已打卡</Text>
          </View>
          <View className='ck-legend-item'>
            <View className='ck-legend-dot ck-legend-dot-off' />
            <Text className='ck-legend-t'>未打卡</Text>
          </View>
        </View>
      </View>

      <Text className='ck-tip'>每天学完一节就算打卡，断一天连续天数会重新开始</Text>
      <TabBar active='checkin' />
    </View>
  )
}
