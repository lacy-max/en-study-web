/** 单词跟读：优先用浏览器原生 Web Speech API 识别，浏览器不支持时回退到后端 /api/asr */
import { API_BASE } from './config'

/** 录音约束：开着浏览器自带的降噪/回声消除/自动增益，手机外放环境也能录清楚 */
const AUDIO = {
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
  channelCount: 1
}

/** 归一化：小写、只留字母数字和空格 */
function norm(v) {
  const raw = String(v || '').toLowerCase()
  const keep = raw.replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim()
  return keep
}

/** 两个词的相似度（0~1），短词也能给出合理分档 */
export function similarity(a, b) {
  const x = norm(a)
  const y = norm(b)
  if (!x || !y) return 0
  if (x === y) return 1
  if (y.indexOf(x) >= 0 || x.indexOf(y) >= 0) return 0.95
  const m = x.length
  const n = y.length
  let prev = []
  let cur = []
  for (let j = 0; j <= n; j += 1) prev[j] = j
  for (let i = 1; i <= m; i += 1) {
    cur[0] = i
    for (let j = 1; j <= n; j += 1) {
      const cost = x[i - 1] === y[j - 1] ? 0 : 1
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost)
    }
    const tmp = prev
    prev = cur
    cur = tmp
  }
  return Math.max(0, 1 - prev[n] / Math.max(m, n))
}

let warmStream = null
let warmAt = 0

/** 预取麦克风流：点按钮时不用再等授权/设备启动，首字不容易被吃掉 */
export function warmMic() {
  try {
    if (warmStream && warmStream.getTracks().some(t => t.readyState === 'live')) {
      if (Date.now() - warmAt < 5 * 60 * 1000) return Promise.resolve(warmStream)
      warmStream.getTracks().forEach(t => t.stop())
      warmStream = null
    }
    if (!canRecord()) return Promise.resolve(null)
    return navigator.mediaDevices
      .getUserMedia({ audio: AUDIO })
      .then(st => {
        warmStream = st
        warmAt = Date.now()
        return st
      })
      .catch(() => null)
  } catch (e) {
    return Promise.resolve(null)
  }
}

export function canRecord() {
  try {
    return (
      typeof navigator !== 'undefined' &&
      navigator.mediaDevices &&
      typeof navigator.mediaDevices.getUserMedia === 'function' &&
      typeof MediaRecorder !== 'undefined'
    )
  } catch (e) {
    return false
  }
}

function getSpeechRecognition() {
  try {
    return window.SpeechRecognition || window.webkitSpeechRecognition || null
  } catch (e) {
    return null
  }
}

export function canWebSpeech() {
  return !!getSpeechRecognition()
}

/** 浏览器原生识别：不用上传录音，几乎实时出结果 */
function recognizeByWebSpeech(expect, ms) {
  return new Promise((resolve, reject) => {
    const SR = getSpeechRecognition()
    if (!SR) {
      reject(Object.assign(new Error('fallback'), { code: 'unsupported' }))
      return
    }
    let rec = null
    let timer = null
    let done = false
    const finish = (err, data) => {
      if (done) return
      done = true
      if (timer) clearTimeout(timer)
      try {
        rec && rec.stop()
      } catch (e) {}
      if (err) reject(err)
      else resolve(data)
    }
    try {
      rec = new SR()
    } catch (e) {
      reject(Object.assign(new Error('fallback'), { code: 'unsupported' }))
      return
    }
    rec.lang = 'en-US'
    rec.continuous = false
    rec.interimResults = false
    rec.maxAlternatives = 5
    let best = ''
    let bestScore = 0
    rec.onresult = ev => {
      const res = ev.results && ev.results[0]
      if (!res) return
      for (let i = 0; i < res.length; i += 1) {
        const alt = res[i] && res[i].transcript ? res[i].transcript : ''
        const sc = similarity(alt, expect)
        if (sc >= bestScore || !best) {
          bestScore = sc
          best = alt
        }
      }
    }
    rec.onerror = ev => {
      const code = (ev && ev.error) || 'error'
      if (code === 'not-allowed' || code === 'service-not-allowed') {
        finish(Object.assign(new Error('没有麦克风权限，点开浏览器设置允许一下'), { code }))
        return
      }
      finish(Object.assign(new Error('fallback'), { code }))
    }
    rec.onend = () => {
      const text = best.trim()
      const score = similarity(text, expect)
      if (!text) {
        finish(Object.assign(new Error('没听清，靠近麦克风再说一次'), { code: 'no-speech' }))
        return
      }
      finish(null, { text, match: score >= 0.9 ? expect : '', score, engine: 'web' })
    }
    try {
      rec.start()
    } catch (e) {
      finish(Object.assign(new Error('fallback'), { code: 'start-failed' }))
      return
    }
    timer = setTimeout(() => {
      try {
        rec.stop()
      } catch (e) {}
    }, ms)
  })
}

