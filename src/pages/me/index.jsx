import React, { useMemo, useState } from 'react'
import { View, Text } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { getSession } from '../../utils/api'
import { getGame } from '../../utils/game'
import { getChapterProgress } from '../../utils/storage'
import { chapters as fallbackChapters } from '../../data/chapters'
import { backOrHome } from '../../utils/nav'
import './index.scss'

export default function Me() {
  const session = getSession() || {}
  const [game, setGame] = useState(getGame())

  useDidShow(() => setGame(getGame()))

  const stats = useMemo(() => {
    let doneChapters = 0
    let words = 0
    fallbackChapters.forEach(c => {
      const p = getChapterProgress(c.id)
      const modes = p.modes || {}
      const steps = ['study', 'dictation', 'match', 'fill', 'cross'].filter(k => modes[k]).length
      if (steps >= 5) doneChapters += 1
      words += modes.study ? (c.words || []).length : 0
    })
    return { doneChapters, words }
  }, [game])

  return (
    <View className='me-page'>
      <View className='me-head'>
        <View className='me-back' onClick={() => backOrHome()}>
          <Text className='me-back-t'>‹ 返回</Text>
        </View>
      </View>

      <View className='me-profile'>
        <View className='me-avatar'>
          <Text className='me-avatar-t'>🐰</Text>
        </View>
        <View className='me-info'>
          <Text className='me-name'>{session.name || '小朋友'}</Text>
          <Text className='me-id'>账号 ID：{session.uid || '未登录'}</Text>
        </View>
      </View>

      <View className='me-stats'>
        <View className='me-stat'>
          <Text className='me-stat-num'>{game.stars || 0}</Text>
          <Text className='me-stat-label'>星星</Text>
        </View>
        <View className='me-stat'>
          <Text className='me-stat-num'>{game.streak || 0}</Text>
          <Text className='me-stat-label'>连续打卡</Text>
        </View>
        <View className='me-stat'>
          <Text className='me-stat-num'>{stats.doneChapters}</Text>
          <Text className='me-stat-label'>学完章节</Text>
        </View>
        <View className='me-stat'>
          <Text className='me-stat-num'>{stats.words}</Text>
          <Text className='me-stat-label'>学过单词</Text>
        </View>
      </View>

      <View className='me-links'>
        <View className='me-link' onClick={() => Taro.navigateTo({ url: '/pages/feedback/index' })}>
          <Text className='me-link-t'>💬 意见反馈</Text>
          <Text className='me-link-arrow'>›</Text>
        </View>
        <View className='me-link' onClick={() => Taro.navigateTo({ url: '/pages/checkin/index' })}>
          <Text className='me-link-t'>📅 我的打卡</Text>
          <Text className='me-link-arrow'>›</Text>
        </View>
        <View className='me-link' onClick={() => Taro.navigateTo({ url: '/pages/collection/collection' })}>
          <Text className='me-link-t'>🎴 卡牌收藏</Text>
          <Text className='me-link-arrow'>›</Text>
        </View>
      </View>
    </View>
  )
}
