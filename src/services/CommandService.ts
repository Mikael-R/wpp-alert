import { ChatId, Client } from '@open-wa/wa-automate'

import { week } from '../week.json'

import type { Lesson } from '../types/index'

class CommandService {
  private fortyFiveMinutesInSeconds: number
  private twentyFourHoursInSeconds: number

  constructor(private client: Client, private chatsToAlert: ChatId[]) {
    this.client = client
    this.chatsToAlert = chatsToAlert
    this.fortyFiveMinutesInSeconds = 2700
    this.twentyFourHoursInSeconds = 86400
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
    const startInHours = this.toFixed(startInMinutes / 60)

    returnMessage = `Próxima aula é a *${nextLesson.position}°* e será de *${nextLesson.subject}* com *${nextLesson.teacher}* às *${nextLesson.time}* daqui `

    if (startInMinutes > 60) {
      returnMessage += `*${startInHours}* horas.`
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

    if (!currentLesson) {
      returnMessage = 'Nesse momento não há nenhuma aula sendo lecionada.'
    } else {
      const startedAtInMinutes = this.toFixed(
        (this.currentTimeInSeconds -
          this.lessonTimeInSeconds(currentLesson.time)) /
          60
      )
      const endAtInMinutes = this.toFixed(45 - startedAtInMinutes)

      returnMessage = `Aula atual é a *${currentLesson.position}°* de *${currentLesson.subject}* com *${currentLesson.teacher}* que iniciou *${currentLesson.time}* há *${startedAtInMinutes}* minutos atrás e termina em *${endAtInMinutes}* minutos.`
    }

    try {
      await this.client.sendText(chatId, returnMessage)
    } catch (error) {
      console.error(chatId, error)
    }
  }

  private lessonTimeInSeconds(time: string) {
    const [lessonHours, lessonMinutes] = time.split(':')
    const lessonTimeInSeconds =
      Number(lessonHours) * 3600 + Number(lessonMinutes) * 60

    return lessonTimeInSeconds
  }

  private get currentTimeInSeconds() {
    const currentDate = new Date()
    const currentTimeInSeconds =
      currentDate.getHours() * 3600 +
      currentDate.getMinutes() * 60 +
      currentDate.getSeconds()

    return currentTimeInSeconds
  }

  private lessonStartAndEnd(time: string) {
    const startAndEnd = {
      startAtInSeconds: 0,
      endAtInSeconds: 0
    }

    const currentWeekDay = this.currentWeekDay
    const currentTimeInSeconds = this.currentTimeInSeconds
    const lessonTimeInSeconds = this.lessonTimeInSeconds(time)

    const timeDiference = lessonTimeInSeconds - (currentTimeInSeconds - 10)

    if (timeDiference < 0) {
      startAndEnd.startAtInSeconds =
        this.twentyFourHoursInSeconds + timeDiference
      startAndEnd.endAtInSeconds =
        startAndEnd.startAtInSeconds + this.fortyFiveMinutesInSeconds
    } else {
      startAndEnd.startAtInSeconds = timeDiference
      startAndEnd.endAtInSeconds =
        timeDiference + this.fortyFiveMinutesInSeconds
    }

    if (currentWeekDay === 5) {
      startAndEnd.startAtInSeconds += this.twentyFourHoursInSeconds * 2
      startAndEnd.endAtInSeconds += this.twentyFourHoursInSeconds * 2
    }
    if (currentWeekDay === 6) {
      startAndEnd.startAtInSeconds += this.twentyFourHoursInSeconds
      startAndEnd.endAtInSeconds += this.twentyFourHoursInSeconds
    }

    return startAndEnd
  }

  private get currentWeekDay() {
    return new Date().getDay()
  }

  public async addChatToAlert(chatId: ChatId) {
    let returnMessage: string

    if (!this.chatIsIncluded(chatId)) {
      this.chatsToAlert.push(chatId)

      returnMessage = '🟢 Notificações ativadas.'
    } else {
      returnMessage = '🟡 Notificações já estão ativadas.'
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

      returnMessage = '🔴 Notificações desativadas.'
    } else {
      returnMessage = '🟡 Notificações não estão ativas.'
    }

    try {
      await this.client.sendText(chatId, returnMessage)
    } catch (error) {
      console.error(chatId, error)
    }
  }

  private get nextLesson() {
    let nextLesson: Lesson
    let lessons: typeof week[1]

    const currentWeekDay = this.currentWeekDay
    if (currentWeekDay === 5 || currentWeekDay === 6) lessons = week[1]
    else lessons = week[currentWeekDay]

    for (const lesson of lessons) {
      const startAndEnd = this.lessonStartAndEnd(lesson.time)

      if (
        !nextLesson ||
        startAndEnd.startAtInSeconds < nextLesson.startAtInSeconds
      ) {
        nextLesson = { ...lesson, ...startAndEnd }
      }
    }

    return nextLesson
  }

  private get currentLesson() {
    let currentLesson: Lesson
    let lessons: typeof week[1]

    const currentWeekDay = this.currentWeekDay
    if (currentWeekDay === 5 || currentWeekDay === 6) lessons = week[1]
    else lessons = week[currentWeekDay]

    for (const lesson of lessons) {
      const startAndEnd = this.lessonStartAndEnd(lesson.time)

      if (
        !currentLesson ||
        startAndEnd.startAtInSeconds > currentLesson.startAtInSeconds
      ) {
        currentLesson = { ...lesson, ...startAndEnd }
      }
    }

    const startedAtInSeconds =
      this.currentTimeInSeconds - this.lessonTimeInSeconds(currentLesson.time)

    if (startedAtInSeconds > this.fortyFiveMinutesInSeconds) return null
    else return currentLesson
  }

  public start() {
    const threeMinutesInSeconds = 180
    const nextLesson = this.nextLesson

    const threeMinutesBeforeStartLessonInSeconds =
      nextLesson.startAtInSeconds - threeMinutesInSeconds

    if (threeMinutesBeforeStartLessonInSeconds >= threeMinutesInSeconds)
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

export default CommandService
