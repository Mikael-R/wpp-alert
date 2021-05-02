const { week, lessonsPosition } = require('./week.json')

// const weekDayName = {
//   0: 'domingo',
//   1: 'segunda-feira',
//   2: 'terça-feira',
//   3: 'quarta-feira',
//   4: 'quinta-feira',
//   5: 'sexta-feira',
//   6: 'sábado'
// }

const showMessagePrepareToStartLesson = lesson => {
  console.log('a aula vai começar em 3 minutos', lesson)
}

const showMessageLessonStart = lesson => {
  console.log('a aula começou', lesson)
}

const showMessageNotHaveLesson = () => {
  console.log('hoje não tem aula')
}

const getMiliSecondsToStartLesson = time => {
  const currentDate = new Date()
  const [hours, minutes] = time.split(':')

  const miliSecondsToStart =
    (currentDate.getHours() * 3600 +
      currentDate.getMinutes() * 60 -
      (hours * 3600 + minutes * 60)) *
    1000

  return miliSecondsToStart
}

const getTomorrowWeekDay = () => {
  const currentWeekDay = getCurrentWeekDay()
  return currentWeekDay === 6 ? 0 : currentWeekDay + 1
}

const getCurrentWeekDay = () => new Date().getDay()

const getFirstLessonTomorrow = () => {
  const tomorrowWeekDay = getTomorrowWeekDay()
  return week[tomorrowWeekDay].find(({ time }) => lessonsPosition[time] === 1)
}

function main() {
  const currentWeekDay = getCurrentWeekDay()
  const firstLessonTomorrow = getFirstLessonTomorrow()
  const miliSecondsToStartFirstLessonTomorrow = getMiliSecondsToStartLesson(
    firstLessonTomorrow.time
  )
  const lessons = week[currentWeekDay]

  if (lessons.length) {
    const threeMinutesInMiliSeconds = 180000

    for (const lesson of lessons) {
      const miliSecondsToStartLesson = getMiliSecondsToStartLesson(lesson.time)

      const threeMinutesBeforeStartLessonInMiliSeconds =
        miliSecondsToStartLesson - threeMinutesInMiliSeconds

      if (
        threeMinutesBeforeStartLessonInMiliSeconds >= threeMinutesInMiliSeconds
      )
        setTimeout(
          showMessagePrepareToStartLesson,
          threeMinutesBeforeStartLessonInMiliSeconds,
          lesson
        )

      setTimeout(showMessageLessonStart, miliSecondsToStartLesson, lesson)
    }
  } else {
    showMessageNotHaveLesson()
  }

  setTimeout(main, miliSecondsToStartFirstLessonTomorrow)
}

main()
