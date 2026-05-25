"use client"

import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Clock, Wifi } from "lucide-react"

interface CourseCardProps {
  id: string
  course: {
    id: string
    name: string
    code: string
    sks: number
    totalMeeting: number
  }
  semester?: {
    name: string
    year: string
    term: string
  }
  publishedSessions: number
  draftSessions: number
  progress: number
  daringQuota?: {
    used: number
    remaining: number
    isAvailable: boolean
  } | null
}

export function CourseCard({
  id,
  course,
  semester,
  publishedSessions,
  draftSessions,
  progress,
  daringQuota,
}: CourseCardProps) {
  return (
    <Link href={`/dashboard/dosen/courses/${course.id}`} tabIndex={0}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer focus-visible:ring-2 focus-visible:ring-ring">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-base">{course.name}</CardTitle>
              <p className="text-sm text-muted-foreground mt-0.5">
                {course.code} · {course.sks} SKS
              </p>
            </div>
            <Badge variant={progress >= 100 ? "default" : "secondary"}>
              {publishedSessions}/{course.totalMeeting}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="w-full bg-secondary rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full transition-all"
                style={{ width: `${Math.min(progress, 100)}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" aria-hidden="true" />
                {publishedSessions} published · {draftSessions} draft
              </span>
              {semester && (
                <span className="flex items-center gap-1">
                  {semester.name} {semester.year}
                </span>
              )}
            </div>

            {daringQuota && (
              <div className="flex items-center gap-1.5 text-xs">
                <Wifi className={`h-3 w-3 ${daringQuota.remaining === 0 ? "text-destructive" : daringQuota.remaining <= 1 ? "text-yellow-500" : "text-green-500"}`} aria-hidden="true" />
                <span className={
                  daringQuota.remaining === 0 ? "text-destructive" :
                  daringQuota.remaining <= 1 ? "text-yellow-500" :
                  "text-muted-foreground"
                }>
                  Daring: {daringQuota.used}/{daringQuota.used + daringQuota.remaining}
                  {daringQuota.remaining === 0 && " (habis)"}
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
