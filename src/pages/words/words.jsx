import React, { useEffect, useMemo, useState } from 'react'
import { View, Text, Image } from '@tarojs/components'
import Taro, { useRouter } from '@tarojs/taro'
import { loadChapters, findChapter } from '../../utils/api'
import { chapters as fallbackChapters } from '../../data/chapters'
import { getSettings, saveChapterProgress } from '../../utils/storage'
import { speak, stopSpeak } from '../../utils/tts'
import { picOf, picAsset } from '../../data/pics'
import './words.scss'

/** 第一关：学单词 —— 把这一课的单词先过一遍，看完才能去第二关闯关 */
export default function Words() {
  const router = useRouter()
  const chapterId = router.params.chapterId || 'unit01'
  const [list, setList] = useState(fallbackChapters)
  const [idx, setIdx] = useState(0)
  const [settings] = useState(getSettings())

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
  const words = useMemo(() => (chapter.words || []).filter(w => w && w.en), [chapter])
  const cur = words[idx]

  // 进入这一关就记一笔「来过」，首页据此决定要不要给星星
  useEffect(() => {
    if (!cur) return
    saveChapterProgress(chapterId, { modes: { visited: true } })
    if (settings.autoSpeak) speak(cur.en, settings.rate)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, cur && cur.en])

  useEffect(() => () => stopSpeak(), [])

  const go = step => {
    const next = idx + step
    if (next < 0) return
    if (next >= words.length) {
      finish()
      return
    }
    setIdx(next)
  }

  const finish = () => {
    saveChapterProgress(chapterId, { modes: { study: true }, doneDays: [1] })
    stopSpeak()
    // 学完先给个鼓励，不自动跳进下一关
    Taro.showModal({
      title: '太棒了！🎉',
      content: `这一课的 ${words.length} 个单词你都看完了，真厉害！\n休息一下，准备好就去闯关吧。`,
      confirmText: '去闯关',
      cancelText: '回首页',
      success: res => {
        if (res.confirm) {
          Taro.redirectTo({ url: `/pages/dictation/dictation?chapterId=${chapterId}&day=2` })
        } else {
          Taro.navigateBack()
        }
      }
    })
  }

  if (!cur) {
    return (
      <View className='wd-page'>
        <Text className='wd-empty'>这一课还没有单词</Text>
      </View>
    )
  }

  const last = idx >= words.length - 1

  return (
    <View className='wd-page'>
      <View className='wd-head'>
        <Text className='wd-title'>{chapter.title}</Text>
        <Text className='wd-sub'>第1天 · 学单词 · 看一遍再去闯关</Text>
        <View className='wd-prog'>
          <View className='wd-prog-in' style={{ width: `${((idx + 1) / words.length) * 100}%` }} />
        </View>
        <Text className='wd-prog-t'>
          {idx + 1}/{words.length}
        </Text>
      </View>

      <View className='wd-card'>
        <View className='wd-pic'>
          {picAsset(cur.en) ? (
            <Image className='wd-pic-img' src={picAsset(cur.en)} mode='aspectFit' />
          ) : (
            <Text className='wd-pic-emoji'>{picOf(cur.en)}</Text>
          )}
        </View>
        <Text className='wd-en'>{cur.en}</Text>
        <Text className='wd-cn'>{cur.cn}</Text>

        <View className='wd-tools'>
          <View className='wd-play' onClick={() => speak(cur.en, settings.rate)}>
            <Text className='wd-play-t'>🔊 听发音</Text>
          </View>
        </View>

        {cur.sentence ? (
          <View className='wd-sentence'>
            <View className='wd-sentence-row'>
              <View className='wd-sentence-play' onClick={() => speak(cur.sentence, settings.rate)}>
                <Text className='wd-sentence-play-t'>🔊</Text>
              </View>
              <Text className='wd-sentence-en'>{cur.sentence}</Text>
            </View>
            {cur.sentenceCn ? <Text className='wd-sentence-cn'>{cur.sentenceCn}</Text> : null}
          </View>
        ) : null}
      </View>

      <View className='wd-btns'>
        <View className={idx === 0 ? 'wd-btn wd-btn-ghost wd-btn-off' : 'wd-btn wd-btn-ghost'} onClick={() => go(-1)}>
          <Text className='wd-btn-t'>上一个</Text>
        </View>
        {last ? (
          <View className='wd-btn wd-btn-main' onClick={finish}>
            <Text className='wd-btn-t wd-btn-t-main'>学完了</Text>
          </View>
        ) : (
          <View className='wd-btn wd-btn-main' onClick={() => go(1)}>
            <Text className='wd-btn-t wd-btn-t-main'>下一个</Text>
          </View>
        )}
      </View>

      <Text className='wd-tip'>看完这一课的单词，第二关的练习才会打开哦</Text>
    </View>
  )
}
