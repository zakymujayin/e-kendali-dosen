const DAY_MAP: Record<string, number> = {
  Senin: 1, Selasa: 2, Rabu: 3, Kamis: 4, Jumat: 5, Sabtu: 6, Minggu: 0,
}

function nextDayOfWeek(from: Date, targetDay: number): Date {
  const d = new Date(from)
  d.setDate(d.getDate() + 1)
  while (d.getDay() !== targetDay) {
    d.setDate(d.getDate() + 1)
  }
  return d
}

export interface SlotInfo {
  day: string
  startTime: string
  endTime: string
  roomName: string
  className: string
}

export interface JadwalEntry {
  tanggal: string
  hari: string
  jam: string
  ruang: string
}

export function generateJadwal(slots: SlotInfo[], startDate: Date, total: number): JadwalEntry[] {
  if (slots.length === 0) return []
  const sorted = [...slots].sort((a, b) => (DAY_MAP[a.day] ?? 7) - (DAY_MAP[b.day] ?? 7))
  const dates: JadwalEntry[] = []
  let cursor = new Date(startDate)
  for (let i = 0; i < total; i++) {
    const slot = sorted[i % sorted.length]
    const dayNum = DAY_MAP[slot.day] ?? 1
    cursor = nextDayOfWeek(cursor, dayNum)
    dates.push({
      tanggal: cursor.toISOString().split("T")[0],
      hari: slot.day.substring(0, 3),
      jam: `${slot.startTime}-${slot.endTime}`,
      ruang: slot.roomName,
    })
  }
  return dates
}

// Mengembalikan nomor pertemuan yang tanggal perkiraannya sudah lewat (< hari ini) tapi belum ada sesi.
export function getOverdueMeetings(
  slots: SlotInfo[],
  startDate: Date,
  total: number,
  filledMeetingNumbers: Set<number>,
  today: Date = new Date(),
): number[] {
  const jadwal = generateJadwal(slots, startDate, total)
  const todayStr = today.toISOString().split("T")[0]
  const overdue: number[] = []
  jadwal.forEach((entry, i) => {
    const meetingNo = i + 1
    if (entry.tanggal < todayStr && !filledMeetingNumbers.has(meetingNo)) {
      overdue.push(meetingNo)
    }
  })
  return overdue
}
