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

  private async showMessagePrepareToStartLesson(lesson: Lesson) {
    this.chatsToAlert?.forEach(chatId => {
      this.client
        .sendText(
          chatId,
          `A *${lesson.position}°* aula de *${lesson.subject}* com *${lesson.teacher}* começa em 3 minutos.`
        )
        .catch(() => console.log('Não consegui alertar o chat', chatId))
    })
  }

  private async showMessageLessonStart(lesson: Lesson) {
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

    const startInMinutes = this.toFixed(nextLesson.secondsToStart / 60)

    returnMessage = `Próxima aula é a *${nextLesson.position}°* e será de *${nextLesson.subject}* com *${nextLesson.teacher}* as *${nextLesson.time}* daqui `

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
      (currentLesson.secondsToStart * -1) / 60
    )
    const endAtInMinutes = this.toFixed(45 - startedAtInMinutes)

    if (endAtInMinutes > 1) {
      returnMessage = `Aula atual é a *${currentLesson.position}°* de *${currentLesson.subject}* com *${currentLesson.teacher}* que iniciou *${currentLesson.time}* há *${startedAtInMinutes}* minutos atrás e termina em *${endAtInMinutes}* minutos.`
    } else {
      returnMessage = 'Nesse momento não há nenhuma aula sendo lecionada.'
    }

    this.client
      .sendText(chatId, returnMessage)
      .catch(() => console.log('Algo de errado aconteceu com', chatId))
  }

  private secondsToStartLesson(time: string) {
    const twentyFourHoursInSeconds = 86400

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
      ? secondsToStart + twentyFourHoursInSeconds
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

  private get nextLesson() {
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

  private get currentLesson() {
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

    if (threeMinutesBeforeStartLessonInSeconds > 30)
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
