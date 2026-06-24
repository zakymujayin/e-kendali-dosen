"use client"

import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
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
  id: _id,
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
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <CardTitle className="text-base leading-snug truncate">{course.name}</CardTitle>
              <CardDescription className="mt-0.5 text-xs">
                {course.code} · {course.sks} SKS
                {semester && <> · {semester.name} {semester.year}</>}
              </CardDescription>
            </div>
            <Badge variant={progress >= 100 ? "default" : "secondary"} className="shrink-0 text-xs">
              {publishedSessions}/{course.totalMeeting}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Progress value={Math.min(progress, 100)} className="h-2" />

            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3 shrink-0" aria-hidden="true" />
              <span>{publishedSessions} published{draftSessions > 0 && ` · ${draftSessions} draft`}</span>
            </div>

            {daringQuota && (
              <div className="flex items-center gap-1.5 text-sm">
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
