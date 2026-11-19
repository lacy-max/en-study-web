import React, { useEffect, useState } from 'react'
import { View, Text, Image } from '@tarojs/components'
import Rabbit from '../../assets/mascot/rabbit.png'
import './index.scss'

const TIPS = [
  '我们每天 6:00 会更新一节新课，跟着国内教材大纲从易到难走～',
  '每天一小节，15 个单词，学完就能闯关啦！',
  '先学单词，再练听写、连线、填空，一步一步来～'
]

/** 左下角小动物提示：一直挂在页面底部，像有人在跟你说话 */
export default function DailyHint() {
  const [i, setI] = useState(0)
  const [show, setShow] = useState(true)

  useEffect(() => {
    const t = setInterval(() => setI(n => (n + 1) % TIPS.length), 8000)
    return () => clearInterval(t)
  }, [])

  if (!show) return null

  return (
    <View className='dh-wrap'>
      <Image className='dh-avatar' src={Rabbit} mode='aspectFit' />
      <View className='dh-bubble'>
        <Text className='dh-text'>{TIPS[i]}</Text>
        <View className='dh-close' onClick={() => setShow(false)}>
          <Text className='dh-close-t'>×</Text>
        </View>
      </View>
    </View>
  )
}
