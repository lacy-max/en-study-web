import React, { useState } from 'react'
import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { saveGender, getSession } from '../../utils/api'
import { setGender } from '../../utils/game'
import './index.scss'

/** 首次登录才出现的第二步：卡片式选男孩/女孩，选完写服务端，之后不再问 */
export default function GenderPick() {
  const [pick, setPick] = useState('')
  const [saving, setSaving] = useState(false)

  const start = async () => {
    if (saving) return
    if (!pick) {
      Taro.showToast({ title: '先选一个', icon: 'none' })
      return
    }
    setSaving(true)
    setGender(pick)
    await saveGender(pick)
    Taro.showToast({ title: '开始学习吧', icon: 'success' })
    setTimeout(() => Taro.redirectTo({ url: '/pages/index/index' }), 500)
  }

  return (
    <View className='gp-page'>
      <Text className='gp-hello'>欢迎来学英语！</Text>
      <Text className='gp-sub'>先选一下，决定你完成关卡后拿到的奖励卡牌</Text>

      <View className='gp-label'>
        <Text className='gp-label-t'>你是</Text>
      </View>

      <View className='gp-cards'>
        <View
          className={`gp-card ${pick === 'boy' ? 'gp-card-on' : ''}`}
          onClick={() => setPick('boy')}
        >
          <Text className='gp-emoji'>👦</Text>
          <Text className='gp-name'>男孩</Text>
          <Text className='gp-desc'>通关拿小汽车卡牌</Text>
        </View>

        <View
          className={`gp-card gp-card-girl ${pick === 'girl' ? 'gp-card-on' : ''}`}
          onClick={() => setPick('girl')}
        >
          <Text className='gp-emoji'>👧</Text>
          <Text className='gp-name'>女孩</Text>
          <Text className='gp-desc'>通关拿娃娃卡牌</Text>
        </View>
      </View>

      <Text className='gp-note'>选一次就够了，下次登录不会再问</Text>

      <View className={`gp-btn ${pick ? '' : 'gp-btn-off'}`} onClick={start}>
        <Text className='gp-btn-t'>{saving ? '保存中…' : '开始学习'}</Text>
      </View>

      {getSession() ? null : (
        <Text className='gp-tip'>还没登录？先回登录页</Text>
      )}
    </View>
  )
}
