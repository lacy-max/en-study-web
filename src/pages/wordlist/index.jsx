import React, { useCallback, useRef, useState } from 'react'
import { View, Text, ScrollView, Image } from '@tarojs/components'
import { useDidShow, useReachBottom } from '@tarojs/taro'
import { picOf, picAsset } from '../../data/pics'
import { fetchWords, getSession } from '../../utils/api'
import { speak, stopSpeak } from '../../utils/tts'
import { backOrHome } from '../../utils/nav'
import './index.scss'
import TabBar from '../../components/tabbar'

const PAGE = 10

// 释义收成词，不要长句/括号解释
function shortCn(cn) {
  return String(cn || '')
    .replace(/[（(][^）)]*[）)]/g, '')
    .split(/[；;，,。]/)[0]
    .trim()
}

function shortTitle(t) {
  return String(t || '')
    .replace(/^Unit\s*\d+\s*·\s*/, '')
    .trim()
}

export default function WordList() {
  const [items, setItems] = useState([])
  const [total, setTotal] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [loading, setLoading] = useState(false)
  const [failed, setFailed] = useState(false)
  const offsetRef = useRef(0)
  const busyRef = useRef(false)

  const load = useCallback(reset => {
    if (busyRef.current) return
    if (!getSession()) {
      setFailed(true)
      return
    }
    busyRef.current = true
    setLoading(true)
    const offset = reset ? 0 : offsetRef.current
    fetchWords(offset, PAGE).then(res => {
      busyRef.current = false
      setLoading(false)
      if (!res || !res.items) {
        setFailed(true)
        return
      }
      offsetRef.current = offset + res.items.length
      setItems(prev => (reset ? res.items : prev.concat(res.items)))
      setTotal(Number(res.total) || 0)
      setHasMore(!!res.hasMore)
      setFailed(false)
    })
  }, [])

  // 每次进页面重新拉第一页（刚学的新词马上能看到）
  useDidShow(() => {
    offsetRef.current = 0
    load(true)
  })

  // 滚到底部再拉下一页（每次 10 个）
  const onLower = () => {
    if (!hasMore || loading || busyRef.current) return
    load(false)
  }

  // H5 下页面整体滚动，用 useReachBottom 兜底
  useReachBottom(onLower)

  return (
    <View className='wl-page'>
      <View className='wl-head'>
        <View
          className='wl-back'
          onClick={() => {
            stopSpeak()
            backOrHome()
          }}
        >
          <Text className='wl-back-t'>‹ 返回</Text>
        </View>
        <View className='wl-title-row'>
          <Text className='wl-count'>共 {total} 个单词</Text>
        </View>
      </View>

      {!loading && items.length === 0 && (
        <View className='wl-empty'>
          <Text className='wl-empty-emoji'>🌱</Text>
          <Text className='wl-empty-t'>{failed ? '没连上服务器，重进一次试试' : '还没有学过单词'}</Text>
          <Text className='wl-empty-s'>先从第一关「学单词」开始吧</Text>
        </View>
      )}

      <ScrollView
        scrollY
        className='wl-scroll'
        lowerThreshold={80}
        onScrollToLower={onLower}
      >
        {items.map((w, i) => (
          <View
            className='wl-item'
            key={`${w.chapterId}-${w.en}-${i}`}
            onClick={() => speak(w.en)}
          >
            <View className='wl-pic'>
              {picAsset(w.en) ? (
                <Image className='wl-pic-img' src={picAsset(w.en)} mode='aspectFit' />
              ) : (
                <Text className='wl-pic-emoji'>{picOf(w.en)}</Text>
              )}
            </View>
            <View className='wl-word-info'>
              <Text className='wl-en'>{w.en}</Text>
              <Text className='wl-cn'>{shortCn(w.cn)}</Text>
            </View>
            <Text className='wl-tag'>{shortTitle(w.chapterTitle)}</Text>
            <Text className='wl-speak'>🔊</Text>
          </View>
        ))}

        {loading && (
          <View className='wl-more'>
            <Text className='wl-more-t'>正在加载…</Text>
          </View>
        )}
        {!loading && !hasMore && items.length > 0 && (
          <View className='wl-more'>
            <Text className='wl-more-t'>已经到底啦 · 共 {total} 个单词</Text>
          </View>
        )}
        <View className='wl-bottom' />
      </ScrollView>
      <TabBar active='me' />
    </View>
  )
}
