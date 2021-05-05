import { ChatId, Client } from '@open-wa/wa-automate'
import autoBind from 'auto-bind'

import { Lesson } from '../types'
import { week } from '../week.json'

export class LessonsAlert {
  constructor(private client: Client, private chatsToAlert: ChatId[]) {
    this.client = client
    this.chatsToAlert = chatsToAlert

    autoBind(this)
  }

  private chatIsIncluded(chatId: ChatId) {
    return this.chatsToAlert.includes(chatId)
  }

  private toFixed(number: string | number) {
    return Number(Number(number).toFixed(0))
  }

  private showMessagePrepareToStartLesson(lesson: Lesson) {
    this.chatsToAlert?.forEach(chatId => {
      this.client
        .sendText(
          chatId,
          `A *${lesson.position}°* aula de *${lesson.subject}* com *${lesson.teacher}* começa em 3 minutos.`
        )
        .catch(() => console.log('Não consegui alertar o chat', chatId))
    })
  }

  private showMessageLessonStart(lesson: Lesson) {
    this.chatsToAlert?.forEach(chatId => {
      this.client
        .sendText(
          chatId,
          `A *${lesson.position}°* aula de *${lesson.subject}* com *${lesson.teacher}* começou.`
        )
        .catch(() => console.log('Não consegui alertar o chat', chatId))
    })
  }

  public showMessageNextLesson(chatId: ChatId) {
    let returnMessage: string
    const nextLesson = this.nextLesson

    const startInMinutes = this.toFixed(nextLesson.startAtInSeconds / 60)

    returnMessage = `Próxima aula é a *${nextLesson.position}°* e será de *${nextLesson.subject}* com *${nextLesson.teacher}* às *${nextLesson.time}* daqui `

    if (startInMinutes > 60) {
      returnMessage += `*${this.toFixed(startInMinutes / 60)}* horas.`
    } else {
      returnMessage += `*${startInMinutes}* minutos.`
    }

    this.client
      .sendText(chatId, returnMessage)
      .catch(() => console.log('Algo de errado aconteceu com', chatId))
  }

  public showMessageCurrentLesson(chatId: ChatId) {
    let returnMessage: string
    const currentLesson = this.currentLesson

    const startedAtInMinutes = this.toFixed(
      (currentLesson.endAtInSeconds * -1) / 60
    )
    const endAtInMinutes = this.toFixed(45 - startedAtInMinutes)

    if (startedAtInMinutes >= 45) {
      returnMessage = 'Nesse momento não há nenhuma aula sendo lecionada.'
    } else {
      returnMessage = `Aula atual é a *${currentLesson.position}°* de *${currentLesson.subject}* com *${currentLesson.teacher}* que iniciou *${currentLesson.time}* há *${startedAtInMinutes}* minutos atrás e termina em *${endAtInMinutes}* minutos.`
    }

    this.client
      .sendText(chatId, returnMessage)
      .catch(() => console.log('Algo de errado aconteceu com', chatId))
  }

  private lessonStartAndEnd(time: string) {
    let startAtInSeconds: number
    let endAtInSeconds: number
    const fortyFiveMinutesInSeconds = 2700

    const currentDate = new Date()
    const currentTimeInSeconds =
      currentDate.getHours() * 3600 +
      currentDate.getMinutes() * 60 +
      currentDate.getSeconds()

    const [lessonHours, lessonMinutes] = time.split(':')
    const lessonTimeInSeconds =
      Number(lessonHours) * 3600 + Number(lessonMinutes) * 60

    const secondsToStart = lessonTimeInSeconds - (currentTimeInSeconds - 15)

    if (secondsToStart < 0) {
      startAtInSeconds = lessonTimeInSeconds - secondsToStart * -1
      endAtInSeconds = secondsToStart
    } else {
      startAtInSeconds = secondsToStart
      endAtInSeconds = secondsToStart - fortyFiveMinutesInSeconds
    }

    return { startAtInSeconds, endAtInSeconds }
  }

  private currentWeekDay(additionalDays: number = 0) {
    let currentWeekDay = new Date().getDay()

    while (additionalDays > 0) {
      currentWeekDay += 1
      additionalDays -= 1
      if (currentWeekDay === 7) currentWeekDay = 0
    }

    return currentWeekDay
  }

  public addChatToAlert(chatId: ChatId) {
    let returnMessage: string

    if (!this.chatIsIncluded(chatId)) {
      this.chatsToAlert.push(chatId)

      returnMessage = '🟢 Notificações ativadas'
    } else {
      returnMessage = '🟡 Notificações já estão ativadas'
    }

    this.client
      .sendText(chatId, returnMessage)
      .catch(() => console.log('Algo de errado aconteceu com', chatId))
  }

  public removeChatToAlert(chatId: ChatId) {
    let returnMessage: string

    if (this.chatIsIncluded(chatId)) {
      this.chatsToAlert.splice(this.chatsToAlert.indexOf(chatId), 1)

      returnMessage = '🔴 Notificações desativadas'
    } else {
      returnMessage = '🟡 Notificações não estão ativas'
    }

    this.client
      .sendText(chatId, returnMessage)
      .catch(() => console.log('Algo de errado aconteceu com', chatId))
  }

  private get nextLesson() {
    let nextLesson: Lesson

    let lessons = week[this.currentWeekDay()]
    let additionalDays = 0

    while (!lessons.length) {
      lessons = week[this.currentWeekDay(additionalDays)]
      additionalDays += 1
    }

    lessons.forEach(lesson => {
      const { startAtInSeconds, endAtInSeconds } = this.lessonStartAndEnd(
        lesson.time
      )

      if (!nextLesson || startAtInSeconds < nextLesson.startAtInSeconds) {
        nextLesson = { ...lesson, startAtInSeconds, endAtInSeconds }
      }
    })

    console.log('next lesson', nextLesson)

    return nextLesson
  }

  private get currentLesson() {
    let currentLesson: Lesson

    let lessons = week[this.currentWeekDay()]
    let additionalDays = 0

    while (!lessons?.length) {
      lessons = week[this.currentWeekDay(additionalDays)]
      additionalDays += 1
    }

    lessons.forEach(lesson => {
      const { startAtInSeconds, endAtInSeconds } = this.lessonStartAndEnd(
        lesson.time
      )

      if (!currentLesson || startAtInSeconds > currentLesson.startAtInSeconds) {
        currentLesson = { ...lesson, startAtInSeconds, endAtInSeconds }
      }
    })

    console.log('current lesson', currentLesson)

    return currentLesson
  }

  public start() {
    const threeMinutesInSeconds = 180
    const nextLesson = this.nextLesson

    const threeMinutesBeforeStartLessonInSeconds =
      nextLesson.startAtInSeconds - threeMinutesInSeconds

    if (threeMinutesBeforeStartLessonInSeconds > 30)
      setTimeout(
        this.showMessagePrepareToStartLesson,
        threeMinutesBeforeStartLessonInSeconds * 1000,
        nextLesson
      )

    setTimeout(
      this.showMessageLessonStart,
      nextLesson.startAtInSeconds * 1000,
      nextLesson
    )

    setTimeout(
      this.start,
      (nextLesson.startAtInSeconds - threeMinutesInSeconds * 2) * 1000
    )
  }
}
