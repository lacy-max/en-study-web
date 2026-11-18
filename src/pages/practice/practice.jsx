import React, { useState, useEffect, useMemo, useRef } from 'react'
import { View, Text, Image, Canvas, Slider, Switch, Input } from '@tarojs/components'
import Taro, { useRouter } from '@tarojs/taro'
import { chapters as fallbackChapters } from '../../data/chapters'
import { loadChapters, findChapter } from '../../utils/api'
import { speak, warmTTS } from '../../utils/tts'
import { playWrong } from '../../utils/sfx'
import { picOf } from '../../data/pics'
import {
  getSettings,
  saveSettings,
  saveChapterProgress,
  addWrong
} from '../../utils/storage'
import {
  addStars,
  unlockCard,
  addBadge,
  touchToday,
  updateBestCombo,
  getGame
} from '../../utils/game'
import { CARDS } from '../../data/cards'
import PetHi from '../../assets/mascot/hi.png'
import PetGo from '../../assets/mascot/go.png'
import PetYay from '../../assets/mascot/yay.png'
import PetParty from '../../assets/mascot/party.png'
import PetBear from '../../assets/mascot/bear.png'
import PetRabbit from '../../assets/mascot/rabbit.png'
import PetDuck from '../../assets/mascot/duck.png'

const PETS = [PetYay, PetBear, PetRabbit, PetDuck, PetHi, PetParty, PetGo]
const PRAISE = ['真棒！', '读得好听～', '记住它啦！', '再跟读一遍～', '这个音很准！']
import MascotHi from '../../assets/mascot/hi.png'
import './practice.scss'

const PAGE_SIZE = 5
// 画布尺寸（rpx），与样式保持一致
const CARD_W = 335
const CARD_H = 100
const GAP_V = 24
const COL_GAP = 32
const BOARD_W = CARD_W * 2 + COL_GAP

const correctIcons = ['🎉', '👍', '✨', '💯', '🌟']
const wrongIcons = ['💪', '📖', '📌', '🌱', '🤝']

function shuffleArr(arr) {
  const a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function rnd(n) {
  return Math.floor(Math.random() * n)
}

function pick(arr) {
  return arr[rnd(arr.length)]
}

function shuffle(arr) {
  const a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = rnd(i + 1)
    const t = a[i]
    a[i] = a[j]
    a[j] = t
  }
  return a
}

/** 生成 4 个选项（含正确答案） */
function buildOptions(correct, pool) {
  const opts = [correct]
  let guard = 0
  while (opts.length < 4 && guard < 50) {
    const cand = pick(pool)
    if (cand && opts.indexOf(cand) < 0) opts.push(cand)
    guard++
  }
  return shuffle(opts)
}

