import { ChatId, Client } from '@open-wa/wa-automate'
import autoBind from 'auto-bind'

import { Lesson } from '../types'
import { week } from '../week.json'

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

  private chatIsIncluded(chatId: ChatId) {
    return this.chatsToAlert.includes(chatId)
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

  private secondsToStartLesson(time: string) {
    const twelveHoursInSeconds = 43200

    const currentDate = new Date()
    const currentTimeInSeconds =
      currentDate.getHours() * 3600 +
      currentDate.getMinutes() * 60 +
      currentDate.getSeconds()

    const [lessonHours, lessonMinutes] = time.split(':')
    const lessonTimeInSeconds =
      Number(lessonHours) * 3600 + Number(lessonMinutes) * 60

    const secondsToStart = lessonTimeInSeconds - (currentTimeInSeconds - 15)

    return secondsToStart < 0
      ? secondsToStart + twelveHoursInSeconds
      : secondsToStart
  }

  private currentWeekDay(additionalDays: number = 0) {
    const currentWeekDay = new Date().getDay() + additionalDays
    return currentWeekDay === 7 ? 0 : currentWeekDay
  }

  public addChatToAlert(chatId: ChatId) {
    let returnMessage: string

    if (!this.chatIsIncluded(chatId)) {
      this.chatsToAlert.push(chatId)

      returnMessage = 'Agora eu mando notificações para vocês!'
    } else {
      returnMessage = 'Eu já estou mandando notificações para vocês!'
    }

    this.client
      .sendText(chatId, returnMessage)
      .catch(() => console.log('Algo de errado aconteceu com', chatId))
  }

  public removeChatToAlert(chatId: ChatId) {
    let returnMessage: string

    if (this.chatIsIncluded(chatId)) {
      this.chatsToAlert.splice(this.chatsToAlert.indexOf(chatId), 1)

      returnMessage = 'Agora eu não mando mais notificações para vocês!'
    } else {
      returnMessage = 'Eu ainda não mando notificações para vocês!'
    }

    this.client
      .sendText(chatId, returnMessage)
      .catch(() => console.log('Algo de errado aconteceu com', chatId))
  }

  public get nextLesson() {
    let nextLesson: Lesson

    let lessons = week[this.currentWeekDay()]
    let additionalDays = 0

    while (!lessons?.length) {
      lessons = week[this.currentWeekDay(additionalDays)]
      additionalDays += 1
    }

    lessons.forEach(lesson => {
      const secondsToStart = this.secondsToStartLesson(lesson.time)

      if (!nextLesson || secondsToStart < nextLesson.secondsToStart) {
        nextLesson = { ...lesson, secondsToStart }
      }
    })

    return nextLesson
  }

  public get currentLesson() {
    let currentLesson: Lesson

    let lessons = week[this.currentWeekDay()]
    let additionalDays = 0

    while (!lessons?.length) {
      lessons = week[this.currentWeekDay(additionalDays)]
      additionalDays += 1
    }

    lessons.forEach(lesson => {
      const twelveHoursInSeconds = 43200
      const secondsToStart =
        this.secondsToStartLesson(lesson.time) - twelveHoursInSeconds

      if (
        !currentLesson ||
        (secondsToStart < 0 && secondsToStart > currentLesson.secondsToStart)
      ) {
        currentLesson = { ...lesson, secondsToStart }
      }
    })

    return currentLesson
  }

  public start() {
    const threeMinutesInSeconds = 180
    const nextLesson = this.nextLesson

    const threeMinutesBeforeStartLessonInSeconds =
      nextLesson.secondsToStart - threeMinutesInSeconds

    if (threeMinutesBeforeStartLessonInSeconds >= threeMinutesInSeconds)
      setTimeout(
        this.showMessagePrepareToStartLesson,
        threeMinutesBeforeStartLessonInSeconds * 1000,
        nextLesson
      )

    setTimeout(
      this.showMessageLessonStart,
      nextLesson.secondsToStart * 1000,
      nextLesson
    )

    setTimeout(
      this.start,
      (nextLesson.secondsToStart + threeMinutesInSeconds * 2) * 1000
    )
  }
}
