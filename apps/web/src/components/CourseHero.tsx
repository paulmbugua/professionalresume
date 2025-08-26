import React from 'react'
import type { Course } from '@mytutorapp/shared/types'
import { pickImageForCourse } from '../utils/subjectImages'

type Props = {
  course: Course
  backendUrl?: string
  className?: string
  alt?: string
}

const CourseHero: React.FC<Props> = ({ course, backendUrl, className, alt }) => {
  const url = pickImageForCourse(course, backendUrl)
  return (
    <div
      className={['aspect-video bg-center bg-cover', className].filter(Boolean).join(' ')}
      style={{ backgroundImage: `url("${url}")` }}
      role="img"
      aria-label={alt || (course.title || 'Course image')}
    />
  )
}

export default CourseHero
