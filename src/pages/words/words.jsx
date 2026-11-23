import React, { useEffect, useMemo, useState } from 'react'
import { View, Text, Image } from '@tarojs/components'
import Taro, { useRouter } from '@tarojs/taro'
import { loadChapters, findChapter } from '../../utils/api'
import { chapters as fallbackChapters } from '../../data/chapters'
import { getSettings, saveChapterProgress } from '../../utils/storage'
import { speak, stopSpeak } from '../../utils/tts'
import { picOf, picAsset } from '../../data/pics'
import { backOrHome, goHome } from '../../utils/nav'
import { touchToday } from '../../utils/game'
import { markCheckin, pingStudy } from '../../utils/api'
import './words.scss'
import TabBar from '../../components/tabbar'

/** 第一关：学单词 —— 把这一课的单词先过一遍，看完才能去第二关闯关 */
let lastTouchAt = 0

export default function Words() {
  const router = useRouter()
  const chapterId = router.params.chapterId || 'unit01'
  const [list, setList] = useState(fallbackChapters)
  const [idx, setIdx] = useState(0)
  const [showDone, setShowDone] = useState(false)
  const [openIdx, setOpenIdx] = useState(-1)
  const [bubbleLeft, setBubbleLeft] = useState(4)
  const [showCn, setShowCn] = useState(false)
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

  // 手指按住才显示，松开即消失；电脑端点击仍可切换
  const openChunk = (c, i) => {
    if (!c.cn) return
    setOpenIdx(i)
    if (process.env.TARO_ENV === 'h5' && typeof document !== 'undefined') {
      setTimeout(() => {
        const el = document.getElementById('ck' + i)
        const row = document.getElementById('ckrow')
        if (!el || !row) return
        const a = el.getBoundingClientRect()
        const b = row.getBoundingClientRect()
        const pct = ((a.left - b.left) / b.width) * 100
        setBubbleLeft(Math.max(0, Math.min(58, pct)))
      }, 0)
    }
  }

  const pressChunk = (c, i) => {
    lastTouchAt = Date.now()
    openChunk(c, i)
  }

  const releaseChunk = () => {
    lastTouchAt = Date.now()
    setOpenIdx(-1)
  }

  const tapChunk = (c, i) => {
    // 手机端 touchend 已经收起，忽略随之而来的 click
    if (Date.now() - lastTouchAt < 800) return
    setOpenIdx(openIdx === i ? -1 : i)
    if (openIdx !== i) openChunk(c, i)
  }

  const chapter = useMemo(() => findChapter(list, chapterId), [chapterId, list])
  const words = useMemo(() => (chapter.words || []).filter(w => w && w.en), [chapter])
  const cur = words[idx]

  // 每个词按「词 + 当天日期」固定抽一句，同一天不换，隔天换
  const sentence = useMemo(() => {
    if (!cur) return null
    const list = (cur.sentences || []).filter(x => x && x.en)
    if (list.length) {
      const d = new Date()
      const key = `${cur.en}-${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`
      let h = 0
      for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) % 100000
      const s = list[h % list.length]
      return { en: s.en, cn: s.cn || '', chunks: s.chunks || [] }
    }
    if (cur.sentence) return { en: cur.sentence, cn: cur.sentenceCn || '', chunks: cur.chunks || [] }
    return null
  }, [cur])

  // 进入这一关就记一笔「来过」，首页据此决定要不要给星星
  useEffect(() => {
    if (!cur) return
    saveChapterProgress(chapterId, { modes: { visited: true } })
    if (settings.autoSpeak) speak(cur.en, settings.rate)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, cur && cur.en])

  useEffect(() => () => stopSpeak(), [])

  // 开始学单词就算今天打卡（同时记到服务端，换设备也认）
  useEffect(() => {
    touchToday()
    markCheckin()
    pingStudy()
  }, [])

  const go = step => {
    const next = idx + step
    if (next < 0) return
    if (next >= words.length) {
      finish()
      return
    }
    setOpenIdx(-1)
    setShowCn(false)
    setIdx(next)
  }

  const finish = () => {
    saveChapterProgress(chapterId, { modes: { study: true }, doneDays: [1] })
    stopSpeak()
    // 学完先弹自己的完成卡片（不自动跳进下一关）
    setShowDone(true)
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
        <View className='wd-back' onClick={() => backOrHome()}>
          <Text className='wd-back-t'>‹ 返回</Text>
        </View>
        <Text className='wd-title'>{chapter.title}</Text>
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
        <View className='wd-en-row'>
          <Text className='wd-en'>{cur.en}</Text>
          <View
            className='wd-speak'
            onClick={() => {
              speak(cur.en, settings.rate)
            }}
          >
            <View className='wd-speak-icon' />
          </View>
        </View>
        {cur.ipa ? (
          <View className='wd-ipa-row'>
            <View className='wd-ipa-item'>
              <Text className='wd-ipa-tag'>英</Text>
              <Text className='wd-ipa'>{cur.ipa}</Text>
            </View>
            {cur.ipaUs ? (
              <View className='wd-ipa-item'>
                <Text className='wd-ipa-tag wd-ipa-tag-us'>美</Text>
                <Text className='wd-ipa'>{cur.ipaUs}</Text>
              </View>
            ) : null}
          </View>
        ) : null}
        <Text className='wd-cn'>{cur.cn}</Text>

        {sentence ? (
          <View className='wd-sentence'>
            <View className='wd-sentence-row'>
              <View className='wd-sentence-play' onClick={() => speak(sentence.en, settings.rate)} />
              <View className='wd-chunks' id='ckrow'>
                {(sentence.chunks && sentence.chunks.length ? sentence.chunks : [{ en: sentence.en, cn: '' }]).map((c, i) => (
                  <Text
                    key={c.en + i}
                    id={'ck' + i}
                    className={'wd-chunk' + (openIdx === i && c.cn ? ' wd-chunk-on' : '') + (c.cn ? '' : ' wd-chunk-plain')}
                    onTouchStart={() => pressChunk(c, i)}
                    onTouchEnd={releaseChunk}
                    onTouchCancel={releaseChunk}
                    onClick={() => tapChunk(c, i)}
                  >
                    {c.en}
                  </Text>
                ))}
              </View>
            </View>
            {openIdx >= 0 && sentence.chunks && sentence.chunks[openIdx] ? (
              <View className='wd-bubble' style={{ marginLeft: bubbleLeft + '%' }}>
                <Text className='wd-bubble-t'>{sentence.chunks[openIdx].cn}</Text>
              </View>
            ) : null}
            {sentence.cn ? (
              <View className='wd-cn-row'>
                {showCn ? <Text className='wd-sentence-cn'>{sentence.cn}</Text> : null}
                <Text className='wd-cn-toggle' onClick={() => setShowCn(!showCn)}>
                  {showCn ? '收起中文' : '看整句中文'}
                </Text>
              </View>
            ) : null}
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

      {showDone && (
        <View className='wd-mask'>
          <View className='wd-modal'>
            <Text className='wd-modal-emoji'>🎉</Text>
            <Text className='wd-modal-title'>学完啦！</Text>
            <Text className='wd-modal-sub'>
              这一课的 {words.length} 个单词都看完了，真厉害！
            </Text>
            <View className='wd-modal-badge'>
              <Text className='wd-modal-badge-t'>⭐ +{words.length}</Text>
            </View>
            <View
              className='wd-modal-btn wd-modal-btn-main'
              onClick={() =>
                Taro.redirectTo({ url: `/pages/dictation/dictation?chapterId=${chapterId}&day=2` })
              }
            >
              <Text className='wd-modal-btn-t wd-modal-btn-t-main'>去闯关</Text>
            </View>
            <View className='wd-modal-btn' onClick={() => goHome()}>
              <Text className='wd-modal-btn-t'>回首页</Text>
            </View>
          </View>
        </View>
      )}
          <TabBar active='home' />
</View>
  )
}
