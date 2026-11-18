import Taro from '@tarojs/taro'

const KEY = 'en_profile_v1'

/** 谁在用：'kid' 小朋友 / 'adult' 大人 / '' 还没选 */
export function getProfile() {
  try {
    const v = Taro.getStorageSync(KEY)
    if (v && v.mode) return v
  } catch (e) {}
  return { mode: '' }
}

export function setProfile(mode) {
  const p = { mode, at: Date.now() }
  try {
    Taro.setStorageSync(KEY, p)
  } catch (e) {}
  return p
}

export function clearProfile() {
  try {
    Taro.removeStorageSync(KEY)
  } catch (e) {}
}
