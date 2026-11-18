import React, { useState } from 'react'
import { View, Text, Input, Button } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { login, getSession } from '../../utils/api'
import { fetchProgress } from '../../utils/api'
import { applyRemote } from '../../utils/storage'
import './index.scss'

export default function Login() {
  const session = getSession()
  const [name, setName] = useState(session ? session.name : '')
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [tip, setTip] = useState('')

  const submit = async () => {
    if (loading) return
    if (!name.trim()) {
      setTip('先填昵称')
      return
    }
    if (code.trim().length < 4) {
      setTip('口令至少 4 位')
      return
    }
    setLoading(true)
    setTip('')
    try {
      await login(name.trim(), code.trim())
      const remote = await fetchProgress()
      applyRemote(remote)
      Taro.showToast({ title: '登录成功', icon: 'success' })
      setTimeout(() => Taro.redirectTo({ url: '/pages/index/index' }), 600)
    } catch (e) {
      setTip(e.message || '登录失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <View className='login-page'>
      <View className='login-card'>
        <Text className='login-emoji'>🌳</Text>
        <Text className='login-title'>英语闯关</Text>
        <Text className='login-sub'>输入昵称和口令，进度就会存到服务器</Text>

        <View className='login-field'>
          <Text className='login-label'>昵称</Text>
          <Input
            className='login-input'
            placeholder='例如：小雨'
            value={name}
            maxlength={20}
            onInput={e => setName(e.detail.value)}
          />
        </View>

        <View className='login-field'>
          <Text className='login-label'>口令</Text>
          <Input
            className='login-input'
            placeholder='4 位以上，自己定'
            value={code}
            password
            maxlength={20}
            onInput={e => setCode(e.detail.value)}
          />
        </View>

        {tip ? <Text className='login-tip'>{tip}</Text> : null}

        <Button className='login-btn' loading={loading} onClick={submit}>
          {loading ? '登录中...' : '开始学习'}
        </Button>

        <Text className='login-note'>
          第一次用这个昵称会自动创建账号；换手机用同样的昵称+口令就能接着学。
        </Text>
      </View>
    </View>
  )
}
