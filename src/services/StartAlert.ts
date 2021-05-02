import { ChatId, Client } from '@open-wa/wa-automate'

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
  }

  public addNewChatToAlert(chatId: ChatId) {
    if (this.chatsToAlert.includes(chatId)) {
      this.client
        .sendText(chatId, 'Eu já estou mandando alertas para vocês!')
        .catch(() => console.log('Algo de errado aconteceu com', chatId))
    } else {
      this.client
        .sendText(chatId, 'Agora eu mando alertas para vocês!')
        .catch(() => console.log('Algo de errado aconteceu com', chatId))
    }
  }

  private async showMessagePrepareToStartLesson(lesson) {
    console.log('a aula vai começar em 3 minutos', lesson)

    this.chatsToAlert.forEach(chat => {
      this.client
        .sendText(chat, 'A aula vai começar em 3 minutos')
        .catch(() => console.log('Não consegui alertar o chat', chat))
    })
  }

  private async showMessageLessonStart(lesson) {
    console.log('a aula começou', lesson)

    this.chatsToAlert.forEach(chat => {
      this.client
        .sendText(chat, 'A aula começou')
        .catch(() => console.log('Não consegui alertar o chat', chat))
    })
  }

  private async showMessageNotHaveLesson() {
    console.log('hoje não tem aula')

    this.chatsToAlert.forEach(chat => {
      this.client
        .sendText(chat, 'Hoje não tem aula')
        .catch(() => console.log('Não consegui alertar o chat', chat))
    })
  }

  private getMiliSecondsToStartLesson(time: string) {
    const currentDate = new Date()
    const timeSplited = time.split(':')

    const [currentHours, currentMinutes] = [
      currentDate.getHours(),
      currentDate.getMinutes()
    ]
    const [hours, minutes] = [Number(timeSplited[0]), Number(timeSplited[1])]

    const miliSecondsToStart =
      (currentHours * 3600 +
        currentMinutes * 60 -
        (hours * 3600 + minutes * 60)) *
      1000

    return miliSecondsToStart
  }

  private getCurrentWeekDay() {
    return new Date().getDay()
  }

  private getTomorrowWeekDay() {
    const currentWeekDay = this.getCurrentWeekDay()
    return currentWeekDay === 6 ? 0 : currentWeekDay + 1
  }

  private getFirstLessonTomorrow() {
    const tomorrowWeekDay = this.getTomorrowWeekDay()
    return week[tomorrowWeekDay].find(({ time }) => lessonsPosition[time] === 1)
  }

  public start() {
    const currentWeekDay = this.getCurrentWeekDay()
    const firstLessonTomorrow = this.getFirstLessonTomorrow()
    const miliSecondsToStartFirstLessonTomorrow = this.getMiliSecondsToStartLesson(
      firstLessonTomorrow.time
    )
    const lessons = week[currentWeekDay]

    if (lessons.length) {
      const threeMinutesInMiliSeconds = 180000

      for (const lesson of lessons) {
        const miliSecondsToStartLesson = this.getMiliSecondsToStartLesson(
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
