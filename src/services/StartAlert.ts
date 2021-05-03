import { ChatId, Client } from '@open-wa/wa-automate'
import autoBind from 'auto-bind'

import { week, lessonsPosition } from '../week.json'

export class LessonsAlert {
  private weekDayName = {
    0: 'domingo',
    1: 'segunda-feira',
    2: 'terça-feira',
    3: 'quarta-feira',
    4: 'quinta-feira',
    5: 'sexta-feira',
    6: 'sábado'
  }

  constructor(private client: Client, private chatsToAlert: ChatId[]) {
    this.client = client
    this.chatsToAlert = chatsToAlert

    autoBind(this)
  }

  public addChatToAlert(chatId: ChatId) {
    if (this.chatsToAlert.includes(chatId)) {
      this.client
        .sendText(chatId, 'Eu já estou mandando notificações para vocês!')
        .catch(() => console.log('Algo de errado aconteceu com', chatId))
    } else {
      this.chatsToAlert.push(chatId)
      this.client
        .sendText(chatId, 'Agora eu mando notificações para vocês!')
        .catch(() => console.log('Algo de errado aconteceu com', chatId))
    }
  }

  public removeChatToAlert(chatId: ChatId) {
    if (this.chatsToAlert.includes(chatId)) {
      this.chatsToAlert.splice(this.chatsToAlert.indexOf(chatId), 1)
      this.client
        .sendText(chatId, 'Agora eu não mando mais notificações para vocês!')
        .catch(() => console.log('Algo de errado aconteceu com', chatId))
    } else {
      this.client
        .sendText(chatId, 'Eu ainda não mando notificações para vocês!')
        .catch(() => console.log('Algo de errado aconteceu com', chatId))
    }
  }

  private async showMessagePrepareToStartLesson(lesson) {
    console.log('a aula vai começar em 3 minutos', lesson)

    this.chatsToAlert?.forEach(chat => {
      this.client
        .sendText(chat, 'A aula vai começar em 3 minutos')
        .catch(() => console.log('Não consegui alertar o chat', chat))
    })
  }

  private async showMessageLessonStart(lesson) {
    console.log('a aula começou', lesson)

    this.chatsToAlert?.forEach(chat => {
      this.client
        .sendText(chat, 'A aula começou')
        .catch(() => console.log('Não consegui alertar o chat', chat))
    })
  }

  private async showMessageNotHaveLesson() {
    console.log('hoje não tem aula')

    this.chatsToAlert?.forEach(chat => {
      this.client
        .sendText(chat, 'Hoje não tem aula')
        .catch(() => console.log('Não consegui alertar o chat', chat))
    })
  }

  private miliSecondsToStartLesson(time: string) {
    const currentDate = new Date()
    const currentHoursInSeconds = currentDate.getHours() * 3600
    const currentMinutesInSeconds = currentDate.getMinutes() * 60
    const currentSeconds = currentDate.getSeconds()

    const timeSplited = time.split(':')
    const [hoursInSeconds, minutesInSeconds] = [
      Number(timeSplited[0]) * 3600,
      Number(timeSplited[1]) * 60
    ]

    const miliSecondsToStart =
      (currentHoursInSeconds +
        currentMinutesInSeconds +
        currentSeconds -
        (hoursInSeconds + minutesInSeconds) -
        15) *
      1000

    return miliSecondsToStart < 0 ? miliSecondsToStart * -1 : miliSecondsToStart
  }

  private get currentWeekDay() {
    return new Date().getDay()
  }

  private get tomorrowWeekDay() {
    const currentWeekDay = this.currentWeekDay
    return currentWeekDay === 6 ? 0 : currentWeekDay + 1
  }

  private get firstLessonTomorrow() {
    const tomorrowWeekDay = this.tomorrowWeekDay
    return week[tomorrowWeekDay].find(({ time }) => lessonsPosition[time] === 1)
  }

  public start() {
    const currentWeekDay = this.currentWeekDay
    const firstLessonTomorrow = this.firstLessonTomorrow
    const miliSecondsToStartFirstLessonTomorrow = this.miliSecondsToStartLesson(
      firstLessonTomorrow.time
    )
    const lessons = week[currentWeekDay]

    if (lessons.length) {
      const threeMinutesInMiliSeconds = 180000

      for (const lesson of lessons) {
        const miliSecondsToStartLesson = this.miliSecondsToStartLesson(
          lesson.time
        )

        const threeMinutesBeforeStartLessonInMiliSeconds =
          miliSecondsToStartLesson - threeMinutesInMiliSeconds

        if (
          threeMinutesBeforeStartLessonInMiliSeconds >=
          threeMinutesInMiliSeconds
        )
          setTimeout(
            this.showMessagePrepareToStartLesson,
            threeMinutesBeforeStartLessonInMiliSeconds,
            lesson
          )

        setTimeout(
          this.showMessageLessonStart,
          miliSecondsToStartLesson,
          lesson
        )
      }
    } else {
      this.showMessageNotHaveLesson()
    }

    setTimeout(this.start, miliSecondsToStartFirstLessonTomorrow)
  }
}
