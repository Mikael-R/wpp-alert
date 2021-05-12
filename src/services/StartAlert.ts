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
    const chatsToAlert = this.chatsToAlert
    const promises = []

    for (const chatId of chatsToAlert) {
      const sendMessage = this.client.sendText(
        chatId,
        `A *${lesson.position}°* aula de *${lesson.subject}* com *${lesson.teacher}* começa em 3 minutos.`
      )
      promises.push(sendMessage)
    }

    try {
      await Promise.all(promises)
    } catch (error) {
      console.error(error)
    }
  }

  private async showMessageLessonStart(lesson: Lesson) {
    const chatsToAlert = this.chatsToAlert
    const promises = []

    for (const chatId of chatsToAlert) {
      const sendMessage = this.client.sendText(
        chatId,
        `A *${lesson.position}°* aula de *${lesson.subject}* com *${lesson.teacher}* começou.`
      )
      promises.push(sendMessage)
    }

    try {
      await Promise.all(promises)
    } catch (error) {
      console.error(error)
    }
  }

  public async showMessageNextLesson(chatId: ChatId) {
    let returnMessage: string
    const nextLesson = this.nextLesson

    const startInMinutes = this.toFixed(nextLesson.startAtInSeconds / 60)

    returnMessage = `Próxima aula é a *${nextLesson.position}°* e será de *${nextLesson.subject}* com *${nextLesson.teacher}* às *${nextLesson.time}* daqui `

    if (startInMinutes > 60) {
      returnMessage += `*${this.toFixed(startInMinutes / 60)}* horas.`
    } else {
      returnMessage += `*${startInMinutes}* minutos.`
    }

    try {
      await this.client.sendText(chatId, returnMessage)
    } catch (error) {
      console.error(chatId, error)
    }
  }

  public async showMessageCurrentLesson(chatId: ChatId) {
    let returnMessage: string
    const currentLesson = this.currentLesson
    const lessonDurationInMinutes = 45

    const startedAtInMinutes = this.toFixed(currentLesson.endAtInSeconds / 60)
    const endAtInMinutes = this.toFixed(45 - startedAtInMinutes)

    if (currentLesson.startAtInSeconds / 60 >= lessonDurationInMinutes) {
      returnMessage = 'Nesse momento não há nenhuma aula sendo lecionada.'
    } else {
      returnMessage = `Aula atual é a *${currentLesson.position}°* de *${currentLesson.subject}* com *${currentLesson.teacher}* que iniciou *${currentLesson.time}* há *${startedAtInMinutes}* minutos atrás e termina em *${endAtInMinutes}* minutos.`
    }

    try {
      await this.client.sendText(chatId, returnMessage)
    } catch (error) {
      console.error(chatId, error)
    }
  }

  private lessonStartAndEnd(time: string) {
    let startAndEnd
    const fortyFiveMinutesInSeconds = 2700
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

    if (secondsToStart < 0) {
      startAndEnd = {
        startAtInSeconds: lessonTimeInSeconds - secondsToStart,
        endAtInSeconds: secondsToStart * -1
      }
    } else {
      startAndEnd = {
        startAtInSeconds: secondsToStart,
        endAtInSeconds: secondsToStart - fortyFiveMinutesInSeconds
      }
    }

    const currentWeekDay = this.currentWeekDay()

    if (currentWeekDay === 4) {
      startAndEnd.startAtInSeconds += twentyFourHoursInSeconds
    }
    if (currentWeekDay === 5) {
      startAndEnd.startAtInSeconds += twentyFourHoursInSeconds * 2
    }

    return startAndEnd
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

  public async addChatToAlert(chatId: ChatId) {
    let returnMessage: string

    if (!this.chatIsIncluded(chatId)) {
      this.chatsToAlert.push(chatId)

      returnMessage = '🟢 Notificações ativadas'
    } else {
      returnMessage = '🟡 Notificações já estão ativadas'
    }

    try {
      await this.client.sendText(chatId, returnMessage)
    } catch (error) {
      console.error(chatId, error)
    }
  }

  public async removeChatToAlert(chatId: ChatId) {
    let returnMessage: string

    if (this.chatIsIncluded(chatId)) {
      this.chatsToAlert.splice(this.chatsToAlert.indexOf(chatId), 1)

      returnMessage = '🔴 Notificações desativadas'
    } else {
      returnMessage = '🟡 Notificações não estão ativas'
    }

    try {
      await this.client.sendText(chatId, returnMessage)
    } catch (error) {
      console.error(chatId, error)
    }
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
