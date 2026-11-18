import React, { useEffect, useState } from 'react'
import { View, Text, Image } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { chapters as fallbackChapters } from '../../data/chapters'
import { loadChapters } from '../../utils/api'
import { getChapterProgress } from '../../utils/storage'
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

  const open = c => {
    Taro.navigateTo({ url: `/pages/practice/practice?chapterId=${c.id}&day=1` })
  }

  return (
    <View className='khome'>
      <View className='khome-head'>
        <Text className='khome-title'>🌳 今天学哪一课？</Text>
      </View>

      <View className='khome-grid'>
        {chapters.map((c, i) => {
          const done = (progressMap[c.id] || {}).maxScore > 0
          return (
            <View className='kcard' key={c.id} onClick={() => open(c)}>
              <Text className='kcard-no'>{i + 1}</Text>
              <Image className='kcard-animal' src={animalOf(c, i)} mode='aspectFit' />
              <Text className='kcard-emoji'>{(CARDS[c.id] && CARDS[c.id].emoji) || '📘'}</Text>
              <Text className='kcard-title'>{c.title.replace(/^Unit\s*\d+\s*·\s*/, '')}</Text>
              {done && <Text className='kcard-star'>⭐</Text>}
            </View>
          )
        })}
      </View>
      <Text className='khome-tip'>点卡片开始 · 第 1 天学单词，第 2 天闯关</Text>
    </View>
  )
}
