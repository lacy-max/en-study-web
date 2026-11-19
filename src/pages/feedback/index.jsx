import React, { useState } from 'react'
import { View, Text, Textarea } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { sendFeedback } from '../../utils/api'
import { backOrHome } from '../../utils/nav'
import './index.scss'
import TabBar from '../../components/tabbar'

export default function Feedback() {
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)

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
      setTimeout(() => backOrHome(), 1200)
    } catch (e) {
      Taro.showToast({ title: '网络不太好，稍后再试', icon: 'none' })
    } finally {
      setSending(false)
    }
  }

  return (
    <View className='fb-page'>
      <View className='fb-head'>
        <View className='fb-back' onClick={() => backOrHome()}>
          <Text className='fb-back-t'>‹ 返回</Text>
        </View>
      </View>

      <View className='fb-card'>
        <Textarea
          className='fb-input'
          placeholder='比如：单词页希望加慢速朗读'
          maxlength={200}
          value={text}
          onInput={e => setText(e.detail.value)}
        />
        <Text className='fb-count'>{text.length}/200</Text>
      </View>

      <View className={`fb-btn ${sending ? 'fb-btn-off' : ''}`} onClick={submit}>
        <Text className='fb-btn-t'>{sending ? '提交中…' : '提交反馈'}</Text>
      </View>

      <Text className='fb-tip'>我们会在 1–2 个工作日内看到你的反馈</Text>
          <TabBar active='me' />
</View>
  )
}
