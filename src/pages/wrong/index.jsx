import React, { useEffect, useMemo, useState } from 'react'
import { View, Text, Image } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { loadChapters, fetchProgress, getSession } from '../../utils/api'
import { chapters as fallbackChapters } from '../../data/chapters'
import { getWrongBook, removeWrong, markWrongDone, applyRemote } from '../../utils/storage'
import { speak, stopSpeak } from '../../utils/tts'
import { picOf, picAsset } from '../../data/pics'
import { backOrHome } from '../../utils/nav'
import '../words/words.scss'
import './index.scss'
import TabBar from '../../components/tabbar'

/** 错题本 —— 和学单词页一样卡片式翻阅：一次一条，单词看音标+例句，句子看词块+中文 */
let lastTouchAt = 0

const BATCH = 10

function chapterTitle(id) {
  const c = fallbackChapters.find(x => x.id === id)
  return c ? c.title : id
}

export default function Wrong() {
  const [list, setList] = useState(getWrongBook())
  const [all, setAll] = useState(fallbackChapters)
  const [idx, setIdx] = useState(0)
  const [openIdx, setOpenIdx] = useState(-1)
  const [bubbleLeft, setBubbleLeft] = useState(4)
  const [showCn, setShowCn] = useState(false)
  const [keys, setKeys] = useState([])
  const [doneLeft, setDoneLeft] = useState(null)
  const [pickIdx, setPickIdx] = useState(null)

  // 一次最多看 10 条：先给没复习过的，下次进来接着给还没看的
  const applyList = l => {
    setList(l)
    const pending = l.filter(x => !x.done)
    setKeys(pending.slice(0, BATCH).map(x => x.en || x.text))
    setIdx(0)
  }

  useEffect(() => {
    applyList(getWrongBook())
    // 登录用户以服务端为准：退出登录/清缓存后也能把错题和「已复习」状态拉回来
    if (!getSession()) return
    fetchProgress()
      .then(remote => {
        if (remote) {
          applyRemote(remote)
          applyList(getWrongBook())
        }
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    let alive = true
    loadChapters().then(res => {
      if (alive && res && res.length) setAll(res)
    })
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => () => stopSpeak(), [])

  useEffect(() => {
    setPickIdx(null)
  }, [idx])

  // 单词资料：音标、例句、词块
  const wordMap = useMemo(() => {
    const m = {}
    ;(all || []).forEach(c => {
      ;(c.words || []).forEach(w => {
        if (!w || !w.en) return
        if (!m[`${c.id}|${w.en}`]) m[`${c.id}|${w.en}`] = { chapterId: c.id, word: w, title: c.title }
        if (!m['|' + w.en]) m['|' + w.en] = { chapterId: c.id, word: w, title: c.title }
      })
    })
    return m
  }, [all])

  // 句子资料：中文与词块（填空、连词成句答错时记的是整句）
  const sentMap = useMemo(() => {
    const m = {}
    ;(all || []).forEach(c => {
      ;(c.words || []).forEach(w => {
        if (!w) return
        const put = (en, cn, chunks) => {
          if (en && !m[en]) m[en] = { cn: cn || '', chunks: chunks || [], chapterId: c.id, title: c.title }
        }
        ;(w.sentences || []).forEach(s => put(s.en, s.cn, s.chunks))
        put(w.sentence, w.sentenceCn, w.chunks)
      })
    })
    return m
  }, [all])

  // 本组 10 条，统一成卡片数据：单词 or 整句
  const items = useMemo(
    () =>
      (keys || []).map(k => {
        const x = (list || []).find(v => (v.en || v.text) === k) || {}
        const key = x.en || x.text || k
        const isSent = x.type === 'sentence' || (!!x.text && !x.en) || /\s/.test(key)
        return {
          key,
          isSent,
          zh: x.zh || x.cn || '',
          chapterId: x.chapterId || '',
          qtype: x.type || '',
          prompt: x.prompt || '',
          mine: x.mine || '',
          answer: x.answer || '',
          options: x.options || null
        }
      }),
    [keys, list]
  )
  const pendingCount = (list || []).filter(x => !x.done).length

  const cur = items[idx] || null
  const wordInfo = useMemo(() => {
    if (!cur || cur.isSent) return null
    return wordMap[(cur.chapterId || '') + '|' + cur.key] || wordMap['|' + cur.key] || null
  }, [cur, wordMap])

  const sentInfo = useMemo(() => {
    if (!cur || !cur.isSent) return null
    return sentMap[cur.key] || null
  }, [cur, sentMap])

  const w = (wordInfo && wordInfo.word) || {}
  const en = cur ? cur.key : ''

  // 单词卡片下面的例句
  const sentence = useMemo(() => {
    if (!w || (cur && cur.isSent)) return null
    const sl = (w.sentences || []).filter(x => x && x.en)
    if (sl.length) return { en: sl[0].en, cn: sl[0].cn || '', chunks: sl[0].chunks || [] }
    if (w.sentence) return { en: w.sentence, cn: w.sentenceCn || '', chunks: w.chunks || [] }
    return null
  }, [w, cur])

  // 句子卡片的词块
  const sentChunks = useMemo(() => {
    if (!cur || !cur.isSent) return []
    const info = sentInfo || {}
    if (info.chunks && info.chunks.length) return info.chunks
    return cur.key.split(/\s+/).filter(Boolean).map(x => ({ en: x, cn: '' }))
  }, [cur, sentInfo])

  const openChunk = (c, i) => {
    if (!c.cn) return
    setOpenIdx(i)
    if (process.env.TARO_ENV === 'h5' && typeof document !== 'undefined') {
      setTimeout(() => {
        const el = document.getElementById('wrk' + i)
        const row = document.getElementById('wrrow')
        if (!el || !row) return
        const a = el.getBoundingClientRect()
        const b = row.getBoundingClientRect()
        setBubbleLeft(Math.max(0, Math.min(58, ((a.left - b.left) / b.width) * 100)))
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
    if (Date.now() - lastTouchAt < 800) return
    setOpenIdx(openIdx === i ? -1 : i)
    if (openIdx !== i) openChunk(c, i)
  }

  const reset = () => {
    setOpenIdx(-1)
    setShowCn(false)
    setBubbleLeft(4)
  }

  const go = step => {
    const next = idx + step
    if (next < 0 || next >= items.length) return
    reset()
    setIdx(next)
  }

  const drop = () => {
    if (!cur) return
    removeWrong(cur.key)
    const rest = list.filter(x => (x.en || x.text) !== cur.key)
    setList(rest)
    const left = keys.filter(k => k !== cur.key)
    reset()
    if (left.length) {
      setKeys(left)
      setIdx(Math.min(idx, left.length - 1))
    } else {
      startNext(rest)
    }
    Taro.showToast({ title: '已移出错题本', icon: 'none' })
  }

  const baseLeft = rest => (rest || []).filter(x => !x.done).length

  // 取下一组待复习的；全部复习完了就不再有内容
  const startNext = rest => {
    const pending = (rest || []).filter(x => !x.done)
    setKeys(pending.slice(0, BATCH).map(x => x.en || x.text))
    setIdx(0)
    return pending.length
  }

  // 这一组看完：标记成已复习，弹个鼓励框，然后回我的页；下次点进来就是剩下的错题
  const finishBatch = () => {
    markWrongDone(keys)
    const rest = getWrongBook()
    setList(rest)
    const left = baseLeft(rest)
    setDoneLeft(left)
    reset()
  }

  const closeDone = () => {
    startNext(getWrongBook())
    setDoneLeft(null)
    if (process.env.TARO_ENV === 'h5' && typeof window !== 'undefined') {
      window.location.href = `${window.location.pathname}?t=${Date.now()}#/pages/me/index`
      return
    }
    Taro.redirectTo({ url: '/pages/me/index' })
  }

  if (!cur) {
    return (
      <View className='wd-page wr-page'>
        <View className='wd-head'>
          <View className='wr-top'>
            <View className='wd-back' onClick={() => backOrHome()}>
              <Text className='wd-back-t'>‹ 返回</Text>
            </View>
          </View>
          <Text className='wd-title'>错题本</Text>
        </View>
        <View className='wr-empty'>
          <Text className='wr-empty-icon'>🎉</Text>
          <Text className='wr-empty-t'>没有错题了</Text>
          <Text className='wr-empty-sub'>做错的单词和句子会自动收进来</Text>
        </View>
        <TabBar active='me' />
      </View>
    )
  }

  const last = idx >= items.length - 1
  const total = items.length
  const backId = cur.chapterId || (sentInfo && sentInfo.chapterId) || ''

  return (
    <View className='wd-page wr-page'>
      <View className='wd-head'>
        <View className='wr-top'>
          <View className='wd-back' onClick={() => backOrHome()}>
            <Text className='wd-back-t'>‹ 返回</Text>
          </View>

        </View>
        <Text className='wd-title'>错题本</Text>
        <View className='wd-prog'>
          <View className='wd-prog-in' style={{ width: `${((idx + 1) / total) * 100}%` }} />
        </View>
        <Text className='wd-prog-t'>
          这一组第 {idx + 1} 条 / 共 {total} 条 · 待复习 {pendingCount} 条
        </Text>
      </View>

      {cur.qtype ? (
        <View className='wd-card wr-q-card'>


          {cur.qtype === '句子填空' ? (
            <View className='wr-fill'>
              {(() => {
                const parts = String(cur.prompt || '').split('____')
                const before = parts[0] || ''
                const after = parts[1] || ''
                const full = before + (cur.answer || '') + after
                const cn = (wordInfo && wordInfo.word && wordInfo.word.sentenceCn) || ''
                return (
                  <>
                    <View className='wr-fill-sent'>
                      <View className='wr-fill-line'>
                        {before ? <Text className='wr-fill-t'>{before}</Text> : null}
                        <Text className='wr-fill-blank'>{'　　'}</Text>
                        <Text className='wr-fill-t'>{after}</Text>
                      </View>
                      {cn ? <Text className='wr-fill-cn'>{cn}</Text> : null}
                      <View className='wr-fill-play' onClick={() => speak(full, 1)}>
                        <View className='wr-fill-play-icon' />
                      </View>
                    </View>

                    <View className='wr-fill-opts'>
                      {(cur.options || []).map((o, i) => {
                        const answered = pickIdx !== null
                        const isAnswer = answered && (o.key === cur.answer || o.label === cur.answer)
                        const isMine = answered && pickIdx === i && !isAnswer
                        return (
                          <View
                            key={o.key || i}
                            className={
                              'wr-fill-card' +
                              (isAnswer ? ' wr-fill-card-right' : '') +
                              (isMine ? ' wr-fill-card-wrong' : '')
                            }
                            onClick={() => setPickIdx(i)}
                          >
                            <Text className='wr-fill-pic'>{picOf(o.key) || '🔤'}</Text>
                            <Text className='wr-fill-en'>{o.label || o.en || o.key}</Text>
                            <Text className='wr-fill-cn2'>{o.cn || ''}</Text>
                          </View>
                        )
                      })}
                    </View>
                    <View className='wr-fill-actions'>
                      <View className='wr-fill-play2' onClick={() => speak(full, 1)}>
                        <View className='wr-fill-play-icon' />
                      </View>
                      <View className='wr-fill-next' onClick={() => (last ? finishBatch() : go(1))}>
                        <Text className='wr-fill-next-t'>→</Text>
                      </View>
                    </View>
                  </>
                )
              })()}
            </View>
          ) : cur.qtype === '听力选词' ? (
            <View className='wr-q-listen'>
              <View className='wr-q-play' onClick={() => speak(cur.answer || cur.key, 1)}>
                <View className='wr-q-play-icon' />
              </View>
              <Text className='wr-q-t2'>听发音，选出你听到的单词</Text>
            </View>
          ) : (
            <Text className='wr-q-prompt'>{cur.prompt || ''}</Text>
          )}

          {cur.options && cur.options.length && cur.qtype !== '句子填空' ? (
            <View className='wr-q-opts'>
              {cur.options.map((o, i) => {
                const isAnswer = o.key === cur.answer || o.label === cur.answer
                const isMine = !!cur.mine && (o.label === cur.mine || o.key === cur.mine)
                return (
                  <View
                    key={o.key || i}
                    className={'wr-q-opt' + (isAnswer ? ' wr-q-opt-right' : '') + (isMine ? ' wr-q-opt-wrong' : '')}
                  >
                    <Text className='wr-q-opt-en'>{o.label}</Text>
                    {o.cn ? <Text className='wr-q-opt-cn'>{o.cn}</Text> : null}
                  </View>
                )
              })}
            </View>
          ) : null}

          {cur.qtype !== '句子填空' ? (
            <View className='wr-fill-actions'>
              <View className='wr-fill-next' onClick={() => (last ? finishBatch() : go(1))}>
                <Text className='wr-fill-next-t'>→</Text>
              </View>
            </View>
          ) : null}

        </View>
      ) : null}

      {!cur.qtype && cur.isSent ? (
        <View className='wd-card'>
          <View className='wr-sent-row'>
            <View className='wd-sentence-play' onClick={() => speak(cur.key, 1)} />
            <View className='wr-sent-chunks' id='wrrow'>
              {sentChunks.map((c, i) => (
                <Text
                  key={c.en + i}
                  id={'wrk' + i}
                  className={'wr-sent-chunk' + (openIdx === i && c.cn ? ' wr-sent-chunk-on' : '')}
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
          {openIdx >= 0 && sentChunks[openIdx] && sentChunks[openIdx].cn ? (
            <View className='wd-bubble' style={{ marginLeft: bubbleLeft + '%' }}>
              <Text className='wd-bubble-t'>{sentChunks[openIdx].cn}</Text>
            </View>
          ) : null}
          {cur.zh || (sentInfo && sentInfo.cn) ? (
            <View className='wd-cn-row'>
              {showCn ? <Text className='wd-sentence-cn'>{cur.zh || (sentInfo && sentInfo.cn)}</Text> : null}
              <Text className='wd-cn-toggle' onClick={() => setShowCn(!showCn)}>
                {showCn ? '收起中文' : '看整句中文'}
              </Text>
            </View>
          ) : null}

          <Text className='wr-move' onClick={drop}>
            这句我会了，移出错题本
          </Text>
        </View>
      ) : !cur.qtype ? (
        <View className='wd-card'>
          <View className='wd-pic'>
            {picAsset(en) ? (
              <Image className='wd-pic-img' src={picAsset(en)} mode='aspectFit' />
            ) : (
              <Text className='wd-pic-emoji'>{picOf(en)}</Text>
            )}
          </View>
          <View className='wd-en-row'>
            <Text className='wd-en'>{en}</Text>
            <View className='wd-speak' onClick={() => speak(en, 1)}>
              <View className='wd-speak-icon' />
            </View>
          </View>
          {w.ipa ? (
            <View className='wd-ipa-row'>
              <View className='wd-ipa-item'>
                <Text className='wd-ipa-tag'>英</Text>
                <Text className='wd-ipa'>{w.ipa}</Text>
              </View>
              {w.ipaUs ? (
                <View className='wd-ipa-item'>
                  <Text className='wd-ipa-tag wd-ipa-tag-us'>美</Text>
                  <Text className='wd-ipa'>{w.ipaUs}</Text>
                </View>
              ) : null}
            </View>
          ) : null}
          <Text className='wd-cn'>{cur.zh || w.cn}</Text>

          {sentence ? (
            <View className='wd-sentence'>
              <View className='wd-sentence-row'>
                <View className='wd-sentence-play' onClick={() => speak(sentence.en, 1)} />
                <View className='wd-chunks' id='wrrow'>
                  {(sentence.chunks && sentence.chunks.length ? sentence.chunks : [{ en: sentence.en, cn: '' }]).map((c, i) => (
                    <Text
                      key={c.en + i}
                      id={'wrk' + i}
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

          <Text className='wr-move' onClick={drop}>
            这个词我会了，移出错题本
          </Text>
        </View>
      ) : null}



      {cur && !cur.qtype ? (
        <View className='wr-fill-actions'>
          <View className='wr-fill-next' onClick={() => (last ? finishBatch() : go(1))}>
            <Text className='wr-fill-next-t'>→</Text>
          </View>
        </View>
      ) : null}

      {doneLeft !== null && (
        <View className='wd-mask'>
          <View className='wd-modal'>
            <Text className='wd-modal-emoji'>🎉</Text>
            <Text className='wd-modal-title'>哇，好棒呀！</Text>
            <Text className='wd-modal-sub'>
              {doneLeft > 0
                ? `刚才这 ${keys.length} 条错题都看过一遍，还剩 ${doneLeft} 个在等你`
                : '错题都复习完啦，真厉害！'}
            </Text>
            <View className='wd-modal-btn wd-modal-btn-main' onClick={closeDone}>
              <Text className='wd-modal-btn-t wd-modal-btn-t-main'>好的</Text>
            </View>
          </View>
        </View>
      )}

      <TabBar active='me' />
    </View>
  )
}
