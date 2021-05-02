import 'dotenv/config'
import { create, Client } from '@open-wa/wa-automate'

import { LessonsAlert } from './services/StartAlert'

function start(client: Client) {
  const lessonsAlert = new LessonsAlert(client, [])

  client.onMessage(async message => {
    const { type, isGroupMsg } = message

    if (isGroupMsg) {
      if (type === 'chat') {
        switch (message.content) {
          case '!notificar':
            return lessonsAlert.addChatToAlert(message.from)

          case '!parar-notificações':
            return lessonsAlert.removeChatToAlert(message.from)

          default:
            return null
        }
      }
    }
  })
}

create({ sessionData: process.env.SESSION_DATA }).then(client => start(client))
