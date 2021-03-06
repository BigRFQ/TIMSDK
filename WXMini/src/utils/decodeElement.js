import { emojiMap, emojiUrl } from './emojiMap'
import { formatDuration } from './index'
/** 传入message.element（群系统消息SystemMessage，群提示消息GroupTip除外）
 * content = {
 *  type: 'TIMTextElem',
 *  content: {
 *    text: 'AAA[龇牙]AAA[龇牙]AAA[龇牙AAA]'
 *  }
 *}
 **/

// 群提示消息的含义 (opType)
const GROUP_TIP_TYPE = {
  MEMBER_JOIN: 1,
  MEMBER_QUIT: 2,
  MEMBER_KICKED_OUT: 3,
  MEMBER_SET_ADMIN: 4, // 被设置为管理员
  MEMBER_CANCELED_ADMIN: 5, // 被取消管理员
  GROUP_INFO_MODIFIED: 6, // 修改群资料，转让群组为该类型，msgBody.msgGroupNewInfo.ownerAccount表示新群主的ID
  MEMBER_INFO_MODIFIED: 7 // 修改群成员信息
}

function parseText (message) {
  let renderDom = []
  let temp = message.payload.text
  let left = -1
  let right = -1
  while (temp !== '') {
    left = temp.indexOf('[')
    right = temp.indexOf(']')
    switch (left) {
      case 0:
        if (right === -1) {
          renderDom.push({
            name: 'span',
            text: temp
          })
          temp = ''
        } else {
          let _emoji = temp.slice(0, right + 1)
          if (emojiMap[_emoji]) {
            renderDom.push({
              name: 'img',
              src: emojiUrl + emojiMap[_emoji]
            })
            temp = temp.substring(right + 1)
          } else {
            renderDom.push({
              name: 'span',
              text: '['
            })
            temp = temp.slice(1)
          }
        }
        break
      case -1:
        renderDom.push({
          name: 'span',
          text: temp
        })
        temp = ''
        break
      default:
        renderDom.push({
          name: 'span',
          text: temp.slice(0, left)
        })
        temp = temp.substring(left)
        break
    }
  }
  return renderDom
}
function parseGroupSystemNotice (message) {
  const payload = message.payload
  const groupName =
    payload.groupProfile.groupName || payload.groupProfile.groupID
  let text
  switch (payload.operationType) {
    case 1:
      text = `${payload.operatorID} 申请加入群组：${groupName}`
      break
    case 2:
      text = `成功加入群组：${groupName}`
      break
    case 3:
      text = `申请加入群组：${groupName}被拒绝`
      break
    case 4:
      text = `被管理员${payload.operatorID}踢出群组：${groupName}`
      break
    case 5:
      text = `群：${groupName} 已被${payload.operatorID}解散`
      break
    case 6:
      text = `${payload.operatorID}创建群：${groupName}`
      break
    case 7:
      text = `${payload.operatorID}邀请你加群：${groupName}`
      break
    case 8:
      text = `你退出群组：${groupName}`
      break
    case 9:
      text = `你被${payload.operatorID}设置为群：${groupName}的管理员`
      break
    case 10:
      text = `你被${payload.operatorID}撤销群：${groupName}的管理员身份`
      break
    case 255:
      text = '自定义群系统通知: ' + payload.userDefinedField
      break
  }
  return [{
    name: 'system',
    text: text
  }]
}
function parseGroupTip (message) {
  const payload = message.payload
  let tip
  switch (payload.operationType) {
    case GROUP_TIP_TYPE.MEMBER_JOIN:
      tip = `新成员加入：${payload.userIDList.join(',')}`
      break
    case GROUP_TIP_TYPE.MEMBER_QUIT:
      tip = `群成员退群：${payload.userIDList.join(',')}`
      break
    case GROUP_TIP_TYPE.MEMBER_KICKED_OUT:
      tip = `群成员被踢：${payload.userIDList.join(',')}`
      break
    case GROUP_TIP_TYPE.MEMBER_SET_ADMIN:
      tip = `${payload.operatorID}将${payload.userIDList.join(',')}设置为管理员`
      break
    case GROUP_TIP_TYPE.MEMBER_CANCELED_ADMIN:
      tip = `${payload.operatorID}将${payload.userIDList.join(',')}取消作为管理员`
      break
    case GROUP_TIP_TYPE.GROUP_INFO_MODIFIED:
      tip = '群资料修改'
      break
    case GROUP_TIP_TYPE.MEMBER_INFO_MODIFIED:
      tip = '群成员资料修改'
      break
  }
  return [{
    name: 'groupTip',
    text: tip
  }]
}
function isJSON (str) {
  if (typeof str === 'string') {
    try {
      let obj = JSON.parse(str)
      if (typeof obj === 'object' && obj) {
        return true
      } else {
        return false
      }
    } catch (e) {
      return false
    }
  }
}

function parseCustom (message) {
  let data = message.payload.data
  if (isJSON(data)) {
    data = JSON.parse(data)
    if (data.hasOwnProperty('version') && data.version === 3) {
      let tip
      const time = formatDuration(data.duration)
      switch (data.action) {
        case 0:
          tip = '请求通话'
          break
        case 1:
          tip = '取消通话'
          break
        case 2:
          tip = '拒绝通话'
          break
        case 3:
          tip = '无应答'
          break
        case 4:
          tip = '开始通话'
          break
        case 5:
          if (data.duration === 0) {
            tip = '结束通话'
          } else {
            tip = `结束通话，通话时长${time}`
          }
          break
        case 6:
          tip = '正在通话中'
          break
      }
      return [{
        name: 'videoCall',
        text: tip
      }]
    }
    return [{
      name: 'custom',
      text: data
    }]
  }
  return [{
    name: 'custom',
    text: data
  }]
}
export function decodeElement (message) {
  // renderDom是最终渲染的
  switch (message.type) {
    case 'TIMTextElem':
      return parseText(message)
    case 'TIMGroupSystemNoticeElem':
      return parseGroupSystemNotice(message)
    case 'TIMGroupTipElem':
      return parseGroupTip(message)
    case 'TIMCustomElem':
      return parseCustom(message)
    default:
      return []
  }
}
