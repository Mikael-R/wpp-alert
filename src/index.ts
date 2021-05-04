import 'dotenv/config'
import { create, Client } from '@open-wa/wa-automate'

import { LessonsAlert } from './services/StartAlert'

function start(client: Client) {
  const lessonsAlert = new LessonsAlert(client, [])
  lessonsAlert.start()

  client.onMessage(async message => {
    const { type } = message

    if (type === 'chat') {
      const chatId = message.from

      switch (message.content) {
        case '!notificar':
          return lessonsAlert.addChatToAlert(chatId)

        case '!parar-notificar':
          return lessonsAlert.removeChatToAlert(chatId)

        case '!aula-atual':
          return lessonsAlert.showMessageCurrentLesson(chatId)

        case '!prox-aula':
          return lessonsAlert.showMessageNextLesson(chatId)

        default:
          return null
      }
    }
  })
}

create({ sessionData: process.env.SESSION_DATA }).then(client => start(client))
