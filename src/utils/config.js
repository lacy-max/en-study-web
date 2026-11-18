/**
 * 后端地址统一入口
 *
 * 1) 构建时可覆盖：API_BASE=https://api.your-domain.com npx taro build --type h5
 * 2) 没显式指定时，H5 会自动用「当前访问的域名/IP + :8000」，
 *    这样电脑用 127.0.0.1、手机用 192.168.x.x 都能连上后端
 * 3) 小程序端没有 window，用下面的局域网默认值
 */
const FALLBACK_API = 'http://192.168.1.47:8000'

function detectApiBase() {
  try {
    if (typeof window !== 'undefined' && window.location && window.location.hostname) {
      const host = window.location.hostname
      const proto = window.location.protocol === 'https:' ? 'https:' : 'http:'
      const port = window.location.port
      // 本地开发/预览端口才需要手动指到 8000；正式环境（80/443/8000）与页面同源，由 nginx 反代 /api
      const DEV_PORTS = ['10105', '10086', '10200']
      if (DEV_PORTS.indexOf(port) >= 0) return `${proto}//${host}:8000`
      return `${proto}//${window.location.host}`
    }
  } catch (e) {}
  return FALLBACK_API
}

/* eslint-disable no-undef */
export const API_BASE =
  typeof __API_BASE__ !== 'undefined' && __API_BASE__ ? __API_BASE__ : detectApiBase()
