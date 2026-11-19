import React, { useMemo, useState } from 'react'
import { View, Text } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { getSession, setSession } from '../../utils/api'
import { getGame, setGender } from '../../utils/game'
import { saveGender } from '../../utils/api'
import { getChapterProgress } from '../../utils/storage'
import { chapters as fallbackChapters } from '../../data/chapters'
import TabBar from '../../components/tabbar'
import './index.scss'

export default function Me() {
  const session = getSession() || {}
  const [game, setGame] = useState(getGame())

  useDidShow(() => setGame(getGame()))

  const logout = () => {
    Taro.showModal({
      title: '退出登录',
      content: '退出后需要重新输入昵称和口令，学习进度不会丢。',
      confirmText: '退出',
      confirmColor: '#6366f1'
    }).then(res => {
      if (!res.confirm) return
      setSession(null)
      Taro.reLaunch({ url: '/pages/login/index' })
    })
  }

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
      <View className='me-profile'>
        <View className='me-avatar'>
          <Text className='me-avatar-t'>🐰</Text>
        </View>
        <View className='me-info'>
          <Text className='me-name'>{session.name || '小朋友'}</Text>
          <Text className='me-id'>账号 ID：{session.uid || '未登录'}</Text>
          <Text
            className='me-id'
            onClick={() => {
              const next = game.gender === 'girl' ? 'boy' : 'girl'
              setGender(next)
              saveGender(next)
              setGame(getGame())
              setGame(getGame())
            }}
          >
            {game.gender === 'girl' ? '👧 女孩（完成一关送娃娃卡）' : '👦 男孩'}
          </Text>
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
        <View className='me-stat' onClick={() => Taro.navigateTo({ url: '/pages/wordlist/index' })}>
          <Text className='me-stat-num'>{stats.words}</Text>
          <Text className='me-stat-label'>学过单词</Text>
        </View>
      </View>

      <View className='me-links'>
        <View className='me-link' onClick={() => Taro.navigateTo({ url: '/pages/feedback/index' })}>
          <Text className='me-link-t'>💬 意见反馈</Text>
          <Text className='me-link-arrow'>›</Text>
        </View>
        <View className='me-link me-link-soon' onClick={() => Taro.showToast({ title: '卡牌收藏即将开放', icon: 'none' })}>
          <Text className='me-link-t'>🎴 卡牌收藏</Text>
          <Text className='me-link-soon-tag'>待开放</Text>
        </View>
      </View>
    
      <View className='me-logout' onClick={logout}>
        <Text className='me-logout-t'>退出登录</Text>
      </View>

      <TabBar active='me' />
</View>
  )
}
