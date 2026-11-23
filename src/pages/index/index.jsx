import React, { useEffect, useState, useRef } from 'react'
import { View, Text } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import TabBar from '../../components/tabbar'
import { chapters as fallbackChapters } from '../../data/chapters'
import { loadChapters } from '../../utils/api'
import { getChapterProgress, applyRemote, saveChapterProgress } from '../../utils/storage'
import { getSession, fetchProgress } from '../../utils/api'
import { topicIcon } from '../../data/pics'
import { groupByLevel } from '../../data/levels'
import DailyHint from '../../components/daily-hint'
import './index.scss'

export default function Index() {
  const [chapters, setChapters] = useState(fallbackChapters)
  const [progressMap, setProgressMap] = useState({})

  useEffect(() => {
    let alive = true
    loadChapters().then(list => {
      if (alive && list && list.length) setChapters(list)
    })
    return () => {
      alive = false
    }
  }, [])

  // 启动：没登录就去登录页；已登录则先从服务端拉进度
  useEffect(() => {
    const boot = async () => {
      const session = getSession()
      if (!session) {
        Taro.navigateTo({ url: '/pages/login/index' })
        return
      }
      const remote = await fetchProgress()
      if (remote) {
        applyRemote(remote)
        refresh()
      }
    }
    boot()
  }, [])

  const refresh = () => {
    const map = {}
    chapters.forEach(c => {
      map[c.id] = getChapterProgress(c.id) || {}
    })
    setProgressMap(map)
  }

  useEffect(refresh, [chapters])
  useDidShow(refresh)

  // 是否学过：有得分记录即视为学过
  const MODES = ['study', 'dictation', 'match', 'fill', 'cross']
  const doneCount = id => {
    const modes = (progressMap[id] || {}).modes || {}
    return MODES.filter(m => modes[m]).length
  }
  // 完成判定：4 个环节都做过，或者这一课已经拿到 80 分以上
  const chapterDone = id =>
    doneCount(id) >= MODES.length || ((progressMap[id] || {}).maxScore || 0) >= 80

  const studied = id => {
    const p = progressMap[id] || {}
    return (p.maxScore || 0) > 0
  }

  // 上一课完成度：4 个环节做了 3 个、或有 80 分 → 视为达到 80%，下一课亮起来
  const reached80 = id => {
    const p = progressMap[id] || {}
    return doneCount(id) >= 4 || (p.maxScore || 0) >= 80
  }

  // 解锁规则：第 1 课永远可点；其余必须上一课真的到 80%（不允许"进过就解锁"）
  const isUnlocked = i => i === 0 || reached80(chapters[i - 1].id)

  // 当前章节：最近在学的那一章（进度条和星星都跟着它走）
  const lastAt = id => (progressMap[id] || {}).lastStudyAt || 0
  const unfinished = chapters.filter(c => !chapterDone(c.id))
  const currentIdx = (() => {
    if (!unfinished.length) return -1
    let best = unfinished[0]
    unfinished.forEach(c => {
      if (lastAt(c.id) > lastAt(best.id)) best = c
    })
    return chapters.findIndex(c => c.id === best.id)
  })()

  // 星星只给「用户真的进去看过」的章节
  const visited = id => !!(progressMap[id] || {}).modes && !!(progressMap[id] || {}).modes.visited

  const open = c => {
    saveChapterProgress(c.id, { modes: { visited: true } })
    Taro.navigateTo({ url: `/pages/exercise/index?chapterId=${c.id}` })
  }

  const openLocked = () => {
    Taro.showToast({ title: '先学完上一课哦', icon: 'none', duration: 1500 })
  }

  const groups = groupByLevel(chapters)
  // 首页按阶梯分页：一页只看一个梯队，L0 第 1 页、L1 第 2 页…
  const [page, setPage] = useState(0)
  const pageCount = groups.length
  const cur = Math.min(page, Math.max(pageCount - 1, 0))
  const group = groups[cur] || { items: [], color: '#8b5cf6', name: '', age: '' }
  const go = d => {
    const n = cur + d
    if (n < 0 || n > pageCount - 1) return
    setPage(n)
    Taro.pageScrollTo({ scrollTop: 0, duration: 200 })
  }
  // 左右滑动翻页
  const touch = useRef(0)
  const onTouchStart = e => {
    touch.current = e.touches && e.touches[0] ? e.touches[0].clientX : 0
  }
  const onTouchEnd = e => {
    const x = e.changedTouches && e.changedTouches[0] ? e.changedTouches[0].clientX : 0
    const dx = x - touch.current
    if (Math.abs(dx) > 60) go(dx < 0 ? 1 : -1)
  }

  return (
    <View className='khome'>
      <View className='khome-head'>
        <Text className='khome-title'>🌳 今天学哪一课？</Text>
      </View>

      <View className='klevel' key={group.key} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        <View className='klevel-head'>
          <View className='klevel-dot' style={{ background: group.color }} />
          <Text className='klevel-name'>{group.name}</Text>
          <Text className='klevel-age'>{group.age}</Text>
          <View className='klevel-pager'>
            <Text
              className={`kp-btn ${cur === 0 ? 'kp-off' : ''}`}
              onClick={() => go(-1)}
            >
              ‹
            </Text>
            <Text className='kp-num'>{cur + 1}/{pageCount}</Text>
            <Text
              className={`kp-btn ${cur === pageCount - 1 ? 'kp-off' : ''}`}
              onClick={() => go(1)}
            >
              ›
            </Text>
          </View>
        </View>
        <Text className='klevel-desc'>{group.desc} · 共 {group.items.length} 章</Text>

        <View className='khome-grid'>
          {group.items.map((c, j) => {
            const i = chapters.findIndex(x => x.id === c.id)
            const done = chapterDone(c.id)
            const isCurrent = i === currentIdx
            const unlocked = isUnlocked(i)
            return (
              <View
                className={`kcard ${unlocked ? '' : 'kcard-locked'} ${done ? 'kcard-done' : ''}`}
                key={c.id}
                onClick={() => (unlocked ? open(c) : openLocked())}
              >
                <Text className='kcard-no'>{j < 9 ? `0${j + 1}` : j + 1}</Text>
                <Text className='kcard-emoji'>{topicIcon(c.title)}</Text>
                <Text className='kcard-title'>
                  {c.title.replace(/^Unit\s*\d+\s*·\s*/, '')}
                </Text>
                {visited(c.id) && isCurrent && <Text className='kcard-star'>⭐</Text>}
                {done && <Text className='kcard-check'>✓</Text>}
                {unlocked && !done && (doneCount(c.id) > 0 || visited(c.id)) && (
                  <>
                    <View className='kcard-prog'>
                      <View
                        className='kcard-prog-in'
                        style={{ width: `${(doneCount(c.id) / MODES.length) * 100}%` }}
                      />
                    </View>
                    <Text className='kcard-prog-t'>
                      本关进度 {doneCount(c.id)}/{MODES.length}
                    </Text>
                  </>
                )}
              </View>
            )
          })}
        </View>

        <View className='klevel-foot'>
          <Text className={`kf-btn ${cur === 0 ? 'kf-off' : ''}`} onClick={() => go(-1)}>
            上一阶段
          </Text>
          <View className='kf-dots'>
            {groups.map((g, k) => (
              <View
                key={g.key}
                className={`kf-dot ${k === cur ? 'kf-dot-on' : ''}`}
                onClick={() => setPage(k)}
              />
            ))}
          </View>
          <Text
            className={`kf-btn ${cur === pageCount - 1 ? 'kf-off' : ''}`}
            onClick={() => go(1)}
          >
            下一阶段
          </Text>
        </View>
      </View>
      <Text className='khome-tip'>点卡片开始 · 第 1 天学单词，第 2 天闯关</Text>
      <DailyHint />
    
      <TabBar active='home' />
</View>
  )
}
