import React, { useMemo, useState } from 'react'
import { View, Text, Textarea } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { getSession, sendFeedback } from '../../utils/api'
import { getGame } from '../../utils/game'
import { getChapterProgress } from '../../utils/storage'
import { chapters as fallbackChapters } from '../../data/chapters'
import { backOrHome } from '../../utils/nav'
import './index.scss'

export default function Me() {
  const session = getSession() || {}
  const [game, setGame] = useState(getGame())
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)

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

  const submit = async () => {
    if (sending) return
    const v = text.trim()
    if (!v) {
      Taro.showToast({ title: '先写点内容吧', icon: 'none' })
      return
    }
    setSending(true)
    try {
      await sendFeedback(v)
      setText('')
      Taro.showToast({ title: '谢谢你的反馈！', icon: 'success' })
    } catch (e) {
      Taro.showToast({ title: '网络不太好，稍后再试', icon: 'none' })
    } finally {
      setSending(false)
    }
  }

  return (
    <View className='me-page'>
      <View className='me-head'>
        <View className='me-back' onClick={() => backOrHome()}>
          <Text className='me-back-t'>‹ 返回</Text>
        </View>
        <Text className='me-title'>我的</Text>
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

      <View className='me-feedback'>
        <Text className='me-feedback-title'>意见反馈</Text>
        <Text className='me-feedback-sub'>哪里不好用、想要什么功能，都可以告诉我</Text>
        <Textarea
          className='me-input'
          placeholder='比如：单词页希望加慢速朗读'
          maxlength={200}
          value={text}
          onInput={e => setText(e.detail.value)}
        />
        <Text className='me-count'>{text.length}/200</Text>
        <View className={`me-btn ${sending ? 'me-btn-off' : ''}`} onClick={submit}>
          <Text className='me-btn-t'>{sending ? '提交中…' : '提交反馈'}</Text>
        </View>
      </View>

      <View className='me-links'>
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