export default function Practice({ fixedMode }) {
  const router = useRouter()
  const chapterId = router.params.chapterId || 'unit01'
  const day = Number(router.params.day || 2)
  const [chaptersList, setChaptersList] = useState(fallbackChapters)
  useEffect(() => {
    let alive = true
    loadChapters().then(list => {
      if (alive && list && list.length) setChaptersList(list)
    })
    return () => {
      alive = false
    }
  }, [])
  const chapter = useMemo(() => findChapter(chaptersList, chapterId), [chapterId, chaptersList])

  const [settings, setSettings] = useState(getSettings())
  const [mode, setMode] = useState(fixedMode || 'match')
  const [score, setScore] = useState(0)
  const scoreRef = useRef(0)
  const [combo, setCombo] = useState(0)
  const [pop, setPop] = useState(null)
  const popTimer = useRef(null)
  const [burst, setBurst] = useState(null)
  const burstTimer = useRef(null)
  const comboRef = useRef(0)
  const [feedback, setFeedback] = useState(null)
  const [showResult, setShowResult] = useState(false)

  // 画布像素换算：按容器实测宽度铺满，两列等宽、居中
  const [boardW, setBoardW] = useState(0)
  useEffect(() => {
    const measure = () => {
      try {
        const q = Taro.createSelectorQuery()
        q.select('.board-wrap').boundingClientRect(r => {
          if (r && r.width) setBoardW(r.width)
        })
        q.exec()
      } catch (e) {}
    }
    const t = setTimeout(measure, 80)
    return () => clearTimeout(t)
  }, [chapterId, mode])

  const ratio = boardW > 0 ? boardW / BOARD_W : 0.45

  /** ---------- 设置 ---------- */
  const updateSettings = patch => {
    const next = { ...settings, ...patch }
    setSettings(next)
    saveSettings(next)
  }

  const autoSpeak = text => {
    if (settings.autoSpeak) speak(text, settings.rate)
  }

  const flash = ok => {
    const icon = ok ? pick(correctIcons) : pick(wrongIcons)
    setFeedback({ ok, icon })
    setTimeout(() => setFeedback(null), 900)
  }

  const addScore = ok => {
    setScore(s => {
      const n = ok ? s + 10 : s
      scoreRef.current = n
      return n
    })
    if (ok) {
      comboRef.current = comboRef.current + 1
      setCombo(c => c + 1)
    } else {
      comboRef.current = 0
      setCombo(0)
    }
  }

  /** ---------- 模式一：单词连线 ---------- */
  const totalPages = Math.max(1, Math.ceil(chapter.words.length / PAGE_SIZE))
  const [matchPage, setMatchPage] = useState(0)
  const pageWords = useMemo(
    () => chapter.words.slice(matchPage * PAGE_SIZE, matchPage * PAGE_SIZE + PAGE_SIZE),
    [chapter, matchPage]
  )
  const [cnOrder, setCnOrder] = useState([])
  const [selEn, setSelEn] = useState(-1)
  const [selCn, setSelCn] = useState(-1)
  const [matched, setMatched] = useState([])
  const [wrongFlash, setWrongFlash] = useState('')
  const [celebrate, setCelebrate] = useState('')
  const [earnedStars, setEarnedStars] = useState(0)
  const [newCard, setNewCard] = useState(null)

  useEffect(() => {
    const arr = pageWords.map((_, i) => i)
    setCnOrder(shuffle(arr))
    setMatched([])
    setSelEn(-1)
    setSelCn(-1)
    clearCanvas()
  }, [matchPage, chapterId])

  const canvasPxW = BOARD_W * ratio
  const canvasPxH = (PAGE_SIZE * CARD_H + (PAGE_SIZE - 1) * GAP_V) * ratio

  // 取 canvas 画布上下文（页面级 / 组件级都兼容）
  function ctxOf() {
    let inst
    try {
      inst = Taro.getCurrentInstance().page
    } catch (e) {}
    try {
      return Taro.createCanvasContext('lineCanvas', inst)
    } catch (e) {
      return Taro.createCanvasContext('lineCanvas')
    }
  }

  function clearCanvas() {
    if (true) return
    try {
      const ctx = ctxOf()
      ctx.clearRect(0, 0, canvasPxW, canvasPxH)
      ctx.draw()
    } catch (e) {}
  }

  const RAINBOW = ['#f472b6', '#fb923c', '#facc15', '#4ade80', '#38bdf8', '#a78bfa']

  function drawMatchedLine(enIdx, cnIdx) {
    // 已停用：不再画彩虹连线，只靠卡片高亮表示已配对
    if (true) return
    try {
      const k = ratio
      const x1 = CARD_W * k
      const x2 = (CARD_W + COL_GAP) * k
      const y1 = (enIdx * (CARD_H + GAP_V) + CARD_H / 2) * k
      const y2 = (cnIdx * (CARD_H + GAP_V) + CARD_H / 2) * k
      const ctx = ctxOf()

      // 彩虹渐变线：拆成若干小段，每段换颜色
      const SEG = 18
      for (let i = 0; i < SEG; i++) {
        const t0 = i / SEG
        const t1 = (i + 1) / SEG
        ctx.setStrokeStyle(RAINBOW[Math.floor((i / SEG) * RAINBOW.length) % RAINBOW.length])
        ctx.setLineWidth(3)
        ctx.beginPath()
        ctx.moveTo(x1 + (x2 - x1) * t0, y1 + (y2 - y1) * t0)
        ctx.lineTo(x1 + (x2 - x1) * t1, y1 + (y2 - y1) * t1)
        ctx.stroke()
      }

      // 两端小圆点
      ;[
        { x: x1, y: y1, c: '#38bdf8' },
        { x: x2, y: y2, c: '#f472b6' }
      ].forEach(d => {
        ctx.beginPath()
        ctx.arc(d.x, d.y, 5, 0, Math.PI * 2)
        ctx.setFillStyle(d.c)
        ctx.fill()
      })

      ctx.draw(true)
    } catch (e) {
      console.warn('canvas draw fail', e)
    }
  }

  const onTapEn = idx => {
    const w = pageWords[idx]
    if (matched.indexOf(w.en) >= 0) return
    setSelEn(idx)
    speak(w.en, settings.rate)
  }

  const onTapCn = cnIdx => {
    const orderIdx = cnOrder[cnIdx]
    const w = pageWords[orderIdx]
    if (matched.indexOf(w.en) >= 0) return
    if (selEn < 0) {
      setSelCn(cnIdx)
      return
    }
    const enWord = pageWords[selEn]
    if (enWord.en === w.en) {
      setMatched(m => m.concat([w.en]))
      drawMatchedLine(selEn, cnIdx)
      setBurst({
        x: (CARD_W + COL_GAP / 2) * ratio,
        y: (((selEn + cnIdx) / 2) * (CARD_H + GAP_V) + CARD_H / 2) * ratio,
        k: Date.now()
      })
      if (burstTimer.current) clearTimeout(burstTimer.current)
      burstTimer.current = setTimeout(() => setBurst(null), 800)
      addScore(true)
      setSelEn(-1)
      setSelCn(-1)
      // 整页全部连对，才给一次鼓励
      if (pageWords.every(x => x.en === w.en || matched.indexOf(x.en) >= 0)) {
        const isLast = matchPage >= totalPages - 1
        setCelebrate(isLast ? '全部完成' : '本页连对')
        setTimeout(() => {
          setCelebrate('')
          if (isLast) {
            finish()
          } else {
            setMatchPage(p => p + 1)
          }
        }, 1500)
      }
    } else {
      playWrong()
      addScore(false)
      setWrongFlash(w.en)
      addWrong({ en: w.en, cn: w.cn })
      setTimeout(() => {
        setWrongFlash('')
        setSelEn(-1)
        setSelCn(-1)
      }, 500)
    }
  }

  /** ---------- 模式二：交叉练习（英文→中文 / 中文→英文 / 例句挖空，混着来） ---------- */
  const crossQs = useMemo(() => {
    const words = chapter.words || []
    return words.map((w, i) => {
      const wantSent = i % 3 === 0
      const ans = w.answer || w.en
      const si = w.sentence ? String(w.sentence).toLowerCase().indexOf(String(ans).toLowerCase()) : -1

      if (wantSent && si >= 0) {
        const distract = shuffleArr(words.filter(x => x.en !== w.en)).slice(0, 3)
        return {
          type: 's2e',
          word: w,
          question: '',
          audio: w.sentence,
          before: w.sentence.slice(0, si),
          after: w.sentence.slice(si + ans.length),
          blankText: ans,
          answerText: w.en,
          cnHint: w.sentenceCn || '',
          options: shuffleArr([w].concat(distract)).map(o => ({ key: o.en, label: o.en }))
        }
      }

      const useCn = i % 3 === 1
      const distract = shuffleArr(words.filter(x => x.en !== w.en)).slice(0, 3)
      return {
        type: useCn ? 'w2c' : 'c2w',
        word: w,
        question: useCn ? w.en : w.cn,
        audio: w.en,
        before: '',
        after: '',
        blankText: '',
        answerText: useCn ? w.cn : w.en,
        cnHint: '',
        options: shuffleArr([w].concat(distract)).map(o => ({ key: o.en, label: useCn ? o.cn : o.en }))
      }
    })
  }, [chapter])

  const [crossIdx, setCrossIdx] = useState(0)
  const [crossWrong, setCrossWrong] = useState(0)
  const [crossAnswered, setCrossAnswered] = useState(null)
  const [crossWrongPick, setCrossWrongPick] = useState(null)
  const crossQ = crossQs[crossIdx] || null

  useEffect(() => {
    setCrossAnswered(null)
    setCrossWrong(0)
    setCrossWrongPick(null)
  }, [crossIdx, chapterId])

  const onCrossPick = opt => {
    if (!crossQ) return
    if (crossAnswered === '__right') return
    setCrossAnswered(opt.key)
    speak(crossQ.audio, settings.rate)

    if (opt.key === crossQ.word.en) {
      setCrossAnswered('__right')
      flash(true)
      addScore(true)
      if (settings.autoNext) {
        setTimeout(() => goCross(crossIdx + 1), 2000)
      }
    } else {
      setCrossWrongPick(opt.key)
      flash(false)
      playWrong()
      addScore(false)
      addWrong({ en: crossQ.word.en, cn: crossQ.word.cn })
      setCrossWrong(n => n + 1)
    }
  }

  const goCross = idx => {
    if (idx < 0) return
    if (idx >= crossQs.length) {
      finish()
      return
    }
    setCrossIdx(idx)
  }

  /** ---------- 模式三：句子填空（整句挖空 + 中文，选项为图+英文+中文卡片） ---------- */
  const fillPool = useMemo(
    () =>
      (chapter.words || []).filter(w => {
        const ans = (w.answer || w.en || '').toLowerCase()
        return w.sentence && ans && String(w.sentence).toLowerCase().indexOf(ans) >= 0
      }),
    [chapter]
  )
  const [fillIdx, setFillIdx] = useState(0)
  const [fillData, setFillData] = useState(null)
  const [fillOptions, setFillOptions] = useState([])
  const [fillAnswered, setFillAnswered] = useState('')
  const [fillWrongPick, setFillWrongPick] = useState('')

  /** ---------- 模式四：读与写（先听写，再跟读） ---------- */
  const dictWords = useMemo(
    () => (chapter.words || []).filter(w => w && w.en),
    [chapter]
  )
  const [dIdx, setDIdx] = useState(0)
  const [dStage, setDStage] = useState('write')
  const [dInput, setDInput] = useState('')
  const [dChecked, setDChecked] = useState(null)
  const dictWord = dictWords[dIdx] || { en: '', cn: '' }

  const dictSubmit = () => {
    if (!dictWord.en || dChecked === true) return
    const ok = dInput.trim().toLowerCase() === dictWord.en.trim().toLowerCase()
    setDChecked(ok)
    addScore(ok)
    flash(ok)
    if (!ok) addWrong({ en: dictWord.en, zh: dictWord.cn, chapterId })
  }

  const dictNext = () => {
    if (dStage === 'write') {
      setDStage('read')
      return
    }
    if (dIdx + 1 >= dictWords.length) {
      finish()
      return
    }
    setDIdx(i => i + 1)
    setDStage('write')
    setDInput('')
    setDChecked(null)
  }

  useEffect(() => {
    if (!fillPool.length) return
    const w = fillPool[Math.min(fillIdx, fillPool.length - 1)]
    const ans = w.answer || w.en
    const i = String(w.sentence).toLowerCase().indexOf(String(ans).toLowerCase())
    const before = w.sentence.slice(0, i)
    const after = w.sentence.slice(i + ans.length)

    const others = (chapter.words || []).filter(x => x.en !== w.en)
    const distract = shuffleArr(others).slice(0, 3)
    const opts = shuffleArr([w].concat(distract)).map(o => ({
      key: o.en,
      en: o.en,
      cn: o.cn,
      pic: picOf(o.en)
    }))

    setFillData({ word: w, before, after, answer: ans, cn: w.sentenceCn || '' })
    setFillOptions(opts)
    setFillAnswered('')
    setFillWrongPick('')
  }, [fillIdx, chapterId, fillPool])

  const onFillPick = opt => {
    if (!fillData) return
    if (fillAnswered === '__right') return
    setFillAnswered(opt.key)
    speak(fillData.word.sentence, settings.rate)

    if (opt.key === fillData.word.en) {
      setFillAnswered('__right')
      flash(true)
      addScore(true)
      if (settings.autoNext) {
        setTimeout(() => goFill(fillIdx + 1), 2000)
      }
    } else {
      setFillWrongPick(opt.key)
      flash(false)
      playWrong()
      addScore(false)
      addWrong({ text: fillData.word.sentence })
    }
  }

  const goFill = idx => {
    if (idx < 0) return
    if (idx >= fillPool.length) {
      finish()
      return
    }
    setFillIdx(idx)
  }

  /** ---------- 结算 ---------- */
  const finish = () => {
    setShowResult(true)
    saveChapterProgress(chapterId, { maxScore: scoreRef.current })

    // ---- 游戏化奖励 ----
    const stars = Math.round(scoreRef.current / 10)
    addStars(stars)
    setEarnedStars(stars)
    touchToday()
    updateBestCombo(comboRef.current)

    addBadge('first_win')
    if (scoreRef.current >= 90) addBadge('perfect')
    if (comboRef.current >= 5) addBadge('combo5')
    if ((getGame().streak || 0) >= 3) addBadge('streak3')

    const isNewCard = unlockCard(chapterId)
    setNewCard(isNewCard ? CARDS[chapterId] || null : null)
    if ((getGame().cards || []).length >= 3) addBadge('collector')
  }
  const restart = () => {
    setShowResult(false)
    setEarnedStars(0)
    setNewCard(null)
    comboRef.current = 0
    setScore(0)
    scoreRef.current = 0
    setCombo(0)
    setMatchPage(0)
    setCrossIdx(0)
    setFillIdx(0)
    setMatched([])
    clearCanvas()
  }

  const onWordTap = w => {
    const startedAt = Date.now()
    const pet = PETS[rnd(PETS.length)]
    const tip = PRAISE[rnd(PRAISE.length)]
    setPop({ src: pet, tip })

    const close = () => {
      // 最短展示 1.2 秒，读得快也不至于一闪就没
      const left = Math.max(0, 1200 - (Date.now() - startedAt))
      if (popTimer.current) clearTimeout(popTimer.current)
      popTimer.current = setTimeout(() => {
        setPop(p => (p ? { ...p, closing: true } : p))
        popTimer.current = setTimeout(() => setPop(null), 320)
      }, left)
    }

    speak(w.en, settings.rate, close)
    // 兜底：音频回调异常时最多展示 8 秒
    if (popTimer.current) clearTimeout(popTimer.current)
    popTimer.current = setTimeout(() => {
      setPop(p => (p && !p.closing ? { ...p, closing: true } : p))
      popTimer.current = setTimeout(() => setPop(null), 320)
    }, 8000)
  }

  /** ---------- 第1天：生词表 ---------- */
  // 进页面就在后台把本单元的发音全部合成好，之后点击立刻出声（避免首次 2~3 秒停顿）
  useEffect(() => {
    const words = (chapter.words || []).map(w => w.en)
    const sentences = day === 2 ? chapter.sentences || [] : []
    warmTTS(words.concat(sentences), settings.rate)
  }, [chapterId, day, settings.rate])

  if (day === 1) {
    return (
      <View className='page words'>
        <View className='w-deco'>
          {['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].map((ch, i) => (
            <Text key={ch} className={`w-letter l${i}`}>
              {ch}
            </Text>
          ))}
        </View>

        <View className='w-head'>
          <Text className='w-title'>{chapter.title}</Text>
          <Text className='w-sub'>第1天 · 先认识这 {chapter.words.length} 个生词</Text>
        </View>

        <View className='w-list'>
          {chapter.words.map((w, i) => (
            <View className='wcard' key={w.en} onClick={() => onWordTap(w)}>
              <Text className='wcard-no'>{i + 1}</Text>
              <View className='wcard-text'>
                <Text className='wcard-en'>{w.en}</Text>
                <Text className='wcard-cn'>{w.cn}</Text>
              </View>
              <View
                className={`wplay p${i % 5}`}
                onClick={e => {
                  e.stopPropagation()
                  onWordTap(w)
                }}
              >
                <Text className='wplay-i'>🔈</Text>
              </View>
            </View>
          ))}
          <View className='w-list-tail' />
        </View>

        <Image className='w-pet' src={PetHi} mode='aspectFit' />

        {pop && (
          <View className='w-pop'>
            <Image className='w-pop-img' src={pop.src} mode='aspectFit' />
            <Text className='w-pop-t'>{pop.tip}</Text>
          </View>
        )}

        <View className='w-bar'>
          <View
            className='w-btn'
            onClick={() =>
              Taro.navigateTo({
                url: `/pages/practice/practice?chapterId=${chapterId}&day=2`
              })
            }
          >
            <Text className='w-btn-t'>进入第二关 巩固闯关</Text>
          </View>
        </View>
      </View>
    )
  }

  /** ---------- 第2天：闯关 ---------- */
  const progressText =
    mode === 'match'
      ? `${matchPage + 1}/${totalPages}`
      : mode === 'cross'
      ? `${Math.min(crossIdx + 1, crossQs.length)}/${crossQs.length}`
      : mode === 'dictation'
      ? `${Math.min(dIdx + 1, dictWords.length)}/${dictWords.length}`
      : `${Math.min(fillIdx + 1, fillPool.length)}/${fillPool.length}`

  return (
    <View className='page'>
      <View className='head'>
        <Text className='head-title'>{chapter.title}</Text>
        <Text className='head-sub'>第2天 · 巩固闯关</Text>
      </View>

      {/* 状态栏 */}
      <View className='stats'>
        <View className='stat'>
          <Text className='stat-num'>{score}</Text>
          <Text className='stat-label'>得分</Text>
        </View>
        <View className='stat'>
          <Text className='stat-num orange'>{combo}</Text>
          <Text className='stat-label'>连击</Text>
        </View>
        <View className='stat'>
          <Text className='stat-num dark'>{progressText}</Text>
          <Text className='stat-label'>进度</Text>
        </View>
      </View>

      {/* 模式标题（拆成独立页面后不再切换） */}
      {!fixedMode && (
        <View className='tabs'>
          {[
            { k: 'match', t: '单词连线' },
            { k: 'cross', t: '交叉练习' },
            { k: 'fill', t: '句子填空' },
            { k: 'dictation', t: '读与写' }
          ].map(tab => (
            <View
              key={tab.k}
              className={`tab ${mode === tab.k ? 'tab-on' : ''}`}
              onClick={() => setMode(tab.k)}
            >
              <Text className={`tab-t ${mode === tab.k ? 'tab-t-on' : ''}`}>{tab.t}</Text>
            </View>
          ))}
        </View>
      )}

      {/* ===== 读与写（听写 + 跟读） ===== */}
      {mode === 'dictation' && (
        <View className='panel'>
          <View className='dict-card'>
            <Text className='dict-step'>{dStage === 'write' ? '听写 · 看中文写英文' : '跟读 · 看英文读出来'}</Text>

            {dStage === 'write' ? (
              <>
                <Text className='dict-cn'>{dictWord.cn || '—'}</Text>
                <View className='dict-tools'>
                  <View className='ghost-btn' onClick={() => speak(dictWord.en, settings.rate)}>
                    <Text className='ghost-btn-t'>🔊 听发音</Text>
                  </View>
                </View>
                <Input
                  className='dict-input'
                  value={dInput}
                  placeholder='请输入'
                  confirmType='done'
                  onInput={e => setDInput(e.detail.value)}
                  onConfirm={dictSubmit}
                />
                {dChecked === true && <Text className='dict-ok'>✓ 写对了</Text>}
                {dChecked === false && <Text className='dict-bad'>正确答案：{dictWord.en}</Text>}
                {dChecked === null && (
                  <View className='primary-btn' onClick={dictSubmit}>
                    <Text className='primary-btn-t'>检查</Text>
                  </View>
                )}
              </>
            ) : (
              <>
                <Text className='dict-en'>{dictWord.en}</Text>
                <View className='dict-tools'>
                  <View className='ghost-btn' onClick={() => speak(dictWord.en, settings.rate)}>
                    <Text className='ghost-btn-t'>🔊 播放</Text>
                  </View>
                </View>
                <Text className='dict-hint'>大声读一遍，读完点下面的按钮</Text>
              </>
            )}

            {(dChecked !== null || dStage === 'read') &&
              (dStage === 'read' ? (
                <View className='primary-btn' onClick={dictNext}>
                  <Text className='primary-btn-t'>我读完了</Text>
                </View>
              ) : (
                <View className='ghost-btn' onClick={dictNext}>
                  <Text className='ghost-btn-t'>下一个</Text>
                </View>
              ))}
          </View>
        </View>
      )}

      {/* ===== 连线 ===== */}
      {mode === 'match' && (
        <View className='panel'>
          <View className='board-wrap'>
          <View
            className='board'
            style={{
              width: `${BOARD_W * ratio}px`,
              height: `${canvasPxH}px`
            }}
          >
            <View
              className='board-inner'
              style={{
                width: `${BOARD_W * ratio}px`,
                height: `${canvasPxH}px`
              }}
            >
              {burst && (
                <View
                  key={burst.k}
                  className='burst'
                  style={{ left: `${burst.x}px`, top: `${burst.y}px` }}
                >
                  {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(i => (
                    <View key={i} className={`cf cf${i}`} />
                  ))}
                  <View className='burst-ring' />
                </View>
              )}
              <View
                className='col col-en'
                style={{ width: `${CARD_W * ratio}px` }}
              >
                {pageWords.map((w, i) => (
                  <View
                    key={w.en}
                    className={`card ${selEn === i ? 'card-en-on' : ''} ${
                      matched.indexOf(w.en) >= 0 ? 'card-matched' : ''
                    }`}
                    style={{ height: `${CARD_H * ratio}px`, marginBottom: `${GAP_V * ratio}px` }}
                    onClick={() => onTapEn(i)}
                  >
                    <Text className='card-t'>{w.en}</Text>
                  </View>
                ))}
              </View>
              <View
                className='col col-cn'
                style={{ left: `${(CARD_W + COL_GAP) * ratio}px`, width: `${CARD_W * ratio}px` }}
              >
                {cnOrder.map((origIdx, cnIdx) => {
                  const w = pageWords[origIdx]
                  return (
                    <View
                      key={`${w.en}-cn`}
                      className={`card ${
                        selCn === cnIdx || wrongFlash === w.en ? 'card-cn-on' : ''
                      } ${matched.indexOf(w.en) >= 0 ? 'card-matched' : ''}`}
                      style={{ height: `${CARD_H * ratio}px`, marginBottom: `${GAP_V * ratio}px` }}
                      onClick={() => onTapCn(cnIdx)}
                    >
                      <Text className='card-t'>{w.cn}</Text>
                    </View>
                  )
                })}
              </View>
            </View>
          </View>
          </View>

        </View>
      )}

      {/* ===== 交叉练习 ===== */}
      {mode === 'cross' && crossQ && (
        <View className='panel'>
          <View className='sentence-box'>
            {crossQ.type === 's2e' ? (
              <View className='sentence'>
                <Text className='sen-t'>{crossQ.before}</Text>
                <Text className={`blank ${crossAnswered === '__right' ? 'blank-filled' : ''}`}>
                  {crossAnswered === '__right' ? crossQ.blankText : '　　　　'}
                </Text>
                <Text className='sen-t'>{crossQ.after}</Text>
              </View>
            ) : (
              <View className='xq'>
                <Text className='xq-word'>{crossQ.question}</Text>
              </View>
            )}

            {crossWrongPick && (
              <Text className='wrong-tip'>答错了，正确答案是「{crossQ.answerText}」</Text>
            )}
            {crossWrong >= 3 && !crossWrongPick && (
              <Text className='hint'>正确答案：{crossQ.answerText}</Text>
            )}
            {crossQ.type === 's2e' && crossAnswered && (
              <Text className='cn-hint'>句意：{crossQ.cnHint}</Text>
            )}
          </View>

          <View className='options'>
            {crossQ.options.map(opt => (
              <View
                key={opt.key}
                className={`opt ${
                  crossAnswered === '__right' && opt.key === crossQ.word.en ? 'opt-right' : ''
                } ${crossWrongPick === opt.key ? 'opt-wrong' : ''} ${
                  crossWrongPick && opt.key === crossQ.word.en ? 'opt-right-soft' : ''
                }`}
                onClick={() => onCrossPick(opt)}
              >
                <Text className='opt-t'>{opt.label}</Text>
              </View>
            ))}
          </View>

          <View className='btn-row'>
            <View className='ghost-btn' onClick={() => speak(crossQ.audio, settings.rate)}>
              <Text className='ghost-btn-t'>{crossQ.type === 's2e' ? '朗读整句' : '再听一遍'}</Text>
            </View>
            {settings.autoNext && (
              <View className='ghost-btn' onClick={() => goCross(crossIdx + 1)}>
                <Text className='ghost-btn-t'>跳过</Text>
              </View>
            )}
            {!settings.autoNext && (
              <View className='nav-group'>
                <View className='nav-btn' onClick={() => goCross(crossIdx - 1)}>
                  <Text className='nav-t'>←</Text>
                </View>
                <View className='nav-btn' onClick={() => goCross(crossIdx + 1)}>
                  <Text className='nav-t'>→</Text>
                </View>
              </View>
            )}
          </View>
        </View>
      )}

      {/* ===== 句子填空 ===== */}
      {mode === 'fill' && fillData && (
        <View className='panel'>
          <View className='fq'>
            <View className='fq-sent'>
              <Text className='fq-t'>{fillData.before}</Text>
              <Text className={`fq-blank ${fillAnswered === '__right' ? 'filled' : ''}`}>
                {fillAnswered === '__right' ? fillData.answer : '\u3000\u3000\u3000\u3000'}
              </Text>
              <Text className='fq-t'>{fillData.after}</Text>
            </View>
            {!!fillData.cn && <Text className='fq-cn'>{fillData.cn}</Text>}
            <View className='fq-listen' onClick={() => speak(fillData.word.sentence, settings.rate)}>
              <Text className='fq-listen-t'>🔊 点句子听一遍</Text>
            </View>
          </View>

          {fillWrongPick && (
            <Text className='wrong-tip'>答错了，正确答案是「{fillData.answer}」</Text>
          )}

          <View className='fcards'>
            {fillOptions.map(opt => (
              <View
                key={opt.key}
                className={`fcard ${
                  fillAnswered === '__right' && opt.key === fillData.word.en ? 'fcard-right' : ''
                } ${fillWrongPick === opt.key ? 'fcard-wrong' : ''} ${
                  fillWrongPick && opt.key === fillData.word.en ? 'fcard-hint' : ''
                }`}
                onClick={() => onFillPick(opt)}
              >
                <Text className='fcard-pic'>{opt.pic}</Text>
                <Text className='fcard-en'>{opt.en}</Text>
                <Text className='fcard-cn'>{opt.cn}</Text>
              </View>
            ))}
          </View>

          <View className='btn-row'>
            {!settings.autoNext && (
              <View className='nav-group'>
                <View className='nav-btn' onClick={() => goFill(fillIdx - 1)}>
                  <Text className='nav-t'>←</Text>
                </View>
                <View className='nav-btn' onClick={() => goFill(fillIdx + 1)}>
                  <Text className='nav-t'>→</Text>
                </View>
              </View>
            )}
          </View>
        </View>
      )}

      {/* 设置区 */}
      <View className='settings'>
        <View className='set-row'>
          <Text className='set-label'>自动朗读</Text>
          <Switch
            color='#6366f1'
            checked={settings.autoSpeak}
            onChange={e => updateSettings({ autoSpeak: e.detail.value })}
          />
        </View>
        <View className='set-row'>
          <Text className='set-label'>语速 {Number(settings.rate).toFixed(2)}</Text>
          <Slider
            className='set-slider'
            min={0.6}
            max={1.2}
            step={0.05}
            value={settings.rate}
            activeColor='#6366f1'
            onChanging={e => setSettings({ ...settings, rate: e.detail.value })}
            onChange={e => updateSettings({ rate: e.detail.value })}
          />
        </View>
        <View className='set-row'>
          <Text className='set-label'>答对后自动下一题</Text>
          <Switch
            color='#6366f1'
            checked={settings.autoNext}
            onChange={e => updateSettings({ autoNext: e.detail.value })}
          />
        </View>
      </View>

      {/* 整页完成庆祝 */}
      {celebrate && (
        <View className='celebrate'>
          <View className='celebrate-card'>
            <Text className='celebrate-icon'>🎉</Text>
            <Text className='celebrate-text'>{celebrate}</Text>
          </View>
        </View>
      )}

      {/* 反馈动画 */}
      {feedback && (
        <View className='feedback'>
          <Text className='feedback-icon'>{feedback.icon}</Text>
        </View>
      )}

      {/* 结算弹窗 */}
      {showResult && (
        <View className='mask'>
          <View className='modal'>
            <Text className='modal-emoji'>🎉</Text>
            <Text className='modal-title'>本轮完成</Text>
            <Text className='modal-score'>总分 {score}</Text>
            <View className='modal-reward'>
              <Text className='modal-star'>⭐ +{earnedStars}</Text>
              {newCard && (
                <Text className='modal-card'>解锁卡牌 {newCard.emoji} {newCard.title}</Text>
              )}
            </View>
            <View className='modal-btn' onClick={restart}>
              <Text className='modal-btn-t'>再来一轮</Text>
            </View>
            <View className='modal-btn ghost' onClick={() => Taro.navigateBack()}>
              <Text className='modal-btn-t ghost-t'>返回单元列表</Text>
            </View>
          </View>
        </View>
      )}
    </View>
  )
}
