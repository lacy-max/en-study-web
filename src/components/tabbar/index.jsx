import React from 'react'
import { View, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import './index.scss'

const ITEMS = [
  { key: 'home', emoji: '🌳', label: '学习', url: '/pages/index/index' },
  { key: 'checkin', emoji: '📅', label: '打卡', url: '/pages/checkin/index' },
  { key: 'me', emoji: '🙂', label: '我的', url: '/pages/me/index' }
]

export default function TabBar({ active }) {
  const go = item => {
    if (item.key === active) return
    Taro.reLaunch({ url: item.url })
  }

  return (
    <View className='tabbar'>
      {ITEMS.map(item => (
        <View
          className={`tabbar-item ${item.key === active ? 'tabbar-item-on' : ''}`}
          key={item.key}
          onClick={() => go(item)}
        >
          <Text className='tabbar-icon'>{item.emoji}</Text>
          <Text className='tabbar-label'>{item.label}</Text>
        </View>
      ))}
    </View>
  )
}
