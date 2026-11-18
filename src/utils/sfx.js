import Taro from '@tarojs/taro'
import WrongSound from '../assets/sfx/wrong.wav'

let wrongCtx = null

/**
 * 答错时的反馈：手机震动 + 一声“嗡”的提示音
 * 小程序里振动用 Taro.vibrateShort，H5 上部分机型不支持，所以整体做了保护
 */
export function playWrong() {
  try {
    if (typeof Taro.vibrateShort === 'function') {
      Taro.vibrateShort({ type: 'heavy' })
    }
  } catch (e) {}

  try {
    if (!wrongCtx) {
      wrongCtx = Taro.createInnerAudioContext()
      wrongCtx.obeyMuteSwitch = false
      wrongCtx.src = WrongSound
    }
    wrongCtx.stop()
    wrongCtx.play()
  } catch (e) {
    console.warn('[sfx] 播放失败', e)
  }
}
