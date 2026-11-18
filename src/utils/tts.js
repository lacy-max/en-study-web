import Taro from '@tarojs/taro'

/**
 * TTS 朗读（小程序版）
 *
 * 原理：小程序不能直接用浏览器 speechSynthesis（iOS 缺少英文音色会静默失败），
 * 所以改成请求你自己的 TTS 代理接口，直接返回 mp3 流，用 InnerAudioContext 播放。
 *
 * 部署后端后，把下面的地址换成你自己的 https 域名（不要带结尾斜杠）
 */
// 地址在 src/utils/config.js 统一配置（构建时用 API_BASE 环境变量覆盖）
import { API_BASE } from './config'
export const TTS_BASE = API_BASE

let audioCtx = null

function getCtx() {
  if (!audioCtx) {
    audioCtx = Taro.createInnerAudioContext()
    // 关键：iOS 侧边静音键打开时也出声（默认是 true，会跟着静音键走）
    audioCtx.obeyMuteSwitch = false
    audioCtx.mixWithOther = true
    audioCtx.onError((err) => {
      console.warn('[tts] 播放失败', err)
    })
  }
  return audioCtx
}

/**
 * @param {string} text 要朗读的英文
 * @param {number} rate 语速，0.6 ~ 1.2，1 为原速
 */
export function speak(text, rate = 1, onEnd) {
  if (!text || !String(text).trim()) return
  if (TTS_BASE.indexOf('your-tts-domain') >= 0) {
    console.warn('[tts] 请先在 src/utils/tts.js 里把 TTS_BASE 换成你自己的接口地址')
  }
  const ctx = getCtx()
  try {
    ctx.stop()
  } catch (e) {}
  // 播放结束回调：只对当前这一次生效
  try {
    if (ctx.__endHandler) {
      ctx.offEnded(ctx.__endHandler)
      ctx.__endHandler = null
    }
    if (onEnd) {
      const h = () => {
        ctx.__endHandler = null
        onEnd()
      }
      ctx.__endHandler = h
      ctx.onEnded(h)
    }
  } catch (e) {}
  const url = `${TTS_BASE}/tts?text=${encodeURIComponent(text)}&rate=${rate}`
  ctx.src = url
  ctx.play()
}

/** 已预热过的，避免重复请求 */
const warmed = {}

function warmOne(text, rate) {
  const url = `${TTS_BASE}/tts?text=${encodeURIComponent(text)}&rate=${rate}`
  if (warmed[url]) return Promise.resolve()
  warmed[url] = true
  return new Promise(resolve => {
    try {
      if (typeof fetch === 'function') {
        fetch(url)
          .then(() => resolve())
          .catch(() => resolve())
      } else {
        Taro.request({ url, responseType: 'arraybuffer' })
          .then(() => resolve())
          .catch(() => resolve())
      }
    } catch (e) {
      resolve()
    }
  })
}

/**
 * 预热朗读：进页面时在后台把这一批文本先合成好，
 * 服务端有磁盘缓存，之后点击就能立刻出声，不会有几秒的停顿
 */
export function warmTTS(texts, rate = 1) {
  if (!texts || !texts.length) return
  const list = texts.filter(t => t && String(t).trim())
  let cursor = 0
  const CONCURRENCY = 3
  const next = () => {
    if (cursor >= list.length) return
    const text = list[cursor++]
    warmOne(text, rate).then(() => next())
  }
  for (let i = 0; i < CONCURRENCY && i < list.length; i++) next()
}

export function stopSpeak() {
  if (audioCtx) {
    try {
      audioCtx.stop()
    } catch (e) {}
  }
}
