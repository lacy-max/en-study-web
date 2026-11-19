import React, { useState } from 'react'
import { View, Text } from '@tarojs/components'
import { useDidShow } from '@tarojs/taro'
import { chapters } from '../../data/chapters'
import { getGame } from '../../utils/game'
import { CARDS, DOLL_CARDS, BADGES, ACCESSORIES } from '../../data/cards'
import { getChapterProgress } from '../../utils/storage'
import { fetchCards } from '../../utils/api'
import { unlockCard } from '../../utils/game'
import './collection.scss'
import TabBar from '../../components/tabbar'

export default function Collection() {
  const [game, setGame] = useState(getGame())

  useDidShow(() => {
    setGame(getGame())
    // 服务端保存的娃娃卡，换手机也能同步回来
    fetchCards().then(list => {
      (list || []).forEach(id => unlockCard(id))
      setGame(getGame())
    })
  })

  const cards = chapters.map(c => CARDS[c.id] || { id: c.id, emoji: '📘', title: c.title })

  return (
    <View className='col-page'>
      <View className='col-head'>
        <Text className='col-title'>我的收藏</Text>
        <Text className='col-sub'>
          卡牌 {(game.cards || []).filter(id => id.indexOf('doll') !== 0).length}/{cards.length} · 娃娃卡{' '}
          {(game.cards || []).filter(id => id.indexOf('doll') === 0).length}/{DOLL_CARDS.length} · 徽章{' '}
          {(game.badges || []).length}/{BADGES.length}
        </Text>
      </View>

      {/* 卡牌册 */}
      <View className='col-section'>
        <Text className='col-sec-title'>单词卡牌</Text>
        <View className='card-grid'>
          {cards.map((card, i) => {
            const owned = (game.cards || []).indexOf(card.id) >= 0
            const p = getChapterProgress(card.id)
            return (
              <View
                className={`word-card ${owned ? 'word-card-on' : ''}`}
                key={card.id}
                style={owned ? { background: `linear-gradient(150deg, ${card.color}, ${card.color2})` } : {}}
              >
                <Text className='word-card-emoji'>{owned ? card.emoji : '❔'}</Text>
                <Text className='word-card-title'>{owned ? card.title : '未解锁'}</Text>
                <Text className='word-card-sub'>
                  {owned ? `⭐ ${Math.round((p.maxScore || 0) / 10)}` : '闯关后解锁'}
                </Text>
                <Text className='word-card-no'>No.{i + 1}</Text>
              </View>
            )
          })}
        </View>
      </View>

      {/* 娃娃卡册（女孩专属奖励） */}
      {(game.gender === 'girl' || (game.cards || []).some(id => id.indexOf('doll') === 0)) && (
        <View className='col-section'>
          <Text className='col-sec-title'>娃娃卡牌</Text>
          <View className='card-grid'>
            {DOLL_CARDS.map((card, i) => {
              const owned = (game.cards || []).indexOf(card.id) >= 0
              return (
                <View
                  className={`word-card ${owned ? 'word-card-on' : ''}`}
                  key={card.id}
                  style={owned ? { background: `linear-gradient(150deg, ${card.color}, ${card.color2})` } : {}}
                >
                  <Text className='word-card-emoji'>{owned ? card.emoji : '❔'}</Text>
                  <Text className='word-card-title'>{owned ? card.title : '完成一关解锁'}</Text>
                  <Text className='word-card-no'>Doll.{i + 1}</Text>
                </View>
              )
            })}
          </View>
        </View>
      )}

      {/* 徽章 */}
      <View className='col-section'>
        <Text className='col-sec-title'>徽章</Text>
        <View className='badge-grid'>
          {BADGES.map(b => {
            const owned = (game.badges || []).indexOf(b.id) >= 0
            return (
              <View className={`badge ${owned ? 'badge-on' : ''}`} key={b.id}>
                <Text className='badge-emoji'>{owned ? b.emoji : '🔒'}</Text>
                <Text className='badge-name'>{b.name}</Text>
                <Text className='badge-desc'>{owned ? b.desc : '未获得'}</Text>
              </View>
            )
          })}
        </View>
      </View>

      {/* 伙伴配饰 */}
      <View className='col-section'>
        <Text className='col-sec-title'>伙伴配饰</Text>
        <View className='acc-row'>
          {ACCESSORIES.map(a => {
            const owned = (game.accessories || []).indexOf(a.id) >= 0
            return (
              <View className={`acc ${owned ? 'acc-on' : ''}`} key={a.id}>
                <Text className='acc-emoji'>{owned ? a.emoji : '❔'}</Text>
                <Text className='acc-name'>{owned ? a.name : '宝箱'}</Text>
              </View>
            )
          })}
        </View>
      </View>
          <TabBar active='me' />
</View>
  )
}
