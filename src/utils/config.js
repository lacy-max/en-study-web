/**
 * 后端地址统一入口
 *
 * 构建时可覆盖：API_BASE=https://api.your-domain.com npx taro build --type h5
 * 不传就用下面的默认值（局域网调试用）
 */
const FALLBACK_API = 'http://192.168.1.47:8000'

/* eslint-disable no-undef */
export const API_BASE =
  typeof __API_BASE__ !== 'undefined' && __API_BASE__ ? __API_BASE__ : FALLBACK_API
