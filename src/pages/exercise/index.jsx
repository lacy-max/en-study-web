import React, { useEffect, useMemo, useState } from 'react'
import { View, Text } from '@tarojs/components'
import Taro, { useRouter } from '@tarojs/taro'
import { loadChapters, findChapter } from '../../utils/api'
import { chapters as fallbackChapters } from '../../data/chapters'
import './index.scss'

export default function Exercise() {
  const router = useRouter()
  const chapterId = router.params.chapterId || 'unit01'
  const [list, setList] = useState(fallbackChapters)

  useEffect(() => {
    let alive = true
    loadChapters().then(res => {
      if (alive && res && res.length) setList(res)
    })
    return () => {
      alive = false
    }
  }, [])

  const chapter = useMemo(() => findChapter(list, chapterId), [chapterId, list])

  const items = useMemo(
    () => [
      {
        key: 'dictation',
        icon: '✍️',
        title: '读与写',
        desc: '看中文写英文，写完再跟读一遍',
        count: `${(chapter.words || []).length} 个单词`
      },
      {
        key: 'match',
        icon: '🔗',
        title: '单词连线',
        desc: '英文和中文两两配对',
        count: `${(chapter.words || []).length} 对`
      },
      {
        key: 'fill',
        icon: '🧩',
        title: '句子填空',
        desc: '整句挖空，选出正确的词',
        count: `${(chapter.sentences || []).length} 句`
      },
      {
        key: 'cross',
        icon: '🔀',
        title: '交叉练习',
        desc: '英译中、中译英、例句挖空混着来',
        count: '混合出题'
      }
    ],
    [chapter]
  )

  const open = key => {
    Taro.navigateTo({ url: `/pages/${key}/${key}?chapterId=${chapterId}&day=2` })
  }

  return (
    <View className='ex-page'>
      <View className='ex-head'>
        <Text className='ex-title'>{chapter.title}</Text>
        <Text className='ex-sub'>第2天 · 巩固闯关 · 选一种开始</Text>
      </View>

      <View className='ex-list'>
        {items.map(it => (
          <View className='ex-item' key={it.key} onClick={() => open(it.key)}>
            <View className='ex-icon'>
              <Text className='ex-icon-t'>{it.icon}</Text>
            </View>
            <View className='ex-main'>
              <Text className='ex-name'>{it.title}</Text>
              <Text className='ex-desc'>{it.desc}</Text>
            </View>
            <View className='ex-right'>
              <Text className='ex-count'>{it.count}</Text>
              <Text className='ex-arrow'>›</Text>
            </View>
          </View>
        ))}
      </View>

      <View className='ex-foot'>
        <View className='ex-back' onClick={() => Taro.navigateBack()}>
          <Text className='ex-back-t'>返回首页</Text>
        </View>
      </View>
    </View>
  )
}
