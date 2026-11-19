import React, { useMemo, useState } from 'react'
import { View, Text, ScrollView } from '@tarojs/components'
import { useDidShow } from '@tarojs/taro'
import { chapters } from '../../data/chapters'
import { picOf, picAsset } from '../../data/pics'
import { getChapterProgress } from '../../utils/storage'
import { speak, stopSpeak } from '../../utils/tts'
import { backOrHome } from '../../utils/nav'
import { Image } from '@tarojs/components'
import './index.scss'
import TabBar from '../../components/tabbar'

// 释义收成词，不要长句/括号解释
function shortCn(cn) {
  return String(cn || '')
    .replace(/[（(][^）)]*[）)]/g, '')
    .split(/[；;，,。]/)[0]
    .trim()
}

export default function WordList() {
  const [tick, setTick] = useState(0)
  useDidShow(() => setTick(t => t + 1))

  const groups = useMemo(() => {
    const list = []
    chapters.forEach(c => {
      const p = getChapterProgress(c.id)
      if (!p || !p.modes || !p.modes.study) return
      const words = (c.words || []).map(w => ({
        en: w.en,
        cn: shortCn(w.cn),
        chapterId: c.id,
        chapterTitle: c.title.replace(/^Unit\s*\d+\s*·\s*/, '')
      }))
      if (words.length) list.push({ id: c.id, title: c.title.replace(/^Unit\s*\d+\s*·\s*/, ''), level: c.level, words })
    })
    return list
  }, [tick])

  const total = groups.reduce((n, g) => n + g.words.length, 0)

  return (
    <View className='wl-page'>
      <View className='wl-head'>
        <View className='wl-back' onClick={() => { stopSpeak(); backOrHome() }}>
          <Text className='wl-back-t'>‹ 返回</Text>
        </View>
        <View className='wl-title-row'>
          <Text className='wl-count'>共 {total} 个单词</Text>
        </View>
      </View>

      {total === 0 && (
        <View className='wl-empty'>
          <Text className='wl-empty-emoji'>🌱</Text>
          <Text className='wl-empty-t'>还没有学过单词</Text>
          <Text className='wl-empty-s'>先从第一关「学单词」开始吧</Text>
        </View>
      )}

      <ScrollView scrollY className='wl-scroll'>
        {groups.map(g => (
          <View className='wl-group' key={g.id}>
            <View className='wl-group-head'>
              <Text className='wl-group-title'>{g.title}</Text>
              <Text className='wl-group-num'>{g.words.length} 个</Text>
            </View>
            {g.words.map(w => (
              <View className='wl-item' key={`${g.id}-${w.en}`} onClick={() => speak(w.en)}>
                <View className='wl-pic'>
                  {picAsset(w.en)
                    ? <Image className='wl-pic-img' src={picAsset(w.en)} mode='aspectFit' />
                    : <Text className='wl-pic-emoji'>{picOf(w.en)}</Text>}
                </View>
                <View className='wl-word-info'>
                  <Text className='wl-en'>{w.en}</Text>
                  <Text className='wl-cn'>{w.cn}</Text>
                </View>
                <Text className='wl-speak'>🔊</Text>
              </View>
            ))}
          </View>
        ))}
        <View className='wl-bottom' />
      </ScrollView>
          <TabBar active='me' />
</View>
  )
}
