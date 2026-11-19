import Taro from '@tarojs/taro'

/** 返回上一页；没有上一页（比如直接打开的链接）就回首页，避免卡在页面里 */
export function backOrHome() {
  try {
    const stack = typeof Taro.getCurrentPages === 'function' ? Taro.getCurrentPages() : []
    if (stack && stack.length > 1) {
      Taro.navigateBack()
      return
    }
  } catch (e) {}
  goHome()
}

/** 直接回首页（清掉中间页面） */
export function goHome() {
  Taro.reLaunch({ url: '/pages/index/index' })
}
