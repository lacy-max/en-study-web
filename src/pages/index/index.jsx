import React, { useEffect, useState } from 'react'
import { View, Text, Image } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { chapters as fallbackChapters } from '../../data/chapters'
import { loadChapters } from '../../utils/api'
import { getChapterProgress, applyRemote, saveChapterProgress } from '../../utils/storage'
import { getSession, fetchProgress } from '../../utils/api'
import { CARDS } from '../../data/cards'
import { topicIcon } from '../../data/pics'
import './index.scss'

import AnimalCat from '../../assets/mascot/hi.png'
import AnimalBear from '../../assets/mascot/bear.png'
import AnimalRabbit from '../../assets/mascot/rabbit.png'
import AnimalDuck from '../../assets/mascot/duck.png'

const ANIMALS = {
  cat: AnimalCat,
  bear: AnimalBear,
  rabbit: AnimalRabbit,
  duck: AnimalDuck
}
const ANIMAL_ORDER = ['cat', 'bear', 'rabbit', 'duck']

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

  const animalOf = (c, i) => {
    const card = CARDS[c.id]
    const key = (card && card.animal) || ANIMAL_ORDER[i % ANIMAL_ORDER.length]
    return ANIMALS[key] || ANIMALS.cat
  }

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

  return (
    <View className='khome'>
      <View className='khome-head'>
        <Text className='khome-title'>🌳 今天学哪一课？</Text>
      </View>

      <View className='khome-grid'>
        {chapters.map((c, i) => {
          const done = chapterDone(c.id)
          const isCurrent = i === currentIdx
          const unlocked = isUnlocked(i)
          return (
            <View
              className={`kcard ${unlocked ? '' : 'kcard-locked'} ${done ? 'kcard-done' : ''}`}
              key={c.id}
              onClick={() => (unlocked ? open(c) : openLocked())}
            >
              <Text className='kcard-no'>{i < 9 ? `0${i + 1}` : i + 1}</Text>
              <Image className='kcard-animal' src={animalOf(c, i)} mode='aspectFit' />
              <Text className='kcard-emoji'>{topicIcon(c.title)}</Text>
              <Text className='kcard-title'>
                {c.title.replace(/^Unit\s*\d+\s*·\s*/, '')}
              </Text>
              {visited(c.id) && isCurrent && <Text className='kcard-star'>⭐</Text>}
              {done && <Text className='kcard-check'>✓</Text>}
              {!done && (doneCount(c.id) > 0 || visited(c.id)) && (
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
      <Text className='khome-tip'>点卡片开始 · 第 1 天学单词，第 2 天闯关</Text>
    </View>
  )
}
