import React, { useEffect, useMemo, useState } from 'react'
import { View, Text } from '@tarojs/components'
import Taro, { useRouter, useDidShow } from '@tarojs/taro'
import { loadChapters, findChapter, fetchProgress } from '../../utils/api'
import { getChapterProgress, applyRemote, saveChapterProgress } from '../../utils/storage'
import { chapters as fallbackChapters } from '../../data/chapters'
import { goHome } from '../../utils/nav'
import './index.scss'
import TabBar from '../../components/tabbar'

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
  const [modesDone, setModesDone] = useState({})

  const syncDone = () => {
    setModesDone((getChapterProgress(chapterId) || {}).modes || {})
  }

  // 每次回到这个页面都重新读一遍进度：从练习页 navigateBack 回来时状态才会立刻更新
  useDidShow(() => {
    syncDone()
    fetchProgress()
      .then(remote => {
        if (remote) {
          applyRemote(remote)
          syncDone()
        }
      })
      .catch(() => {})
  })

  // 进入这一关就记「来过」（首页据此给星星），并先从服务端同步进度
  useEffect(() => {
    saveChapterProgress(chapterId, { modes: { visited: true } })
    syncDone()
    let alive = true
    fetchProgress()
      .then(remote => {
        if (alive && remote) {
          applyRemote(remote)
          syncDone()
        }
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [chapterId])

  const STEPS = ['study', 'dictation', 'match', 'fill', 'cross']
  const doneAll = STEPS.filter(k => modesDone[k]).length
  const studyDone = !!modesDone.study

  const items = useMemo(
    () => [
      {
        key: 'dictation',
        icon: '✍️',
        title: '读与写',
        desc: '看中文写出英文，做对自动进入下一个',
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
        count: `${(chapter.words || []).filter(w => w && w.en && w.sentence).length} 句`
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

  const openWords = () => {
    Taro.navigateTo({ url: `/pages/words/words?chapterId=${chapterId}` })
  }

  const open = key => {
    // 第一关还没看单词，直接把人带到第一关（不弹提示）
    if (!studyDone) {
      openWords()
      return
    }
    Taro.navigateTo({ url: `/pages/${key}/${key}?chapterId=${chapterId}&day=2` })
  }

  return (
    <View className='ex-page'>
      <View className='ex-head'>
        <Text className='ex-title'>{chapter.title}</Text>
        <Text className='ex-sub'>第1天先学单词，第2天来闯关</Text>
        <View className='ex-prog'>
          <View
            className='ex-prog-in'
            style={{ width: `${(doneAll / STEPS.length) * 100}%` }}
          />
        </View>
        <Text className='ex-prog-t'>
          本关已完成 {doneAll}/{STEPS.length} 步（学单词 + 4 个练习）
        </Text>
      </View>

      <View className='ex-list'>
        <View className='ex-item ex-item-day1' onClick={() => openWords()}>
          <View className='ex-icon'>
            <Text className='ex-icon-t'>📖</Text>
          </View>
          <View className='ex-main'>
            <Text className='ex-name'>第一关 · 学单词</Text>
            <Text className='ex-desc'>先把这一课的单词看一遍，再去闯关</Text>
          </View>
          <View className='ex-right'>
            {studyDone ? (
              <Text className='ex-done'>已完成 ✓</Text>
            ) : (
              <Text className='ex-count'>{(chapter.words || []).length} 个单词</Text>
            )}
            <Text className='ex-arrow'>›</Text>
          </View>
        </View>
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
              {modesDone[it.key] ? (
                <Text className='ex-done'>已完成 ✓</Text>
              ) : (
                <Text className='ex-count'>{it.count}</Text>
              )}
              <Text className='ex-arrow'>›</Text>
            </View>
          </View>
        ))}
      </View>

          <TabBar active='home' />
</View>
  )
}
