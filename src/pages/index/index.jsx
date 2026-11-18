import React, { useEffect, useState } from 'react'
import { View, Text, Image } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { chapters as fallbackChapters } from '../../data/chapters'
import { loadChapters } from '../../utils/api'
import { getChapterProgress, applyRemote } from '../../utils/storage'
import { getSession, fetchProgress } from '../../utils/api'
import { CARDS } from '../../data/cards'
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
  const studied = id => {
    const p = progressMap[id] || {}
    return (p.maxScore || 0) > 0
  }

  // 解锁规则：第 1 课永远可点；第 N 课需要上一课学过
  const isUnlocked = i => i === 0 || studied(chapters[i - 1].id)

  // 当前正在学的章节：第一个还没学完的章节
  const currentIdx = chapters.findIndex(c => !studied(c.id))

  const open = c => {
    Taro.navigateTo({ url: `/pages/practice/practice?chapterId=${c.id}&day=1` })
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
          const done = studied(c.id)
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
              <Text className='kcard-emoji'>{(CARDS[c.id] && CARDS[c.id].emoji) || '📘'}</Text>
              <Text className='kcard-title'>
                {c.title.replace(/^Unit\s*\d+\s*·\s*/, '')}
              </Text>
              {isCurrent && <Text className='kcard-star'>⭐</Text>}
              {done && <Text className='kcard-check'>✓</Text>}

            </View>
          )
        })}
      </View>
      <Text className='khome-tip'>点卡片开始 · 第 1 天学单词，第 2 天闯关</Text>
    </View>
  )
}