/** 浏览器没有原生识别时：录音上传后端 */
function recognizeByUpload(expect, ms) {
  return new Promise((resolve, reject) => {
    if (!canRecord()) {
      reject(new Error('这个浏览器不能录音，需要用 https 或本机地址打开'))
      return
    }
    let rec = null
    let stream = null
    let timer = null
    let done = false
    const cleanup = () => {
      if (timer) clearInterval(timer)
      // 预取的流留着下次复用，别每次关麦克风
      if (!usable) {
        try {
          if (stream) stream.getTracks().forEach(t => t.stop())
        } catch (e) {}
      }
    }
    const finish = (err, data) => {
      if (done) return
      done = true
      cleanup()
      if (err) reject(err)
      else resolve(data)
    }
    // 授权弹窗没人点会一直挂着：2.5 秒没拿到流就报错，别让界面卡死
    const usable =
      warmStream && warmStream.getTracks().some(t => t.readyState === 'live') ? warmStream : null
    const gum = usable ? Promise.resolve(usable) : navigator.mediaDevices.getUserMedia({ audio: AUDIO })
    Promise.race([
      gum,
      new Promise((_, rej) =>
        setTimeout(() => rej(new Error('麦克风没有打开（授权被拦或没有设备）')), 2500)
      )
    ])
      .then(s => {
        stream = s
        const mime = MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : MediaRecorder.isTypeSupported('audio/mp4')
          ? 'audio/mp4'
          : ''
        rec = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream)
        const chunks = []
        rec.ondataavailable = e => {
          if (e.data && e.data.size > 0) chunks.push(e.data)
        }
        rec.onstop = async () => {
          if (!chunks.length) {
            finish(new Error('没录到声音，靠近麦克风再说一次'))
            return
          }
          const blob = new Blob(chunks, { type: rec.mimeType || 'audio/webm' })
          if (blob.size < 3000) {
            finish(new Error('没录到声音，靠近麦克风再说一次'))
            return
          }
          try {
            const url = `${API_BASE}/api/asr?expect=${encodeURIComponent(expect || '')}`
            const res = await fetch(url, {
              method: 'POST',
              headers: { 'Content-Type': blob.type || 'audio/webm' },
              body: blob
            })
            if (!res.ok) {
              finish(new Error('识别服务出错（' + res.status + '），再试一次'))
              return
            }
            const data = await res.json()
            finish(null, {
              text: (data && data.text) || '',
              match: (data && data.match) || '',
              score: (data && data.score) || 0,
              engine: (data && data.engine) || 'server',
              dur: (data && data.dur) || 0,
              bytes: blob.size,
              blob,
              mime: blob.type
            })
          } catch (e) {
            finish(new Error('连不上识别服务，检查一下网络'))
          }
        }
        rec.start(200)
        // 静音自动截止：开口后停顿够久才停；但至少录够 1.7 秒，避免把单词截断
        const startedAt = Date.now()
        let lastVoiceAt = 0
        let sawVoice = false
        let vad = null
        try {
          const AC = window.AudioContext || window.webkitAudioContext
          if (AC) {
            vad = new AC()
            const src = vad.createMediaStreamSource(stream)
            const an = vad.createAnalyser()
            an.fftSize = 1024
            src.connect(an)
            const buf = new Uint8Array(an.fftSize)
            const noiseSamples = []
            timer = setInterval(() => {
              an.getByteTimeDomainData(buf)
              let sum = 0
              for (let i = 0; i < buf.length; i += 1) {
                const d = (buf[i] - 128) / 128
                sum += d * d
              }
              const rms = Math.sqrt(sum / buf.length)
              const now = Date.now()
              // 前 0.4 秒当环境噪音采样，阈值跟着噪音走：小声读也能被识别为“开口”
              if (now - startedAt < 400) noiseSamples.push(rms)
              const base = noiseSamples.length
                ? noiseSamples.reduce((a, b) => a + b, 0) / noiseSamples.length
                : 0
              const thr = Math.max(0.028, base * 2.5 + 0.012)
              if (rms > thr) {
                sawVoice = true
                lastVoiceAt = now
              }
              const tooLong = now - startedAt > ms
              const ended = sawVoice && now - lastVoiceAt > 1200 && now - startedAt > 1700
              if ((tooLong || ended) && rec.state !== 'inactive') {
                try {
                  rec.stop()
                } catch (e) {}
              }
            }, 100)
          }
        } catch (e) {}
        if (!timer) {
          timer = setTimeout(() => {
            try {
              if (rec.state !== 'inactive') rec.stop()
            } catch (e) {}
          }, ms)
        }
      })
      .catch(e => {
        finish(new Error((e && e.message && e.message.indexOf('麦克风') >= 0)
          ? e.message
          : '没有麦克风权限，点开浏览器设置允许一下'))
      })
  })
}

/** 统一入口：先试原生识别，不行再走后端 */
export async function recordAndRecognize(expect, ms = 4000) {
  // 录音上传优先：浏览器原生识别在国内常因网络/权限直接静默失败，请求都发不出去
  if (canRecord()) {
    return recognizeByUpload(expect, ms)
  }
  if (canWebSpeech()) {
    try {
      return await recognizeByWebSpeech(expect, ms)
    } catch (e) {
      const code = (e && e.code) || ''
      // 权限问题、没听到：直接给出人话提示，不再兜底
      if (code === 'not-allowed' || code === 'service-not-allowed' || code === 'no-speech') {
        throw e
      }
      // 其它情况（网络识别不可用、启动失败）退回上传识别
    }
  }
  return recognizeByUpload(expect, ms)
}
