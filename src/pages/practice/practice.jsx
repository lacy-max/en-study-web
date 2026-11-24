import React, { useState, useEffect, useMemo, useRef } from 'react'
import { View, Text, Image, Canvas, Slider, Switch, Input } from '@tarojs/components'
import Taro, { useRouter } from '@tarojs/taro'
import { chapters as fallbackChapters } from '../../data/chapters'
import { loadChapters, findChapter, getPracticeStates, savePracticeState } from '../../utils/api'
import { API_BASE } from '../../utils/config'
import { recordAndRecognize, warmMic } from '../../utils/voice'
import { speak, warmTTS, stopSpeak } from '../../utils/tts'
import { backOrHome } from '../../utils/nav'
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
import { CARDS, DOLL_CARDS } from '../../data/cards'
import { awardDollCard, markCheckin, pingStudy } from '../../utils/api'

const PRAISE = ['真棒！', '读得好听～', '记住它啦！', '再跟读一遍～', '这个音很准！']
import './practice.scss'
import TabBar from '../../components/tabbar'

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

  // 从服务端恢复当前环节进度（只恢复「读与写」这一条链路，其它模式各自结算）
  useEffect(() => {
    if (!chapter || !chapter.words || !chapter.words.length || stateLoaded.current) return
    stateLoaded.current = true
    getPracticeStates(chapterId).then(res => {
      const st = res && res.states && res.states[mode]
      if (!st || st.finished) return
      const words = (chapter.words || []).filter(w => w && w.en)
      const idx = Math.min(Math.max(0, Number(st.idx) || 0), Math.max(0, words.length - 1))
      resultsRef.current = st.results || {}
      setScore(Number(st.score) || 0)
      scoreRef.current = Number(st.score) || 0
      setCombo(Number(st.combo) || 0)
      comboRef.current = Number(st.combo) || 0
      if (mode === 'dictation') {
        // 只恢复进度位置；作答状态不恢复，进页面永远是空白输入框
        setDIdx(idx)
        setDInput('')
        setDChecked(null)
        setDErr(false)
        setDVoiceMsg('')
      }
    })
  }, [chapter, chapterId, mode])

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

  // 答题结果与当前进度：存到服务端，刷新/换手机都能接着上次
  const resultsRef = useRef({})
  const stateLoaded = useRef(false)
  const persistState = (nextIdx, opts = {}) => {
    try {
      savePracticeState(chapterId, mode, {
        idx: nextIdx === undefined ? dIdx : nextIdx,
        score: scoreRef.current,
        combo: comboRef.current,
        results: resultsRef.current,
        finished: opts.finished || false
      })
    } catch (e) {}
  }

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

  // 进练习页即记一次学习活跃
  useEffect(() => {
    pingStudy()
  }, [chapterId])

  // 进页面就后台合成好本章所有音频，点喇叭/自动朗读几乎立刻出声
  useEffect(() => {
    const list = []
    ;(chapter.words || []).forEach(w => {
      if (w.en) list.push(w.en)
      if (w.sentence) list.push(w.sentence)
    })
    warmTTS(list, settings.rate)
  }, [chapterId, settings.rate])

  /** 答错反馈：震动一下（H5 支持就震，不支持就静默跳过） */
  const buzz = () => {
    try {
      if (Taro.vibrateShort) Taro.vibrateShort({ type: 'heavy' })
    } catch (e) {}
    try {
      if (navigator.vibrate) navigator.vibrate(120)
    } catch (e) {}
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
  const [newDoll, setNewDoll] = useState(null)

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
        setTimeout(() => setCelebrate(''), 1200)
        setMatchDone(true)
        setMatchDoneLast(isLast)
      }
    } else {
      playWrong()
      buzz()
      addScore(false)
      setWrongFlash(w.en)
      addWrong({
        en: w.en,
        zh: w.cn,
        chapterId,
        type: '连线配对',
        prompt: '把英文和中文连起来',
        answer: w.en,
        mine: ''
      })
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
      // 只挖「这个词本身」：句子不含该词就不出挖空题，避免答案露在句子里
      const si = w.sentence && w.en ? String(w.sentence).toLowerCase().indexOf(String(w.en).toLowerCase()) : -1

      if (wantSent && si >= 0) {
        const distract = shuffleArr(words.filter(x => x.en !== w.en)).slice(0, 3)
        return {
          type: 's2e',
          word: w,
          question: '',
          audio: w.sentence,
          before: w.sentence.slice(0, si),
          after: w.sentence.slice(si + String(w.en).length),
          blankText: w.en,
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

  /** 朗读整段后再执行回调：读不完就不切题（播放失败也有兜底超时） */
  const speakThen = (text, done) => {
    let fired = false
    let timer = null
    const once = () => {
      if (fired) return
      fired = true
      if (timer) clearTimeout(timer)
      done()
    }
    speak(text, settings.rate, once)
    timer = setTimeout(once, 6000)
  }

  const [matchDone, setMatchDone] = useState(false)
  const [matchDoneLast, setMatchDoneLast] = useState(false)
  /** ---------- 听力：听发音选单词 / 选句子 ---------- */
  const listenQs = useMemo(() => {
    const words = (chapter.words || []).filter(w => w && w.en)
    return words.map((w, i) => {
      const useSent = i % 2 === 1 && !!w.sentence && String(w.sentence).toLowerCase().indexOf(String(w.en).toLowerCase()) >= 0
      if (useSent) {
        const others = shuffleArr(words.filter(x => x.en !== w.en && x.sentence)).slice(0, 3)
        return {
          type: 'sent',
          word: w,
          text: w.sentence,
          options: shuffleArr([w].concat(others)).map(o => ({
            key: o.en,
            label: o.sentence
          }))
        }
      }
      const distract = shuffleArr(words.filter(x => x.en !== w.en)).slice(0, 3)
      return {
        type: 'word',
        word: w,
        text: w.en,
        options: shuffleArr([w].concat(distract)).map(o => ({ key: o.en, label: o.en }))
      }
    })
  }, [chapter])

  const [listenIdx, setListenIdx] = useState(0)
  const [listenAnswered, setListenAnswered] = useState('')
  const [listenWrongPick, setListenWrongPick] = useState('')
  const [listenBank, setListenBank] = useState([])
  const [listenChosen, setListenChosen] = useState([])
  const [listenChecked, setListenChecked] = useState('')
  const [listenPlaying, setListenPlaying] = useState(false)
  const listenQ = listenQs[listenIdx] || null

  const normSent = v =>
    String(v || '')
      .toLowerCase()
      .replace(/[^a-z0-9' ]/g, '')
      .replace(/\s+/g, ' ')
      .trim()

  // 换题时重排词块（句子题用词库拼句，单词题仍四选一）
  useEffect(() => {
    if (!listenQ) return
    setListenChecked('')
    setListenChosen([])
    setListenWrongPick('')
    setListenAnswered('')
    setListenPlaying(false)
    if (listenQ.type === 'sent') {
      const pool = normSent(listenQ.word.sentence).split(' ').filter(Boolean)
      const extra = (chapter.words || [])
        .filter(w => w && w.en && w.en !== listenQ.word.en)
        .slice(0, 3)
        .map(w => normSent(w.en).split(' ')[0])
        .filter(Boolean)
      const bank = shuffleArr(pool.concat(extra.slice(0, 2))).map((t, i) => ({ id: i, t }))
      setListenBank(bank)
    } else {
      setListenBank([])
    }
  }, [listenIdx, chapterId])

  const [crossIdx, setCrossIdx] = useState(0)
  const [crossWrong, setCrossWrong] = useState(0)
  const [crossAnswered, setCrossAnswered] = useState(null)
  const [crossWrongPick, setCrossWrongPick] = useState(null)
  const [crossListening, setCrossListening] = useState(false)
  const [crossVoiceMsg, setCrossVoiceMsg] = useState('')
  const crossQ = crossQs[crossIdx] || null

  useEffect(() => {
    setCrossAnswered(null)
    setCrossWrong(0)
    setCrossWrongPick(null)
  }, [crossIdx, chapterId])

  // 交叉练习：进题不自动读（避免和答完那一次叠成两次），答完只读一次
  // 想听题目就点喇叭图标

  /** 交叉练习「英→中」题：直接读英文单词，读对就过 */
  const crossVoice = async () => {
    if (!crossQ || crossListening || crossAnswered === '__right') return
    setCrossListening(true)
    setCrossVoiceMsg('')
    try {
      const r = await recordAndRecognize(crossQ.word.en, 3000)
      const heard = (r.text || '').replace(/[.,!?]/g, '').trim()
      const score = r.score || 0
      if (!heard && !r.match) {
        setCrossVoiceMsg('没听清，再读一遍')
      } else if (r.match || score >= 0.9) {
        setCrossAnswered('__right')
        flash(true)
        addScore(true)
        setCrossWrongPick(null)
      } else if (score >= 0.75) {
        setCrossVoiceMsg('有点像，我听到的是“' + heard + '”，再读一遍')
      } else {
        setCrossVoiceMsg('我听到的是“' + heard + '”，再读一遍')
      }
    } catch (e) {
      setCrossVoiceMsg((e && e.message) || '再试一次')
    }
    setCrossListening(false)
  }

  const onCrossPick = opt => {
    if (!crossQ) return
    if (crossAnswered === '__right') return
    setCrossAnswered(opt.key)
    const answerRight = opt.key === crossQ.word.en
    // 一题只读一次：答对时那一次播放结束后再切题，不再重复朗读
    const wantRead = !!settings.autoSpeak
    const wantNext = false
    if (wantRead) {
      if (wantNext) speakThen(crossQ.audio, () => goCross(crossIdx + 1))
      else speak(crossQ.audio, settings.rate)
    } else if (wantNext) {
      goCross(crossIdx + 1)
    }

    if (answerRight) {
      setCrossAnswered('__right')
      flash(true)
      addScore(true)
    } else {
      setCrossWrongPick(opt.key)
      flash(false)
      playWrong()
      buzz()
      addScore(false)
      addWrong({
        en: crossQ.word.en,
        zh: crossQ.word.cn,
        chapterId,
        type:
          crossQ.type === 's2e'
            ? '例句挖空'
            : crossQ.type === 'c2w'
            ? '看中文选英文'
            : '看英文选中文',
        prompt:
          crossQ.type === 's2e'
            ? (crossQ.before || '') + '____' + (crossQ.after || '')
            : crossQ.type === 'c2w'
            ? crossQ.word.cn
            : crossQ.word.en,
        answer:
          crossQ.type === 's2e'
            ? crossQ.answerText || crossQ.word.en
            : crossQ.type === 'c2w'
            ? crossQ.word.en
            : crossQ.word.cn,
        mine: opt.label
      })
      setCrossWrong(n => n + 1)
    }
  }

  const playListen = (text, rate) => {
    if (!text) return
    setListenPlaying(true)
    let done = false
    const stop = () => {
      if (done) return
      done = true
      setListenPlaying(false)
    }
    speak(text, rate, stop)
    setTimeout(stop, 1200 + String(text).length * 320)
  }

  const onBankTap = item => {
    if (!listenQ || listenChecked === 'ok') return
    setListenChosen(c => c.concat([item.id]))
  }

  const onChosenTap = pos => {
    if (listenChecked === 'ok') return
    setListenChosen(c => c.filter((_, i) => i !== pos))
  }

  const checkListenSent = () => {
    if (!listenQ || listenChosen.length === 0) return
    const ans = listenChosen
      .map(id => (listenBank.find(b => b.id === id) || {}).t || '')
      .join(' ')
    const ok = normSent(ans) === normSent(listenQ.word.sentence)
    setListenChecked(ok ? 'ok' : 'bad')
    if (ok) {
      setListenAnswered('__right')
      flash(true)
      addScore(true)
    } else {
      flash(false)
      playWrong()
      buzz()
      addScore(false)
      addWrong({ en: listenQ.word.en, cn: listenQ.word.cn, chapterId })
    }
  }

  const onListenPick = opt => {
    if (!listenQ || listenAnswered === '__right') return
    if (opt.key === listenQ.word.en) {
      setListenAnswered('__right')
      setListenWrongPick('')
      flash(true)
      addScore(true)
    } else {
      setListenWrongPick(opt.key)
      setListenAnswered(opt.key)
      flash(false)
      playWrong()
      buzz()
      addScore(false)
      addWrong({ en: listenQ.word.en, cn: listenQ.word.cn, chapterId })
    }
  }

  const goListen = idx => {
    if (idx < 0) return
    stopSpeak()
    if (idx >= listenQs.length) {
      finish()
      return
    }
    setListenIdx(idx)
    setListenAnswered('')
    setListenWrongPick('')
  }

  const goCross = idx => {
    if (idx < 0) return
    stopSpeak()
    if (idx >= crossQs.length) {
      finish()
      return
    }
    setCrossIdx(idx)
    setCrossListening(false)
    setCrossVoiceMsg('')
    setCrossWrongPick(null)
  }

  /** ---------- 模式三：句子填空（整句挖空 + 中文，选项为图+英文+中文卡片） ---------- */
  const fillPool = useMemo(
    () =>
      (chapter.words || []).filter(w => {
        if (!w || !w.en || !w.sentence) return false
        return String(w.sentence).toLowerCase().indexOf(String(w.en).toLowerCase()) >= 0
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
  const [dErr, setDErr] = useState(false)
  const [dInput, setDInput] = useState('')
  const [dChecked, setDChecked] = useState(null)
  const [dListening, setDListening] = useState(false)
  const [dVoiceMsg, setDVoiceMsg] = useState('')
  const dictWord = dictWords[dIdx] || { en: '', cn: '' }

  // 进听写页先把麦克风拿到手，点语音输入时立刻开录
  useEffect(() => {
    if (mode === 'dictation') warmMic()
  }, [mode])

  // 判题：忽略大小写、首尾空格以及标点
  const normalizeAnswer = v =>
    String(v || '')
      .toLowerCase()
      .replace(/[^a-z0-9' ]/g, '')
      .replace(/\s+/g, ' ')
      .trim()

  const dictCheck = value => {
    if (!dictWord.en || dChecked === true) return
    const ok = normalizeAnswer(value) === normalizeAnswer(dictWord.en)
    setDChecked(ok)
    addScore(ok)
    flash(ok)
    resultsRef.current[dictWord.en] = ok ? 'ok' : 'bad'
    persistState(dIdx)
    // 写完后读一遍正确的发音（受自动朗读开关控制）
    if (settings.autoSpeak) speak(dictWord.en, settings.rate)
    if (!ok) {
      setDErr(true)
      buzz()
      setTimeout(() => setDErr(false), 800)
      addWrong({
        en: dictWord.en,
        zh: dictWord.cn,
        chapterId,
        type: '听写',
        prompt: '看中文写单词：' + (dictWord.cn || ''),
        answer: dictWord.en,
        mine: value
      })
    }
  }

  const dictSubmit = () => dictCheck(dInput)

  /** 语音输入：和单词页同一套（录音上传 + 后端识别），识别结果直接填进输入框 */
  const toggleVoice = async () => {
    if (dListening) return
    setDVoiceMsg('')
    setDListening(true)
    try {
      const r = await recordAndRecognize(dictWord.en || '', 3000)
      const heard = (r.text || '').replace(/[.,!?]/g, '').trim()
      if (!heard) {
        setDVoiceMsg('没听清，再读一遍，或者直接打字')
      } else {
        setDInput(heard)
        setDChecked(null)
        setDVoiceMsg('')
      }
    } catch (e) {
      setDVoiceMsg((e && e.message) || '再试一次')
    }
    setDListening(false)
  }

  const dictNext = () => {
    stopSpeak()
    if (dIdx + 1 >= dictWords.length) {
      finish()
      return
    }
    const next = dIdx + 1
    setDIdx(next)
    setDStage('write')
    setDInput('')
    setDChecked(null)
    setDErr(false)
    setDVoiceMsg('')
    persistState(next)
  }

  useEffect(() => {
    if (!fillPool.length) return
    const w = fillPool[Math.min(fillIdx, fillPool.length - 1)]
    const ans = w.en
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

  // 填空题朗读规则：
  // 1) 没作答的题不读（读了等于报答案）
  // 2) 作答的题只读一次；中途把开关重新打开时，如果这题已经答过就补读一次
  const answeredIdxRef = useRef({ idx: -1, spoken: true })
  useEffect(() => {
    if (mode !== 'fill' || !fillData) return
    if (!settings.autoSpeak) return
    const a = answeredIdxRef.current
    if (a.idx !== fillIdx || a.spoken) return
    answeredIdxRef.current = { idx: fillIdx, spoken: true }
    speak(fillData.word.sentence, settings.rate)
  }, [fillIdx, fillAnswered, mode, settings.autoSpeak])

  const onFillPick = opt => {
    if (!fillData) return
    if (fillAnswered === '__right') return
    setFillAnswered(opt.key)
    const answerRight = opt.key === fillData.word.en
    const sentence = fillData.word.sentence
    const wantRead = !!settings.autoSpeak
    const wantNext = false
    // 记录这题已作答；读过就标记，没读（开关关着）留给开关打开时补读
    answeredIdxRef.current = { idx: fillIdx, spoken: wantRead }
    if (wantRead) {
      if (wantNext) speakThen(sentence, () => goFill(fillIdx + 1))
      else speak(sentence, settings.rate)
    } else if (wantNext) {
      goFill(fillIdx + 1)
    }

    if (opt.key === fillData.word.en) {
      setFillAnswered('__right')
      flash(true)
      addScore(true)
    } else {
      setFillWrongPick(opt.key)
      flash(false)
      playWrong()
      buzz()
      addScore(false)
      addWrong({
        en: fillData.word.en,
        zh: fillData.word.cn,
        chapterId,
        type: '句子填空',
        prompt: (fillData.before || '') + '____' + (fillData.after || ''),
        answer: fillData.answer,
        mine: (fillOptions.find(o => o.key === opt.key) || {}).label || opt.key,
        options: fillOptions.map(o => ({ key: o.key, label: o.en, cn: o.cn || '' }))
      })
    }
  }

  const goFill = idx => {
    if (idx < 0) return
    stopSpeak()
    if (idx >= fillPool.length) {
      finish()
      return
    }
    setFillIdx(idx)
  }

  useEffect(() => () => stopSpeak(), [])

  /** ---------- 结算 ---------- */
  const finish = () => {
    stopSpeak()
    setShowResult(true)
    try {
      savePracticeState(chapterId, mode, { idx: 0, score: scoreRef.current, combo: 0, results: {}, finished: true })
    } catch (e) {}
    saveChapterProgress(chapterId, {
      maxScore: scoreRef.current,
      doneDays: [2],
      modes: { [mode]: true }
    })

    // ---- 游戏化奖励 ----
    const stars = Math.round(scoreRef.current / 10)
    addStars(stars)
    setEarnedStars(stars)
    touchToday()
    markCheckin()
    updateBestCombo(comboRef.current)

    addBadge('first_win')
    if (scoreRef.current >= 90) addBadge('perfect')
    if (comboRef.current >= 5) addBadge('combo5')
    if ((getGame().streak || 0) >= 3) addBadge('streak3')

    const isNewCard = unlockCard(chapterId)
    setNewCard(isNewCard ? CARDS[chapterId] || null : null)

    // 女孩专属：完成一关由服务端随机发一张娃娃卡（同一章只发一次）
    setNewDoll(null)
    if ((getGame().gender || '') === 'girl') {
      awardDollCard(chapterId).then(resp => {
        if (!resp || !resp.cardId) return
        const card = DOLL_CARDS.filter(c => c.id === resp.cardId)[0]
        if (!card) return
        unlockCard(card.id)
        if (resp.isNew) setNewDoll(card)
      })
    }
    if ((getGame().cards || []).length >= 3) addBadge('collector')
  }
  const restart = () => {
    answeredIdxRef.current = { idx: -1, spoken: true }
    setShowResult(false)
    setEarnedStars(0)
    setNewCard(null)
    setNewDoll(null)
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
    const tip = PRAISE[rnd(PRAISE.length)]
    setPop({ tip })

    const close = () => {
      // 最短展示 1.2 秒，读得快也不至于一闪就没
      const left = Math.max(0, 1200 - (Date.now() - startedAt))
      if (popTimer.current) clearTimeout(popTimer.current)
      popTimer.current = setTimeout(() => {
        setPop(p => (p ? { ...p, closing: true } : p))
        popTimer.current = setTimeout(() => setPop(null), 320)
      }, left)
    }

    if (settings.autoSpeak) speak(w.en, settings.rate, close)
    else close()
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

        {pop && (
          <View className='w-pop'>
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
      : mode === 'listen'
      ? `${Math.min(listenIdx + 1, listenQs.length)}/${listenQs.length}`
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
            { k: 'listen', t: '听力' },
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
            <Text className='dict-step'>听写 · 看中文写英文</Text>

            {dStage === 'write' ? (
              <>
                <Text className='dict-cn'>{dictWord.cn || '—'}</Text>
                <View className='dict-tools'>
                  <View
                    className='speak-btn speak-btn-sm'
                    onClick={() => speak(dictWord.en, settings.rate)}
                  />
                  <View
                    className={dListening ? 'dict-mic dict-mic-on' : 'dict-mic'}
                    onClick={toggleVoice}
                  >
                    {dListening ? (
                      <View className='dict-mic-dots'>
                        <View className='dict-mic-dot dict-mic-dot-1' />
                        <View className='dict-mic-dot dict-mic-dot-2' />
                        <View className='dict-mic-dot dict-mic-dot-3' />
                      </View>
                    ) : (
                      <View className='dict-mic-icon' />
                    )}
                  </View>
                </View>
                {dVoiceMsg ? <Text className='voice-msg'>{dVoiceMsg}</Text> : null}
                <View className={dErr ? 'dict-input-wrap shake' : 'dict-input-wrap'}>
                  <Input
                    className='dict-input'
                    value={dInput}
                    placeholder='请输入'
                    confirmType='done'
                    onInput={e => {
                    setDInput(e.detail.value)
                    if (dChecked === false) setDChecked(null)
                  }}
                    onConfirm={dictSubmit}
                  />
                  {dChecked === false && <Text className='dict-err'>❗</Text>}
                </View>
                {dChecked === true && <Text className='dict-ok'>✓ 写对了</Text>}
                {dChecked === false && <Text className='dict-bad'>正确答案：{dictWord.en}</Text>}

                {/* 答错保持「检查」，可以继续改；答对才变「下一个」 */}
                <View className='primary-btn' onClick={dChecked === true ? dictNext : dictSubmit}>
                  <Text className='primary-btn-t'>{dChecked === true ? '下一个' : '检查'}</Text>
                </View>
              </>
            ) : null}


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

          {matchDone && (
            <View
              className='match-next-btn'
              onClick={() => {
                setMatchDone(false)
                setCelebrate('')
                if (matchDoneLast) finish()
                else setMatchPage(p => p + 1)
              }}
            >
              <Text className='match-next-t'>{matchDoneLast ? '完成' : '下一页'}</Text>
            </View>
          )}
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
                <Text className={'xq-word' + (crossAnswered === '__right' ? ' xq-word-on' : '')}>
                  {crossQ.question}
                </Text>
              </View>
            )}

            {crossWrongPick && (
              <Text className='wrong-tip'>答错了，正确答案是「{crossQ.answerText}」</Text>
            )}
            {crossWrong >= 3 && !crossWrongPick && (
              <Text className='hint'>正确答案：{crossQ.answerText}</Text>
            )}
            {crossQ.type === 's2e' && !!crossQ.cnHint && (
              <Text className='cn-hint'>句意：{crossQ.cnHint}</Text>
            )}
            {crossQ.type === 'w2e' && (
              <Text className='cn-hint'>选对应的英文单词</Text>
            )}
          </View>

          {crossQ.type === 'w2c' ? (
            <View className='xq-voice'>
              <View
                className={crossListening ? 'xq-mic xq-mic-on' : 'xq-mic'}
                onClick={crossVoice}
              >
                {crossListening ? (
                  <View className='dict-mic-dots'>
                    <View className='dict-mic-dot dict-mic-dot-1' />
                    <View className='dict-mic-dot dict-mic-dot-2' />
                    <View className='dict-mic-dot dict-mic-dot-3' />
                  </View>
                ) : (
                  <View className='dict-mic-icon' />
                )}
              </View>
              {crossVoiceMsg ? <Text className='voice-msg'>{crossVoiceMsg}</Text> : null}
            </View>
          ) : (
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

          )}

          <View className='btn-row'>
            <View className='speak-btn' onClick={() => speak(crossQ.audio, settings.rate)} />
            <View
              className={'next-btn' + (crossAnswered === '__right' ? '' : ' next-btn-off')}
              onClick={() => {
                if (crossAnswered !== '__right') {
                  Taro.showToast({ title: '先答对这一题', icon: 'none' })
                  return
                }
                goCross(crossIdx + 1)
              }}
            >
              <Text className='next-btn-t'>→</Text>
            </View>
          </View>
        </View>
      )}

      {/* ===== 听力选择 ===== */}
      {mode === 'listen' && listenQ && (
        <View className='panel'>
          {listenQ.type === 'sent' ? (
            <>
              <Text className='ls-q'>你听到了什么？</Text>
              <View className='ls-bar'>
                <View
                  className={'ls-bar-play' + (listenPlaying ? ' ls-bar-play-on' : '')}
                  onClick={() => playListen(listenQ.text, settings.rate)}
                >
                  <View className='ls-bar-icon' />
                </View>
                <View className={'ls-wave' + (listenPlaying ? ' ls-wave-on' : '')}>
                  {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(i => (
                    <View key={i} className={'ls-wave-bar ls-wave-' + i} />
                  ))}
                </View>
                <Text className='ls-slow' onClick={() => playListen(listenQ.text, 0.55)}>
                  慢速
                </Text>
              </View>

              <View className='ls-lines'>
                {[0, 1].map(row => (
                  <View key={row} className='ls-line'>
                    {listenChosen
                      .filter((_, i) => Math.floor(i / 5) === row)
                      .map((id, i) => {
                        const pos = row * 5 + i
                        const item = listenBank.find(b => b.id === id)
                        return (
                          <View key={pos} className='ls-token' onClick={() => onChosenTap(pos)}>
                            <Text className='ls-token-t'>{item ? item.t : ''}</Text>
                          </View>
                        )
                      })}
                  </View>
                ))}
              </View>

              <View className='ls-bank'>
                {listenBank
                  .filter(b => listenChosen.indexOf(b.id) < 0)
                  .map(b => (
                    <View key={b.id} className='ls-chip' onClick={() => onBankTap(b)}>
                      <Text className='ls-chip-t'>{b.t}</Text>
                    </View>
                  ))}
              </View>

              {listenChecked === 'ok' ? (
                <Text className='ls-cn'>{listenQ.word.sentenceCn || ''}</Text>
              ) : null}
              {listenChecked === 'bad' ? (
                <Text className='wrong-tip'>正确答案：{listenQ.word.sentence}</Text>
              ) : null}

              <View className='ls-actions'>
                <View className='ls-actions-sp' />
                <View
                  className={'ls-check' + (listenChosen.length ? '' : ' ls-check-off')}
                  onClick={() => {
                    if (!listenChosen.length) return
                    if (listenChecked === 'ok') {
                      goListen(listenIdx + 1)
                      return
                    }
                    checkListenSent()
                  }}
                >
                  <Text className='ls-check-t'>
                    {listenChecked === 'ok' ? '下一个' : '检查'}
                  </Text>
                </View>
              </View>
            </>
          ) : (
            <>
              <View className='ls-card'>
                <View className='ls-play' onClick={() => speak(listenQ.text, settings.rate)}>
                  <View className='ls-play-icon' />
                </View>
              </View>

              <View className='ls-options'>
                {listenQ.options.map(opt => (
                  <View
                    key={opt.key}
                    className={`ls-opt ${
                      listenAnswered === '__right' && opt.key === listenQ.word.en
                        ? 'ls-opt-right'
                        : ''
                    } ${listenWrongPick === opt.key ? 'ls-opt-wrong' : ''} ${
                      listenWrongPick && opt.key === listenQ.word.en ? 'ls-opt-hint' : ''
                    }`}
                    onClick={() => onListenPick(opt)}
                  >
                    <Text className='ls-opt-t'>{opt.label}</Text>
                  </View>
                ))}
              </View>

              {listenWrongPick ? (
                <Text className='wrong-tip'>正确答案：{listenQ.word.en}</Text>
              ) : null}
              {listenAnswered === '__right' ? (
                <Text className='ls-cn'>{listenQ.word.cn || ''}</Text>
              ) : null}

              <View className='btn-row listen-btn-row'>
                <View className='speak-btn' onClick={() => speak(listenQ.text, settings.rate)} />
                <View
                  className={'next-btn' + (listenAnswered === '__right' ? '' : ' next-btn-off')}
                  onClick={() => {
                    if (listenAnswered !== '__right') {
                      Taro.showToast({ title: '先答对这一题', icon: 'none' })
                      return
                    }
                    goListen(listenIdx + 1)
                  }}
                >
                  <Text className='next-btn-t'>→</Text>
                </View>
              </View>
            </>
          )}
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
            <View
              className='fq-listen'
              onClick={() => speak(fillData.word.sentence, settings.rate)}
            >
              <View className='fq-listen-icon' />
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
            <View
              className='speak-btn'
              onClick={() => speak(fillData.word.sentence, settings.rate)}
            />
            <View
              className={'next-btn' + (fillAnswered === '__right' ? '' : ' next-btn-off')}
              onClick={() => {
                if (fillAnswered !== '__right') {
                  Taro.showToast({ title: '先答对这一题', icon: 'none' })
                  return
                }
                goFill(fillIdx + 1)
              }}
            >
              <Text className='next-btn-t'>→</Text>
            </View>
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
              {newDoll && (
                <Text className='modal-card'>娃娃卡 +1 {newDoll.emoji} {newDoll.title}</Text>
              )}
            </View>
            <View className='modal-btn' onClick={restart}>
              <Text className='modal-btn-t'>再来一轮</Text>
            </View>
            <View className='modal-btn ghost' onClick={() => backOrHome()}>
              <Text className='modal-btn-t ghost-t'>返回单元列表</Text>
            </View>
          </View>
        </View>
      )}
          <TabBar active='home' />
      <TabBar active='home' />
</View>
  )
}
